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
  options: { takeza: boolean };
}
