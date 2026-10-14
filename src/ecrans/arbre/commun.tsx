import { couleur } from "../../moteur/donnees";
import type { Famille, Monture } from "../../moteur/types";

/** Place d'une couleur dans le plan d'élevage. */
export type RolePlan = "pret" | "preparer" | "produire";

export interface Statut {
  obtenue: boolean;
  males: number;
  femelles: number;
  /** pret / preparer : à faire maintenant ; produire : à refaire plus tard pour servir de parent. */
  plan?: RolePlan;
  /** Ordre conseillé des naissances à faire maintenant (1 = la plus utile). */
  rang?: number;
}

/** État d'une couleur pour l'affichage : succès obtenu, montures disponibles (non stériles), rôle dans le plan. */
export function fabriquerStatut(
  famille: Famille,
  montures: Monture[],
  obtenues: string[],
  roles: Map<string, RolePlan> = new Map(),
  rangs: Map<string, number> = new Map(),
) {
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
    rang: rangs.get(id),
  });
}

export const COULEURS = {
  obtenue: "#22c55e",
  contour: "rgba(255,255,255,0.32)",
  verrouillee: "rgba(255,255,255,0.22)",
  prochaine: "#facc15",
  produire: "#f97316",
  males: "#0ea5e9",
  femelles: "#ec4899",
};

/** Contour : plein si la couleur a déjà été obtenue (point vert en plus), pointillé sinon. */
export const teinte = (s: Statut) => (s.obtenue ? COULEURS.contour : COULEURS.verrouillee);

/** Anneau orange pointillé : couleur à refaire plus tard pour servir de parent. */
export const anneau = (s: Statut): string | null => (s.plan === "produire" ? COULEURS.produire : null);

/** Une naissance à faire maintenant (étoile numérotée) ? */
export const aFaireMaintenant = (s: Statut) => s.plan === "pret" || s.plan === "preparer";

/** Étoile numérotée : pleine si les parents sont prêts, contour seul s'ils sont à préparer. */
export const Etoile = ({ rang, pret, taille = 22 }: { rang: number; pret: boolean; taille?: number }) => (
  <span
    className="inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-bold leading-none"
    style={{
      width: taille,
      height: taille,
      background: pret ? COULEURS.prochaine : "#161b24",
      color: pret ? "#0b0d12" : COULEURS.prochaine,
      border: `2px solid ${COULEURS.prochaine}`,
    }}
  >
    {rang}
  </span>
);

export const PointObtenue = () => <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: COULEURS.obtenue }} />;

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
      <PointObtenue /> Déjà obtenue (succès)
    </span>
    <span className="flex items-center gap-1.5">
      <Rond bord={COULEURS.verrouillee} tirets /> Jamais obtenue
    </span>
    <span className="flex items-center gap-1.5">
      <Etoile rang={1} pret taille={18} />
      <Etoile rang={2} pret={false} taille={18} /> À faire maintenant, dans l'ordre (plein : parents prêts · vide : à préparer)
    </span>
    <span className="flex items-center gap-1.5">
      <Rond bord={COULEURS.produire} tirets /> À refaire plus tard (servira de parent)
    </span>
    <span className="flex items-center gap-1.5">
      <Pastille fond={COULEURS.males} n={2} />
      <Pastille fond={COULEURS.femelles} n={3} /> En stock ♂ / ♀
    </span>
  </div>
);
