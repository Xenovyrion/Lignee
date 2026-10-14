import { couleur } from "../../moteur/donnees";
import type { Famille, Monture } from "../../moteur/types";

/** Place d'une couleur dans le plan d'élevage. */
export type RolePlan = "pret" | "preparer" | "produire";

export interface Statut {
  obtenue: boolean;
  males: number;
  femelles: number;
  /** pret / preparer : prochaine naissance faisable ; produire : à faire naître pour débloquer la suite. */
  plan?: RolePlan;
}

/** État d'une couleur pour l'affichage : succès obtenu, montures disponibles (non stériles), rôle dans le plan. */
export function fabriquerStatut(famille: Famille, montures: Monture[], obtenues: string[], roles: Map<string, RolePlan> = new Map()) {
  const ob = new Set(obtenues);
  const stock = new Map<string, { males: number; femelles: number }>();
  for (const m of montures) {
    if (m.famille !== famille || m.etat === "sterile") continue;
    const s = stock.get(m.couleur) ?? { males: 0, femelles: 0 };
    if (m.sexe === "M") s.males++;
    else s.femelles++;
    stock.set(m.couleur, s);
  }
  return (id: string): Statut => ({
    // Les générations 1 se capturent : elles ne comptent pas comme succès de naissance.
    obtenue: couleur(famille, id).generation === 1 || ob.has(id),
    ...(stock.get(id) ?? { males: 0, femelles: 0 }),
    plan: roles.get(id),
  });
}

export const COULEURS = {
  obtenue: "#22c55e",
  verrouillee: "rgba(255,255,255,0.22)",
  prochaine: "#facc15",
  produire: "#f97316",
  males: "#0ea5e9",
  femelles: "#ec4899",
};

/** Contour : vert si la naissance est obtenue, gris sinon. */
export const teinte = (s: Statut) => (s.obtenue ? COULEURS.obtenue : COULEURS.verrouillee);

/** Anneau extérieur selon le plan : doré (prochaine naissance) ou orange (à faire naître pour la suite). */
export const anneau = (s: Statut): string | null =>
  s.plan === "pret" || s.plan === "preparer" ? COULEURS.prochaine : s.plan === "produire" ? COULEURS.produire : null;

export function ImageMonture({ famille, id, taille, className = "" }: { famille: Famille; id: string; taille: number; className?: string }) {
  const c = couleur(famille, id);
  return c.image ? (
    <img src={c.image} alt={c.nom} width={taille} height={taille} loading="lazy" draggable={false} className={`select-none object-contain ${className}`} />
  ) : (
    <div style={{ width: taille, height: taille }} className={`rounded-full bg-bg-hover ${className}`} />
  );
}

const Rond = ({ bord, tirets, fond }: { bord: string; tirets?: boolean; fond?: string }) => (
  <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full" style={{ border: `2px ${tirets ? "dashed" : "solid"} ${bord}`, background: fond ?? "transparent" }} />
);

const Pastille = ({ fond, n }: { fond: string; n: number }) => (
  <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[11px] font-bold text-white" style={{ background: fond }}>
    {n}
  </span>
);

/** Légende affichée en barre sous l'arbre, toujours visible. */
export const LegendeArbre = () => (
  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 border-t border-border bg-bg-secondary px-4 py-2 text-[13px] text-text-secondary">
    <span className="flex items-center gap-1.5">
      <Rond bord={COULEURS.obtenue} /> Obtenue
    </span>
    <span className="flex items-center gap-1.5">
      <Rond bord={COULEURS.verrouillee} tirets /> À obtenir
    </span>
    <span className="flex items-center gap-1.5">
      <span className="text-lg leading-none" style={{ color: COULEURS.prochaine }}>
        ★
      </span>
      Prochaine naissance
      <span className="text-text-muted">(☆ parents à préparer)</span>
    </span>
    <span className="flex items-center gap-1.5">
      <Rond bord={COULEURS.produire} /> À faire naître pour la suite
    </span>
    <span className="flex items-center gap-1.5">
      <Pastille fond={COULEURS.males} n={2} />
      <Pastille fond={COULEURS.femelles} n={3} /> En stock ♂ / ♀
    </span>
  </div>
);
