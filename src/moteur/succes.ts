// Succès d'élevage officiels (noms et contenu vérifiés dans les données du jeu, voir docs/).
import { couleurs, NOMS_FAMILLE } from "./donnees";
import type { Famille, Monture, Sauvegarde } from "./types";

const ORDINAUX = ["", "Première", "Deuxième", "Troisième", "Quatrième", "Cinquième", "Sixième", "Septième", "Huitième", "Neuvième", "Dixième"];

export const NOM_CAPTURE: Record<Famille, string> = {
  dragodinde: "Ce n'est qu'un prélèvement",
  muldo: "Prélèvement marin",
  volkorne: "Prélèvement cornu",
};

export const NOM_META: Record<Famille, string> = {
  dragodinde: "De génération en génération",
  muldo: "Générations aquatiques",
  volkorne: "Génération V",
};

export const OBJECTIF_NAISSANCES = 1000;

export const nomSuccesGeneration = (f: Famille, g: number) => `${NOMS_FAMILLE[f]} : ${ORDINAUX[g]} génération`;

export interface SuccesGeneration {
  generation: number;
  nom: string;
  couleurs: string[];
  obtenues: string[];
  valide: boolean;
}

export interface BilanFamille {
  famille: Famille;
  generations: SuccesGeneration[];
  /** Couleurs G2-G10 obtenues / à obtenir. */
  obtenues: number;
  total: number;
  /** Succès de génération validés (sur 9). */
  validees: number;
  capture: { nom: string; couleurs: string[]; capturees: string[]; valide: boolean };
  meta: { nom: string; valide: boolean };
}

/**
 * Une couleur G1 compte comme capturée si elle est cochée, ou si l'étable en contient au moins une
 * (elle a forcément été capturée un jour).
 */
export function capturees(f: Famille, s: Pick<Sauvegarde, "obtenues">, montures: Monture[]): string[] {
  const ob = new Set(s.obtenues[f]);
  const enEtable = new Set(montures.filter((m) => m.famille === f).map((m) => m.couleur));
  return couleurs(f)
    .filter((c) => c.generation === 1 && (ob.has(c.id) || enEtable.has(c.id)))
    .map((c) => c.id);
}

export function bilan(f: Famille, s: Pick<Sauvegarde, "obtenues" | "montures">): BilanFamille {
  const ob = new Set(s.obtenues[f]);
  const generations: SuccesGeneration[] = [];
  for (let g = 2; g <= 10; g++) {
    const l = couleurs(f)
      .filter((c) => c.generation === g)
      .map((c) => c.id);
    const o = l.filter((c) => ob.has(c));
    generations.push({ generation: g, nom: nomSuccesGeneration(f, g), couleurs: l, obtenues: o, valide: o.length === l.length });
  }
  const g1 = couleurs(f)
    .filter((c) => c.generation === 1)
    .map((c) => c.id);
  const cap = capturees(f, s, s.montures);
  const validees = generations.filter((x) => x.valide).length;
  return {
    famille: f,
    generations,
    obtenues: generations.reduce((a, x) => a + x.obtenues.length, 0),
    total: generations.reduce((a, x) => a + x.couleurs.length, 0),
    validees,
    capture: { nom: NOM_CAPTURE[f], couleurs: g1, capturees: cap, valide: cap.length === g1.length },
    meta: { nom: NOM_META[f], valide: validees === generations.length },
  };
}

/** Naissances comptées pour le succès des 1 000 : celles du journal + celles d'avant l'outil. */
export const naissances = (s: Pick<Sauvegarde, "journal" | "options">) =>
  s.journal.reduce((a, j) => a + j.bebeIds.length, 0) + (s.options.naissancesAnterieures ?? 0);
