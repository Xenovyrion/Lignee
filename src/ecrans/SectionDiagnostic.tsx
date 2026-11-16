import { useEffect, useState } from "react";
import { abonnerJournal, exporterDiagnostic, lireJournal, viderJournal, type Niveau } from "../diagnostic";
import { versionActuelle } from "../miseAJour";
import type { Sauvegarde } from "../moteur/types";
import { useNotifier } from "../notifications";
import { Bouton, Carte } from "../ui";

const TEINTE: Record<Niveau, string> = { info: "text-sky-400", action: "text-status-ok", etat: "text-text-muted", erreur: "text-status-err" };
const LIBELLE: Record<Niveau, string> = { info: "info", action: "action", etat: "étable", erreur: "erreur" };

/** Journal de diagnostic : dernières entrées, export du fichier à transmettre en cas de problème. */
export function SectionDiagnostic({ s }: { s: Sauvegarde }) {
  const [journal, setJournal] = useState(lireJournal);
  const notifier = useNotifier();
  useEffect(() => abonnerJournal(() => setJournal(lireJournal())), []);
  const erreurs = journal.filter((e) => e.n === "erreur").length;
  const affichees = journal.slice(-300).reverse();

  const exporter = async () => {
    try {
      const chemin = await exporterDiagnostic(s, await versionActuelle());
      if (chemin) notifier(`Diagnostic exporté : ${chemin}`, { ton: "info" });
    } catch (e) {
      notifier(`Export impossible : ${e instanceof Error ? e.message : String(e)}`, { ton: "erreur" });
    }
  };

  return (
    <Carte titre="Journal de diagnostic">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl text-xs text-text-muted">
            Lignée note ce qui est fait (accouplements, captures, changements de l'étable, réglages) et les erreurs éventuelles. En cas de problème, exporte le
            diagnostic et transmets le fichier : il contient ce journal, ta sauvegarde et le résumé du plan, de quoi reproduire exactement ce que tu vois.
            <span className="mt-1 block">
              {journal.length} entrée{journal.length > 1 ? "s" : ""}
              {erreurs > 0 && <span className="text-status-err"> · {erreurs} erreur{erreurs > 1 ? "s" : ""}</span>}
            </span>
          </div>
          <div className="flex gap-2">
            <Bouton onClick={exporter}>Exporter le diagnostic</Bouton>
            <Bouton
              discret
              onClick={() => {
                if (confirm("Vider le journal de diagnostic ?")) viderJournal();
              }}
              disabled={!journal.length}
            >
              Vider
            </Bouton>
          </div>
        </div>
        {/* Hauteur fixe : le journal défile sans changer la taille de la page. */}
        <div className="flex h-48 flex-col gap-0.5 overflow-y-auto rounded-lg border border-border bg-bg-secondary p-2 font-mono text-[11px]">
          {affichees.length === 0 && <div className="m-auto text-text-muted">Journal vide</div>}
          {affichees.map((e, i) => (
            <div key={`${e.t}-${i}`} className="flex gap-2">
              <span className="shrink-0 text-text-muted">{new Date(e.t).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <span className={`w-12 shrink-0 ${TEINTE[e.n]}`}>{LIBELLE[e.n]}</span>
              <span className="min-w-0 whitespace-pre-wrap break-words text-text-secondary">{e.m}</span>
            </div>
          ))}
        </div>
      </div>
    </Carte>
  );
}
