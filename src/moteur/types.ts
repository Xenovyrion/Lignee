export type Famille = "dragodinde" | "muldo" | "volkorne";
export type Sexe = "M" | "F";
/** Fertile : jauges à remplir. Féconde : prête à s'accoupler. Stérile : déjà reproduite (clonable). */
export type Etat = "fertile" | "feconde" | "sterile";
export type Capacite = "reproducteur" | "sage" | "amoureuse" | "endurante" | "cameleone";
export type Makina = "optimakina" | "animakina" | "kromakina";

export interface Couleur {
  id: string;
  nom: string;
  generation: number;
  capturable: boolean;
  /** Paires de couleurs parentes produisant cette couleur (plusieurs pour certains Muldos/Volkornes). */
  recettes: [string, string][];
  /** Illustration officielle (DofusDB, © Ankama), chargée à l'affichage. */
  image?: string;
}

export interface Monture {
  id: string;
  famille: Famille;
  couleur: string;
  sexe: Sexe;
  niveau: number;
  etat: Etat;
  capacite?: Capacite;
  /** Couleurs du père et de la mère (absent pour une monture capturée). */
  parents?: [string, string];
  nom?: string;
  /** Enclos où la monture est placée (1 à 6), pour remplir ses jauges. */
  enclos?: number;
  origine: "capture" | "naissance" | "saisie" | "clonage";
  creeLe: string;
}

export interface Accouplement {
  id: string;
  date: string;
  famille: Famille;
  pereId: string;
  mereId: string;
  makina?: Makina;
  bebeIds: string[];
}

export interface Sauvegarde {
  version: 1;
  montures: Monture[];
  journal: Accouplement[];
  /** Couleurs déjà obtenues par naissance (succès de génération), par famille. */
  obtenues: Record<Famille, string[]>;
  options: Options;
}

export interface Options {
  takeza: boolean;
  /**
   * Mode simple : un seul niveau pour toutes les montures (celui-ci).
   * Mode détaillé : niveau proposé pour les nouvelles montures saisies.
   */
  niveauParDefaut: number;
  /** Simple : stock saisi en nombres par couleur, sexe et état. Détaillé : chaque monture (niveau, enclos…). */
  modeSuivi: "simple" | "detaille";
  /** Affiche la colonne « Nom » dans l'étable. */
  afficherNom: boolean;
  langue: "fr";
  /** Naissances faites avant d'utiliser l'outil (succès des 1 000 naissances). */
  naissancesAnterieures: number;
  /** Niveau du métier Éleveur (détermine le nombre d'enclos : niveaux 1, 40, 80, 120, 160, 200). */
  niveauEleveur: number;
}
