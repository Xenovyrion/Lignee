import { couleur } from "../../moteur/donnees";
import type { Famille, Monture } from "../../moteur/types";

export interface Statut {
  obtenue: boolean;
  males: number;
  femelles: number;
}

/** État d'une couleur pour l'affichage : succès obtenu et montures disponibles (non stériles). */
export function fabriquerStatut(famille: Famille, montures: Monture[], obtenues: string[]) {
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
  });
}

/** Couleur de contour selon l'état : en stock (bleu), obtenue (vert), manquante (gris). */
export function teinte(s: Statut): string {
  if (s.males + s.femelles > 0) return "#60a5fa";
  if (s.obtenue) return "#22c55e";
  return "rgba(255,255,255,0.18)";
}

export function ImageMonture({ famille, id, taille, className = "" }: { famille: Famille; id: string; taille: number; className?: string }) {
  const c = couleur(famille, id);
  return c.image ? (
    <img src={c.image} alt={c.nom} width={taille} height={taille} loading="lazy" draggable={false} className={`select-none object-contain ${className}`} />
  ) : (
    <div style={{ width: taille, height: taille }} className={`rounded-full bg-bg-hover ${className}`} />
  );
}

export const Legende = () => (
  <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full bg-status-info" /> en stock
    </span>
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full bg-status-ok" /> obtenue
    </span>
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full bg-white/20" /> à obtenir
    </span>
  </div>
);
