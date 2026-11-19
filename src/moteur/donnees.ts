import brut from "../donnees/arbres_croisements_3.7.json";
import carac from "../donnees/caracteristiques_3.7.json";
import type { Couleur, Famille } from "./types";

export const FAMILLES: Famille[] = ["dragodinde", "muldo", "volkorne"];
export const NOMS_FAMILLE: Record<Famille, string> = {
  dragodinde: "Dragodinde",
  muldo: "Muldo",
  volkorne: "Volkorne",
};

const parFamille = {} as Record<Famille, Couleur[]>;
const index = {} as Record<Famille, Map<string, Couleur>>;
for (const f of FAMILLES) {
  parFamille[f] = (brut.familles[f].couleurs as Couleur[]).slice().sort((a, b) => a.generation - b.generation || a.nom.localeCompare(b.nom));
  index[f] = new Map(parFamille[f].map((c) => [c.id, c]));
}

export const couleurs = (f: Famille): Couleur[] => parFamille[f];

export function couleur(f: Famille, id: string): Couleur {
  const c = index[f].get(id);
  if (!c) throw new Error(`Couleur inconnue : ${f}/${id}`);
  return c;
}

export const nomCouleur = (f: Famille, id: string) => index[f].get(id)?.nom ?? id;

/**
 * Bonus de la monture au niveau maximum (source : dofuspourlesnoobs.com, plus à jour que DofusDB), ex. [["Vitalité", 400], ["Puissance", 90]].
 * null si la couleur manque dans les données.
 */
export function caracteristiques(f: Famille, id: string): [string, number][] | null {
  return (carac.familles as unknown as Record<Famille, Record<string, [string, number][] | undefined>>)[f][id] ?? null;
}

/** Couleurs comptant pour les succès de génération (G2 à G10). */
export const objectifs = (f: Famille) => parFamille[f].filter((c) => c.generation > 1);
