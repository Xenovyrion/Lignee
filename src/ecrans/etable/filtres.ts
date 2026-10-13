// Filtres et tri de l'étable (logique pure, testée).
import { couleur, couleurs } from "../../moteur/donnees";
import type { Etat, Famille, Monture, Sexe } from "../../moteur/types";

export interface Filtre {
  texte: string;
  generations: number[];
  sexes: Sexe[];
  etats: Etat[];
  couleurs: string[];
  niveauMin: number;
  niveauMax: number;
  plan: "toutes" | "reservees" | "libres";
}

export const filtreVide = (): Filtre => ({ texte: "", generations: [], sexes: [], etats: [], couleurs: [], niveauMin: 1, niveauMax: 200, plan: "toutes" });

export const estFiltreVide = (f: Filtre) => JSON.stringify(f) === JSON.stringify(filtreVide());

/** Minuscules sans accents, pour une recherche tolérante (« ebene ind » trouve « Ébène et Indigo »). */
export const normaliser = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const correspondTexte = (cible: string, recherche: string) => {
  const c = normaliser(cible);
  return normaliser(recherche)
    .split(/\s+/)
    .filter(Boolean)
    .every((mot) => c.includes(mot));
};

/** Couleur d'une famille à partir d'un texte saisi : nom exact d'abord, sinon unique correspondance partielle. */
export function trouverCouleur(famille: Famille, saisie: string): string | null {
  const t = normaliser(saisie.replace(/\(G\d+\)\s*$/, ""));
  if (!t) return null;
  const exacte = couleurs(famille).find((c) => normaliser(c.nom) === t);
  if (exacte) return exacte.id;
  const partielles = couleurs(famille).filter((c) => correspondTexte(c.nom, t));
  return partielles.length === 1 ? partielles[0].id : null;
}

export function filtrer(montures: Monture[], famille: Famille, f: Filtre, reservees: Set<string>): Monture[] {
  return montures.filter((m) => {
    if (m.famille !== famille) return false;
    const c = couleur(famille, m.couleur);
    if (f.texte && !correspondTexte(`${c.nom} ${m.nom ?? ""}`, f.texte)) return false;
    if (f.generations.length && !f.generations.includes(c.generation)) return false;
    if (f.sexes.length && !f.sexes.includes(m.sexe)) return false;
    if (f.etats.length && !f.etats.includes(m.etat)) return false;
    if (f.couleurs.length && !f.couleurs.includes(m.couleur)) return false;
    if (m.niveau < f.niveauMin || m.niveau > f.niveauMax) return false;
    if (f.plan === "reservees" && !reservees.has(m.id)) return false;
    if (f.plan === "libres" && reservees.has(m.id)) return false;
    return true;
  });
}

export type CleTri = "generation" | "couleur" | "sexe" | "niveau" | "etat";
export interface Tri {
  cle: CleTri;
  sens: 1 | -1;
}

const ORDRE_ETAT: Record<Etat, number> = { feconde: 0, fertile: 1, sterile: 2 };

export function trier(montures: Monture[], famille: Famille, t: Tri): Monture[] {
  const gen = (m: Monture) => couleur(famille, m.couleur).generation;
  const nom = (m: Monture) => couleur(famille, m.couleur).nom;
  const cmp: Record<CleTri, (a: Monture, b: Monture) => number> = {
    generation: (a, b) => gen(a) - gen(b),
    couleur: (a, b) => nom(a).localeCompare(nom(b)),
    sexe: (a, b) => a.sexe.localeCompare(b.sexe),
    niveau: (a, b) => a.niveau - b.niveau,
    etat: (a, b) => ORDRE_ETAT[a.etat] - ORDRE_ETAT[b.etat],
  };
  // Tri secondaire stable : génération, couleur, puis niveau décroissant.
  return [...montures].sort((a, b) => t.sens * cmp[t.cle](a, b) || gen(a) - gen(b) || nom(a).localeCompare(nom(b)) || b.niveau - a.niveau);
}

/** Nombre de montures par valeur, pour afficher les compteurs du panneau de filtres. */
export function compter<K extends string | number>(montures: Monture[], cle: (m: Monture) => K): Map<K, number> {
  const r = new Map<K, number>();
  for (const m of montures) r.set(cle(m), (r.get(cle(m)) ?? 0) + 1);
  return r;
}
