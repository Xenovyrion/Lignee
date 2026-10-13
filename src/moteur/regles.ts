// Règles d'élevage Dofus 3.7 — sources et niveaux de confiance : docs/REFERENCE_ELEVAGE_3.7.md
import { couleur, couleurs } from "./donnees";
import type { Famille, Monture } from "./types";

export const BASE_CIBLE = 0.3;
export const BONUS_PAR_NIVEAU = 0.0015; // 0,15 % par niveau, niveaux des deux parents additionnés
export const BONUS_OPTIMAKINA = 0.2; // +20 % depuis la 3.7 (+10 % avant)
export const BONUS_TAKEZA = 0.2; // Almanax Takeza
export const NIVEAU_MAX = 200;

export interface Bonus {
  optimakina?: boolean;
  takeza?: boolean;
}

/** Probabilité d'obtenir la génération cible. */
export function probaCible(niveauPere: number, niveauMere: number, b: Bonus = {}): number {
  const p =
    BASE_CIBLE +
    BONUS_PAR_NIVEAU * (niveauPere + niveauMere) +
    (b.optimakina ? BONUS_OPTIMAKINA : 0) +
    (b.takeza ? BONUS_TAKEZA : 0);
  return Math.min(1, Math.round(p * 10000) / 10000);
}

/** Somme des niveaux des deux parents nécessaire pour 100 %, ou null si inatteignable (> 400). */
export function sommeNiveauxPour100(b: Bonus = {}): number | null {
  const manque = 1 - BASE_CIBLE - (b.optimakina ? BONUS_OPTIMAKINA : 0) - (b.takeza ? BONUS_TAKEZA : 0);
  if (manque <= 0) return 0;
  const somme = Math.ceil(Math.round((manque / BONUS_PAR_NIVEAU) * 1000) / 1000);
  return somme <= 2 * NIVEAU_MAX ? somme : null;
}

export interface Cible {
  generation: number;
  /** Couleurs possibles dans la génération cible (la probabilité est répartie entre elles). */
  couleurs: string[];
}

/**
 * Génération cible d'un couple : la plus haute génération atteignable avec une recette dont un
 * ingrédient vient de l'arbre du père (lui + ses parents) et l'autre de l'arbre de la mère.
 * Approximation communautaire : l'interface de génétique du jeu fait foi.
 */
export function cible(famille: Famille, pere: Pick<Monture, "couleur" | "parents">, mere: Pick<Monture, "couleur" | "parents">): Cible | null {
  const arbre = (m: Pick<Monture, "couleur" | "parents">) => new Set([m.couleur, ...(m.parents ?? [])]);
  const a = arbre(pere);
  const b = arbre(mere);
  let meilleure: Cible | null = null;
  for (const c of couleurs(famille)) {
    const ok = c.recettes.some(([x, y]) => (a.has(x) && b.has(y)) || (a.has(y) && b.has(x)));
    if (!ok) continue;
    if (!meilleure || c.generation > meilleure.generation) meilleure = { generation: c.generation, couleurs: [c.id] };
    else if (c.generation === meilleure.generation) meilleure.couleurs.push(c.id);
  }
  return meilleure;
}

/** Couleur produite par une recette directe des deux parents, s'il y en a une. */
export function recetteDirecte(famille: Famille, couleurA: string, couleurB: string): string | null {
  for (const c of couleurs(famille)) {
    if (c.recettes.some(([x, y]) => (x === couleurA && y === couleurB) || (x === couleurB && y === couleurA))) return c.id;
  }
  return null;
}

export const peutSAccoupler = (m: Monture) => m.etat !== "sterile";

/** Deux stériles de même famille et même génération peuvent être clonés en une monture fertile. */
export function clonables(a: Monture, b: Monture): boolean {
  return (
    a.id !== b.id &&
    a.etat === "sterile" &&
    b.etat === "sterile" &&
    a.famille === b.famille &&
    couleur(a.famille, a.couleur).generation === couleur(b.famille, b.couleur).generation
  );
}
