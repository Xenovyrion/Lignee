// Surveille les minuteurs d'enclos pendant que Lignée est ouverte : notification dans l'appli et dans Windows
// à chaque évènement (enclos prêt, sérénité hors zone, jauge vide). Au lancement, signale aussi ce qui
// s'est terminé pendant que l'appli était fermée. Les messages Discord, eux, partent du relais.
import { useEffect, useRef } from "react";
import { journaliser } from "../diagnostic";
import { simuler, type MinuteurEnclos } from "../moteur/enclos";
import type { Sauvegarde } from "../moteur/types";
import { useNotifier } from "../notifications";
import { lireRelais, synchroniserRelais } from "../relais";

const enTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function notifierWindows(titre: string, texte: string) {
  if (!enTauri) return;
  try {
    const n = await import("@tauri-apps/plugin-notification");
    let ok = await n.isPermissionGranted();
    if (!ok) ok = (await n.requestPermission()) === "granted";
    if (ok) n.sendNotification({ title: titre, body: texte });
  } catch (e) {
    journaliser("erreur", `Notification Windows impossible : ${e}`);
  }
}

/** Évènements arrivés à échéance et pas encore signalés. */
export function aSignaler(m: MinuteurEnclos, maintenant: number) {
  const debut = Date.parse(m.debut);
  return simuler(m).evenements.filter((e) => debut + e.t * 1000 <= maintenant && !m.signales.includes(e.cle));
}

export function SurveillanceMinuteurs({ s, setS }: { s: Sauvegarde; setS: (f: (x: Sauvegarde | null) => Sauvegarde | null) => void }) {
  const notifier = useNotifier();
  const ref = useRef(s);
  ref.current = s;
  // Déjà signalés pendant cette session, avant même que la sauvegarde soit mise à jour (pas de doublon).
  const faits = useRef(new Set<string>());

  useEffect(() => {
    const verifier = () => {
      const maintenant = Date.now();
      const nouveaux = (ref.current.minuteurs ?? [])
        .map((m) => ({ m, evts: aSignaler(m, maintenant).filter((e) => !faits.current.has(`${m.enclos}|${m.debut}|${e.cle}`)) }))
        .filter((x) => x.evts.length);
      for (const { m, evts } of nouveaux) for (const e of evts) faits.current.add(`${m.enclos}|${m.debut}|${e.cle}`);
      if (!nouveaux.length) return;
      for (const { m, evts } of nouveaux)
        for (const e of evts) {
          const texte = `Enclos ${m.enclos} : ${e.texte}`;
          journaliser("etat", texte);
          notifier(texte, { ton: e.type === "fin" ? "succes" : "info" });
          if (ref.current.options.notifWindows !== false) void notifierWindows(`Lignée · Enclos ${m.enclos}`, e.texte);
        }
      // Marque les évènements signalés (hors historique d'annulation : ce n'est pas une saisie).
      setS((x) =>
        x
          ? {
              ...x,
              minuteurs: (x.minuteurs ?? []).map((m) => {
                const n = nouveaux.find((y) => y.m.enclos === m.enclos && y.m.debut === m.debut);
                return n ? { ...m, signales: [...m.signales, ...n.evts.map((e) => e.cle)] } : m;
              }),
            }
          : x,
      );
    };
    verifier();
    const id = setInterval(verifier, 15_000);
    return () => clearInterval(id);
  }, [notifier, setS]);

  // Relais Discord : chaque enclos dont le minuteur change (lancement, arrêt, annulation, import) est
  // reprogrammé. Au démarrage, tous les enclos sont resynchronisés.
  const synchro = useRef<Map<number, string> | null>(null);
  const cles = new Map((s.minuteurs ?? []).map((m) => [m.enclos, `${m.debut}|${JSON.stringify(m.jauges)}|${m.niveauDepart}|${m.niveauCible}`]));
  const signature = [...cles].sort().join(";");
  useEffect(() => {
    if (!lireRelais()) return;
    const avant = synchro.current;
    synchro.current = new Map(cles);
    for (let k = 1; k <= 6; k++) {
      if (avant && avant.get(k) === cles.get(k)) continue;
      void synchroniserRelais(
        k,
        (ref.current.minuteurs ?? []).find((m) => m.enclos === k),
      ).then((r) => r && !r.ok && notifier(`Relais Discord : ${r.erreur}`, { ton: "erreur", cle: "relais" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return null;
}
