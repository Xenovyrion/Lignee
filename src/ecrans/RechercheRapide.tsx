// Recherche rapide (Ctrl+K) : couleurs des trois familles, onglets, réglages et quelques commandes.
// On tape quelques lettres (accents et majuscules ignorés), flèches pour choisir, Entrée pour y aller.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { couleurs, FAMILLES, NOMS_FAMILLE } from "../moteur/donnees";
import type { Famille, Sauvegarde } from "../moteur/types";
import { ImageMonture } from "./arbre/commun";

export interface Resultat {
  cle: string;
  titre: string;
  detail: string;
  groupe: "Montures" | "Onglets" | "Réglages" | "Commandes";
  icone?: ReactNode;
  /** Texte de recherche supplémentaire (mots-clés). */
  mots?: string;
  aller: () => void;
}

const normaliser = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Score de correspondance : début de mot > contenu > lettres dans l'ordre ; -1 si absent. */
export function score(texte: string, requete: string) {
  const t = normaliser(texte);
  const q = normaliser(requete.trim());
  if (!q) return 0;
  const mots = q.split(/\s+/);
  let total = 0;
  for (const m of mots) {
    const i = t.indexOf(m);
    if (i === 0) total += 3;
    else if (i > 0 && /[\s'(-]/.test(t[i - 1])) total += 2;
    else if (i > 0) total += 1;
    else return -1;
  }
  return total;
}

/** Couleurs des trois familles, avec leur état dans l'élevage. */
export function resultatsMontures(
  s: Sauvegarde,
  ouvrir: (f: Famille, id: string) => void,
): Resultat[] {
  return FAMILLES.flatMap((f) =>
    couleurs(f).map((c) => {
      const n = s.montures.filter(
        (m) => m.famille === f && m.couleur === c.id && m.etat !== "sterile",
      ).length;
      const obtenue = s.obtenues[f].includes(c.id);
      return {
        cle: `${f}-${c.id}`,
        titre: c.nom,
        detail: `${NOMS_FAMILLE[f]} · gén. ${c.generation} · ${obtenue ? "✓ obtenue" : "à obtenir"}${n ? ` · ${n} en étable` : ""}`,
        groupe: "Montures" as const,
        icone: <ImageMonture famille={f} id={c.id} taille={28} />,
        mots: NOMS_FAMILLE[f],
        aller: () => ouvrir(f, c.id),
      };
    }),
  );
}

export function RechercheRapide({
  resultats,
  fermer,
}: {
  resultats: Resultat[];
  fermer: () => void;
}) {
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const liste = useRef<HTMLDivElement>(null);
  const trouves = useMemo(() => {
    if (!q.trim()) return resultats.filter((r) => r.groupe !== "Montures");
    return resultats
      .map((r) => ({
        r,
        n: Math.max(
          score(r.titre, q) * 2,
          score(`${r.titre} ${r.mots ?? ""} ${r.detail}`, q),
        ),
      }))
      .filter((x) => x.n >= 0)
      .sort((a, b) => b.n - a.n)
      .slice(0, 40)
      .map((x) => x.r);
  }, [q, resultats]);
  useEffect(() => setI(0), [q]);
  useEffect(() => {
    liste.current
      ?.querySelector(`[data-i="${i}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [i]);
  const choisir = (r?: Resultat) => {
    if (!r) return;
    fermer();
    r.aller();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 pt-[12vh]"
      onMouseDown={fermer}
    >
      <div
        className="w-[min(640px,92vw)] overflow-hidden rounded-2xl border border-border-light bg-bg-card shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <span className="text-text-muted">⌕</span>
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown")
                (e.preventDefault(),
                  setI((x) => Math.min(trouves.length - 1, x + 1)));
              else if (e.key === "ArrowUp")
                (e.preventDefault(), setI((x) => Math.max(0, x - 1)));
              else if (e.key === "Enter") choisir(trouves[i]);
              else if (e.key === "Escape") fermer();
            }}
            placeholder="Rechercher une couleur, un onglet, un réglage…"
            className="w-full bg-transparent py-3.5 text-[15px] outline-hidden placeholder:text-text-muted"
          />
          <kbd className="rounded border border-border-light px-1.5 text-[11px] text-text-muted">
            Échap
          </kbd>
        </div>
        <div ref={liste} className="max-h-[55vh] overflow-y-auto p-1.5">
          {!trouves.length && (
            <div className="px-3 py-6 text-center text-sm text-text-muted">
              Rien trouvé pour « {q} ».
            </div>
          )}
          {trouves.map((r, k) => (
            <div key={r.cle}>
              {!q.trim() && (k === 0 || trouves[k - 1].groupe !== r.groupe) && (
                <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {r.groupe}
                </div>
              )}
              <button
                data-i={k}
                onMouseMove={() => setI(k)}
                onClick={() => choisir(r)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${k === i ? "bg-accent-dim" : ""}`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-text-secondary">
                  {r.icone}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-sm ${k === i ? "text-accent" : ""}`}
                  >
                    {r.titre}
                  </span>
                  <span className="block truncate text-xs text-text-muted">
                    {r.detail}
                  </span>
                </span>
                {q.trim() && (
                  <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-text-muted">
                    {r.groupe}
                  </span>
                )}
                {k === i && (
                  <span className="text-xs text-text-muted">Entrée ↵</span>
                )}
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-text-muted">
          ↑ ↓ pour choisir · Entrée pour y aller · Ctrl+K pour ouvrir de
          n'importe où
        </div>
      </div>
    </div>
  );
}
