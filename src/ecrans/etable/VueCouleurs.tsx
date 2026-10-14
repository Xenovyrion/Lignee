import { couleurs } from "../../moteur/donnees";
import type { BesoinCouleur } from "../../moteur/etable";
import type { Etat, Famille, Monture, Sexe } from "../../moteur/types";
import { COULEURS, ImageMonture } from "../arbre/commun";

interface Props {
  famille: Famille;
  montures: Monture[]; // déjà filtrées
  besoins: Map<string, BesoinCouleur>;
  ajouter: (couleur: string, sexe: Sexe) => void;
  retirer: (couleur: string, sexe: Sexe) => void;
  ouvrirCouleur: (couleur: string) => void;
  /** Mode simple : stock saisi par sexe et état. */
  simple?: { stock: (c: string, sexe: Sexe, etat: Etat) => number; ajuster: (c: string, sexe: Sexe, etat: Etat, delta: number) => void };
}

const ETATS_SIMPLE: [Etat, string, string][] = [
  ["fertile", "Fertile", "#60a5fa"],
  ["feconde", "Féconde", "#22c55e"],
  ["sterile", "Stérile", "#ef4444"],
];

/** Tableau 2 × 3 (sexe × état) avec −/+ dans chaque case. */
function GrilleStock({ c, simple }: { c: string; simple: NonNullable<Props["simple"]> }) {
  return (
    <table className="w-full text-center text-xs" onClick={(e) => e.stopPropagation()}>
      <thead>
        <tr className="text-[11px]">
          <th className="w-6" />
          {ETATS_SIMPLE.map(([e, l, t]) => (
            <th key={e} className="pb-1 font-medium" style={{ color: t }}>
              {l}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(["M", "F"] as Sexe[]).map((sexe) => (
          <tr key={sexe}>
            <td className={`text-base ${sexe === "M" ? "text-sky-400" : "text-pink-400"}`}>{sexe === "M" ? "♂" : "♀"}</td>
            {ETATS_SIMPLE.map(([etat]) => {
              const n = simple.stock(c, sexe, etat);
              return (
                <td key={etat} className="p-0.5">
                  <div className="flex items-center justify-between rounded-md border border-border bg-bg-card">
                    <button disabled={!n} onClick={() => simple.ajuster(c, sexe, etat, -1)} className="px-1.5 py-0.5 text-text-muted hover:text-text-primary disabled:opacity-25" title="Retirer une monture">
                      −
                    </button>
                    <span className={`font-bold ${n ? "text-text-primary" : "text-text-muted"}`}>{n}</span>
                    <button onClick={() => simple.ajuster(c, sexe, etat, 1)} className="px-1.5 py-0.5 text-text-muted hover:text-text-primary" title="Ajouter une monture">
                      +
                    </button>
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Pastille = ({ n, fond }: { n: number; fond: string }) => (
  <span className="inline-flex h-6 min-w-[26px] items-center justify-center rounded-full px-1.5 text-xs font-bold text-white" style={{ background: n ? fond : "rgba(255,255,255,0.08)", color: n ? "#fff" : "#64748b" }}>
    {n}
  </span>
);

/** Une carte par couleur, regroupées par génération : stock comparé aux besoins du plan, ajout et retrait en un clic. */
export function VueCouleurs({ famille, montures, besoins, ajouter, retirer, ouvrirCouleur, simple }: Props) {
  const presentes = new Set(montures.map((m) => m.couleur));
  const liste = couleurs(famille).filter((c) => presentes.has(c.id));
  if (liste.length === 0) return <p className="p-4 text-sm text-text-muted">Aucune monture ne correspond aux filtres.</p>;
  const gens = [...new Set(liste.map((c) => c.generation))];

  // Les compteurs reflètent l'affichage filtré ; les besoins du plan, toute l'étable.
  const compter = (c: string) => {
    const l = montures.filter((m) => m.couleur === c);
    const actives = l.filter((m) => m.etat !== "sterile");
    return {
      males: actives.filter((m) => m.sexe === "M").length,
      femelles: actives.filter((m) => m.sexe === "F").length,
      fecondes: actives.filter((m) => m.etat === "feconde").length,
      steriles: l.length - actives.length,
      niveauMax: l.reduce((a, m) => Math.max(a, m.niveau), 0),
    };
  };

  const Bouton = ({ c, s, signe, actif = true }: { c: string; s: Sexe; signe: "+" | "−"; actif?: boolean }) => (
    <button
      disabled={!actif}
      title={`${signe === "+" ? "Ajouter" : "Retirer la dernière ajoutée :"} ${s === "M" ? "un mâle" : "une femelle"}`}
      onClick={(e) => {
        e.stopPropagation();
        (signe === "+" ? ajouter : retirer)(c, s);
      }}
      className={`h-6 w-7 rounded border border-border-light text-xs hover:bg-bg-hover disabled:opacity-25 ${s === "M" ? "text-sky-400" : "text-pink-400"}`}
    >
      {signe}
      {s === "M" ? "♂" : "♀"}
    </button>
  );

  return (
    <div className="flex flex-col gap-4 p-3">
      {gens.map((g) => (
        <div key={g}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Génération {g}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2">
            {liste
              .filter((c) => c.generation === g)
              .map((c) => {
                const n = compter(c.id);
                const b = besoins.get(c.id);
                const manque = b ? (c.generation === 1 ? b.aCapturer : b.aProduire) : 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => !simple && ouvrirCouleur(c.id)}
                    title={simple ? undefined : "Voir ces montures dans la liste"}
                    className={`flex flex-col gap-2 rounded-xl border border-border bg-bg-secondary p-2.5 transition ${simple ? "" : "cursor-pointer hover:border-border-light hover:bg-bg-hover"}`}
                  >
                    <div className="flex items-center gap-2">
                      <ImageMonture famille={famille} id={c.id} taille={52} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.nom}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Pastille n={n.males} fond={COULEURS.males} />
                          <Pastille n={n.femelles} fond={COULEURS.femelles} />
                          {!simple && <span className="text-[11px] text-text-muted">niv. ≤ {n.niveauMax}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[11px]">
                      {!simple && n.fecondes > 0 && <span className="rounded bg-status-ok/15 px-1.5 text-status-ok">{n.fecondes} féconde{n.fecondes > 1 ? "s" : ""}</span>}
                      {!simple && n.steriles > 0 && <span className="rounded bg-status-err/15 px-1.5 text-status-err">{n.steriles} stérile{n.steriles > 1 ? "s" : ""}</span>}
                      {b && b.utilisees > 0 && <span className="rounded bg-accent-dim px-1.5 text-accent">{b.utilisees} pour le plan</span>}
                      {b && b.libres > 0 && (
                        <span className="rounded bg-bg-hover px-1.5 text-text-secondary" title="Montures que le plan n'utilise pas : à garder en réserve, vendre ou recycler">
                          {b.libres} libre{b.libres > 1 ? "s" : ""}
                        </span>
                      )}
                      {manque > 0 && (
                        <span className="rounded px-1.5" style={{ background: "rgba(249,115,22,0.15)", color: COULEURS.produire }} title="Prévu par le plan sur l'ensemble de l'élevage">
                          {c.generation === 1 ? `${manque} à capturer` : `${manque} à faire naître`}
                        </span>
                      )}
                    </div>
                    {simple ? (
                      <GrilleStock c={c.id} simple={simple} />
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <Bouton c={c.id} s="M" signe="−" actif={n.males > 0} />
                        <Bouton c={c.id} s="M" signe="+" />
                        <span className="w-1.5" />
                        <Bouton c={c.id} s="F" signe="−" actif={n.femelles > 0} />
                        <Bouton c={c.id} s="F" signe="+" />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ))}
    </div>
  );
}
