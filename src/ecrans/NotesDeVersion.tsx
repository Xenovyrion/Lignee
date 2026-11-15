// Fenêtre « Nouveautés » : notes de version publiées sur GitHub, affichées dans l'application.
import { createPortal } from "react-dom";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { notesDesVersions, versionActuelle, type NoteVersion } from "../miseAJour";
import { BarreChargement, Bouton } from "../ui";

/** Gras, code et liens d'une ligne de Markdown. */
function enLigne(texte: string): ReactNode[] {
  const morceaux = texte.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return morceaux.map((m, i) => {
    if (m.startsWith("**")) return <b key={i}>{m.slice(2, -2)}</b>;
    if (m.startsWith("`")) return <code key={i} className="rounded bg-white/10 px-1 text-[0.9em]">{m.slice(1, -1)}</code>;
    const lien = m.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (lien) return <a key={i} href={lien[2]} target="_blank" rel="noreferrer" className="text-accent hover:underline">{lien[1]}</a>;
    return <Fragment key={i}>{m}</Fragment>;
  });
}

/** Rendu simple du Markdown des notes de version (titres, listes, citations, paragraphes). */
function Markdown({ texte }: { texte: string }) {
  const blocs: ReactNode[] = [];
  let liste: string[] = [];
  const viderListe = () => {
    if (liste.length) blocs.push(<ul key={blocs.length} className="ml-4 list-disc space-y-1">{liste.map((l, i) => <li key={i}>{enLigne(l)}</li>)}</ul>);
    liste = [];
  };
  for (const brute of texte.split(/\r?\n/)) {
    const l = brute.trim();
    if (/^[-*] /.test(l)) {
      liste.push(l.slice(2));
      continue;
    }
    viderListe();
    if (!l) continue;
    if (l.startsWith("#")) blocs.push(<h4 key={blocs.length} className="mt-2 text-xs font-semibold uppercase tracking-wider text-accent">{l.replace(/^#+\s*/, "")}</h4>);
    else if (l.startsWith(">")) blocs.push(<p key={blocs.length} className="border-l-2 border-border-light pl-2 text-xs text-text-muted">{enLigne(l.replace(/^>\s*/, ""))}</p>);
    else blocs.push(<p key={blocs.length}>{enLigne(l)}</p>);
  }
  viderListe();
  return <div className="flex flex-col gap-1.5 text-sm text-text-secondary">{blocs}</div>;
}

/** Fenêtre des nouveautés ; `miseEnAvant` : version à ouvrir en premier (celle qui vient d'être installée). */
export function NotesDeVersion({ fermer, miseEnAvant }: { fermer: () => void; miseEnAvant?: string }) {
  const [notes, setNotes] = useState<NoteVersion[] | null>(null);
  const [erreur, setErreur] = useState("");
  const [installee, setInstallee] = useState<string | null>(null);
  useEffect(() => {
    notesDesVersions().then(setNotes, (e) => setErreur(e instanceof Error ? e.message : String(e)));
    versionActuelle().then(setInstallee);
    const touche = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [fermer]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm" onClick={fermer}>
      <div className="apparition flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border-light bg-bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-lg font-bold">{miseEnAvant ? `Lignée a été mise à jour en ${miseEnAvant}` : "Nouveautés de Lignée"}</h2>
            <p className="text-xs text-text-muted">Notes de version publiées sur GitHub{installee ? ` · version installée : ${installee}` : ""}</p>
          </div>
          <Bouton discret onClick={fermer}>
            Fermer
          </Bouton>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          {erreur ? (
            <p className="text-sm text-status-err">Impossible de charger les notes de version ({erreur}). Vérifie ta connexion Internet.</p>
          ) : !notes ? (
            <div className="flex flex-col gap-2 py-6 text-center text-sm text-text-muted">
              Chargement des notes de version…
              <BarreChargement className="mx-auto w-48" />
            </div>
          ) : (
            notes.map((n) => {
              const courante = n.version === (miseEnAvant ?? installee);
              return (
                <section key={n.version} className={`rounded-xl border p-4 ${courante ? "border-accent/60 bg-accent-dim" : "border-border bg-bg-secondary"}`}>
                  <div className="mb-2 flex flex-wrap items-baseline gap-2">
                    <span className="text-base font-bold">v{n.version}</span>
                    {n.version === installee && <span className="rounded-full bg-status-ok/15 px-2 text-xs text-status-ok">installée</span>}
                    <span className="text-xs text-text-muted">{new Date(n.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                    <span className="flex-1" />
                    <a href={n.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                      Voir sur GitHub
                    </a>
                  </div>
                  <Markdown texte={n.notes} />
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
