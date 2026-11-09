import { useEffect, useState, type ReactNode } from "react";
import type { Sauvegarde } from "../moteur/types";
import { exporter, importer, lireCopie, listerCopies, type CopieAuto } from "../sauvegardes";
import { Bouton, Carte, champ } from "../ui";

interface Props {
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

const resume = (x: Sauvegarde) => {
  const couleurs = Object.values(x.obtenues).reduce((n, l) => n + l.length, 0);
  return `${x.montures.length} montures, ${couleurs} couleurs obtenues, ${x.journal.length} naissances enregistrées`;
};

const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

const Ligne = ({ titre, aide, children }: { titre: string; aide: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-6 border-t border-border py-3 first:border-t-0 first:pt-0">
    <div>
      <div className="text-sm font-medium">{titre}</div>
      <div className="text-xs text-text-muted">{aide}</div>
    </div>
    <div className="flex shrink-0 items-center gap-2">{children}</div>
  </div>
);

/** Export, import et copies automatiques de la sauvegarde. */
export function SectionSauvegardes({ s, setS }: Props) {
  const [copies, setCopies] = useState<CopieAuto[]>([]);
  const [choix, setChoix] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => {
    listerCopies()
      .then((l) => {
        setCopies(l);
        setChoix(l[0]?.nom ?? "");
      })
      .catch(() => setCopies([]));
  }, []);

  const agir = async (f: () => Promise<string | null>) => {
    try {
      const texte = await f();
      if (texte) setMessage({ ok: true, texte });
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : String(e) });
    }
  };

  const remplacer = (x: Sauvegarde, origine: string) => {
    if (!window.confirm(`Remplacer les données actuelles par ${origine} ?\n\n${resume(x)}\n\n(Le bouton « ↶ Annuler » permet de revenir en arrière.)`)) return null;
    setS(() => x);
    return `Données restaurées depuis ${origine} : ${resume(x)}.`;
  };

  const exporterFichier = async () => ((await exporter(s)) ? "Sauvegarde exportée." : null);
  const importerFichier = async () => {
    const x = await importer();
    return x && remplacer(x, "le fichier choisi");
  };
  const restaurer = async () => {
    const c = copies.find((x) => x.nom === choix);
    return c ? remplacer(await lireCopie(c), `la copie du ${dateFr(c.date)}`) : null;
  };

  return (
    <Carte titre="Sauvegardes">
      <Ligne titre="Exporter une sauvegarde" aide={`Crée un fichier .json à garder où tu veux (clé USB, cloud…). Actuellement : ${resume(s)}.`}>
        <Bouton onClick={() => agir(exporterFichier)}>Exporter…</Bouton>
      </Ligne>
      <Ligne titre="Importer une sauvegarde" aide="Remplace les données actuelles par celles d'un fichier exporté.">
        <Bouton discret onClick={() => agir(importerFichier)}>
          Importer…
        </Bouton>
      </Ligne>
      <Ligne titre="Copies automatiques" aide="Une copie par jour, faite au démarrage ; les 15 plus récentes sont gardées.">
        {copies.length ? (
          <>
            <select className={champ} value={choix} onChange={(e) => setChoix(e.target.value)}>
              {copies.map((c) => (
                <option key={c.nom} value={c.nom}>
                  {dateFr(c.date)}
                </option>
              ))}
            </select>
            <Bouton discret onClick={() => agir(restaurer)}>
              Restaurer
            </Bouton>
          </>
        ) : (
          <span className="text-xs text-text-muted">Aucune copie pour l'instant.</span>
        )}
      </Ligne>
      {message && <p className={`mt-2 text-sm ${message.ok ? "text-status-ok" : "text-status-err"}`}>{message.texte}</p>}
    </Carte>
  );
}
