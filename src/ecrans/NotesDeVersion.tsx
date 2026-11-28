// Fenêtre « Nouveautés » : notes de version publiées sur GitHub, affichées dans l'application.
import { createPortal } from "react-dom";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { notesDesVersions, versionActuelle, type NoteVersion } from "../miseAJour";
import { BarreChargement, Bouton } from "../ui";

/** Gras, italique, code et liens d'une ligne de Markdown (le gras et l'italique peuvent contenir du code ou un lien). */
function enLigne(texte: string): ReactNode[] {
  const morceaux = texte.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return morceaux.map((m, i) => {
    if (m.startsWith("**") && m.length > 4) return <b key={i}>{enLigne(m.slice(2, -2))}</b>;
    if (m.startsWith("*") && m.length > 2) return <i key={i}>{enLigne(m.slice(1, -1))}</i>;
    if (m.startsWith("`")) return <code key={i} className="rounded bg-white/10 px-1 text-[0.9em]">{m.slice(1, -1)}</code>;
    const lien = m.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (lien) return <a key={i} href={lien[2]} target="_blank" rel="noreferrer" className="text-accent hover:underline">{lien[1]}</a>;
    return <Fragment key={i}>{m}</Fragment>;
  });
}

/** Style d'une section selon son titre (Nouveautés, Améliorations, Corrections…). */
function styleSection(titre: string): { icone: string; couleur: string } {
  const t = titre.toLowerCase();
  if (t.startsWith("nouveaut")) return { icone: "✨", couleur: "text-status-ok border-status-ok/40 bg-status-ok/10" };
  if (t.startsWith("am")) return { icone: "⚡", couleur: "text-accent border-accent/40 bg-accent/10" };
  if (t.startsWith("correc")) return { icone: "🔧", couleur: "text-status-warn border-status-warn/40 bg-status-warn/10" };
  return { icone: "•", couleur: "text-text-secondary border-border-light bg-white/5" };
}

/** Élément de liste « **Titre** : description » affiché en petite carte ; sinon simple puce. */
function Element({ texte }: { texte: string }) {
  const m = texte.match(/^\*\*([^*]+)\*\*\s*(\([^)]*\))?\s*:\s*(.*)$/);
  if (!m) return <li className="ml-4 list-disc">{enLigne(texte)}</li>;
  return (
    <li className="rounded-lg border border-border bg-black/15 px-3 py-2">
      <div className="font-semibold text-text-primary">
        {m[1]}
        {m[2] && <span className="ml-1.5 text-xs font-normal text-text-muted">{m[2].slice(1, -1)}</span>}
      </div>
      <div className="mt-0.5">{enLigne(m[3].charAt(0).toUpperCase() + m[3].slice(1))}</div>
    </li>
  );
}

/** Lignes ajoutées automatiquement à chaque publication (téléchargement, compilation, VirusTotal). */
const LIGNE_TECHNIQUE = /^(⬇|🔒|🛡)/u;

/**
 * Notes de version : sections en pastilles colorées, éléments en cartes. La section « Télécharger » et
 * les lignes techniques (installation, compilation, VirusTotal) sont regroupées dans un dépliant discret :
 * elles servent à qui télécharge sur GitHub, pas dans l'application.
 */
function Markdown({ texte }: { texte: string }) {
  const blocs: ReactNode[] = [];
  const technique: ReactNode[] = [];
  let liste: string[] = [];
  let dansTechnique = false;
  const cible = () => (dansTechnique ? technique : blocs);
  const viderListe = () => {
    if (liste.length)
      cible().push(
        dansTechnique ? (
          <ul key={cible().length} className="ml-4 list-disc space-y-0.5">{liste.map((l, i) => <li key={i}>{enLigne(l)}</li>)}</ul>
        ) : (
          <ul key={cible().length} className="flex flex-col gap-1.5">{liste.map((l, i) => <Element key={i} texte={l} />)}</ul>
        ),
      );
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
    if (l.startsWith("#")) {
      const titre = l.replace(/^#+\s*/, "");
      dansTechnique = /^t[ée]l[ée]charger/i.test(titre);
      if (dansTechnique) continue;
      const { icone, couleur } = styleSection(titre);
      blocs.push(
        <h4 key={blocs.length} className={`mt-2 self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${couleur}`}>
          {icone} {titre}
        </h4>,
      );
    } else if (LIGNE_TECHNIQUE.test(l)) {
      dansTechnique = true;
      technique.push(<p key={technique.length}>{enLigne(l)}</p>);
    } else if (l.startsWith(">")) cible().push(<p key={cible().length} className="border-l-2 border-border-light pl-2 text-xs text-text-muted">{enLigne(l.replace(/^>\s*/, ""))}</p>);
    else cible().push(<p key={cible().length}>{enLigne(l)}</p>);
  }
  viderListe();
  return (
    <div className="flex flex-col gap-1.5 text-sm text-text-secondary">
      {blocs.length ? blocs : <p className="text-text-muted">Pas de détail pour cette version.</p>}
      {technique.length > 0 && (
        <details className="mt-1 text-xs text-text-muted">
          <summary className="cursor-pointer select-none hover:text-text-secondary">Téléchargement, compilation et analyse antivirus</summary>
          <div className="mt-1.5 flex flex-col gap-1 border-l-2 border-border pl-3">{technique}</div>
        </details>
      )}
    </div>
  );
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
      <div className="apparition flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border-light bg-bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
            notes.map((n, i) => {
              const courante = n.version === (miseEnAvant ?? installee);
              // Les 3 dernières versions (et celle installée) sont dépliées, les plus anciennes repliées.
              return (
                <details key={n.version} open={i < 3 || courante} className={`group rounded-xl border p-4 ${courante ? "border-accent/60 bg-accent-dim" : "border-border bg-bg-secondary"}`}>
                  <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-2 group-open:mb-2 [&::-webkit-details-marker]:hidden">
                    <span className="text-xs text-text-muted transition-transform group-open:rotate-90">▶</span>
                    <span className="text-base font-bold">v{n.version}</span>
                    {n.version === installee && <span className="rounded-full bg-status-ok/15 px-2 text-xs text-status-ok">installée</span>}
                    <span className="text-xs text-text-muted">{new Date(n.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span>
                    <span className="flex-1" />
                    <a href={n.url} target="_blank" rel="noreferrer" className="text-xs text-accent hover:underline">
                      Voir sur GitHub
                    </a>
                  </summary>
                  <Markdown texte={n.notes} />
                </details>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
