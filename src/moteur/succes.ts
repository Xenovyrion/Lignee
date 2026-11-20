// Succès d'élevage officiels (noms et contenu vérifiés dans les données du jeu, voir docs/).
import { couleurs, NOMS_FAMILLE } from "./donnees";
import type { Accouplement, Famille, Monture, Sauvegarde } from "./types";

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

/** Succès « Général » : paliers de naissances (toutes familles), regroupés par un méta-succès. */
export const PALIERS_NAISSANCES: [number, string][] = [
  [1, "Elle a peut-être trop mangé ?"],
  [10, "Matrone"],
  [100, "Sage-femme"],
  [1000, "Allez on pousse !"],
];
export const NOM_META_NAISSANCES = "L'éleveur c'est moi";

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

/** Bilan de chance : naissances réussies (couleur visée obtenue) comparées aux chances prévues. */
export interface BilanChance {
  /** Accouplements suivis (enregistrés avec leur prévision). */
  suivis: number;
  reussis: number;
  /** Nombre de réussites attendu (somme des chances). */
  attendus: number;
  /** Écart en écarts-types : négatif = moins chanceux que prévu. */
  ecart: number;
  verdict: "conforme" | "chanceux" | "malchanceux" | "trop-tot";
  /** Derniers accouplements suivis, du plus récent au plus ancien. */
  derniers: { date: string; vise: string; chance: number; couleurs: string[]; reussi: boolean }[];
}

const suivi = (j: Accouplement) => !!j.vise && j.chance !== undefined && !!j.couleurs;

export function bilanChance(journal: Accouplement[], famille?: Famille, nbDerniers = 8): BilanChance {
  const l = journal.filter((j) => suivi(j) && (!famille || j.famille === famille));
  const reussi = (j: Accouplement) => j.couleurs!.includes(j.vise!);
  const reussis = l.filter(reussi).length;
  const attendus = l.reduce((a, j) => a + j.chance!, 0);
  const variance = l.reduce((a, j) => a + j.chance! * (1 - j.chance!), 0);
  const ecart = variance > 0 ? (reussis - attendus) / Math.sqrt(variance) : 0;
  // Moins de 10 accouplements suivis : trop tôt pour conclure. Au-delà de 2 écarts-types : notable.
  const verdict = l.length < 10 ? "trop-tot" : ecart > 2 ? "chanceux" : ecart < -2 ? "malchanceux" : "conforme";
  const derniers = l
    .slice(-nbDerniers)
    .reverse()
    .map((j) => ({ date: j.date, vise: j.vise!, chance: j.chance!, couleurs: j.couleurs!, reussi: reussi(j) }));
  return { suivis: l.length, reussis, attendus, ecart, verdict, derniers };
}

/** Bilan de chance découpé par makina utilisée puis par niveau des parents (lignes vides omises). */
export function bilanChanceDetail(journal: Accouplement[], famille?: Famille): { libelle: string; groupe: "makina" | "niveau"; bilan: BilanChance }[] {
  const l = journal.filter((j) => suivi(j) && (!famille || j.famille === famille));
  const min = (j: Accouplement) => (j.niveaux ? Math.min(...j.niveaux) : -1);
  const groupes: [string, "makina" | "niveau", (j: Accouplement) => boolean][] = [
    ["Optimakina", "makina", (j) => j.makina === "optimakina"],
    ["Animakina", "makina", (j) => j.makina === "animakina"],
    ["Kromakina", "makina", (j) => j.makina === "kromakina"],
    ["Sans makina", "makina", (j) => !j.makina],
    ["Parents tous deux niv. 200", "niveau", (j) => min(j) >= 200],
    ["Parents niv. 100 à 199", "niveau", (j) => min(j) >= 100 && min(j) < 200],
    ["Un parent sous le niv. 100", "niveau", (j) => min(j) >= 0 && min(j) < 100],
  ];
  return groupes.map(([libelle, groupe, f]) => ({ libelle, groupe, bilan: bilanChance(l.filter(f), undefined, 0) })).filter((x) => x.bilan.suivis > 0);
}
