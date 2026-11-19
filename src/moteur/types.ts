import type { MinuteurEnclos } from "./enclos";
export type Famille = "dragodinde" | "muldo" | "volkorne";
export type Sexe = "M" | "F";
/** Fertile : jauges à remplir. Féconde : prête à s'accoupler. Stérile : déjà reproduite (clonable). */
export type Etat = "fertile" | "feconde" | "sterile";
export type Capacite = "reproducteur" | "sage" | "amoureuse" | "endurante" | "precoce" | "cameleone";
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
  /** Minuteurs d'enclos en cours (un par enclos). */
  minuteurs?: MinuteurEnclos[];
}

export interface Options {
  takeza: boolean;
  /**
   * Mode simple : un seul niveau pour toutes les montures (celui-ci).
   * Mode détaillé : niveau proposé pour les nouvelles montures saisies.
   */
  niveauParDefaut: number;
  /** Simple : stock saisi en nombres par couleur, sexe et état. Détaillé : chaque monture (niveau, capacité, fiche…). */
  modeSuivi: "simple" | "detaille";
  /** Affiche la colonne « Nom » dans l'étable. */
  afficherNom: boolean;
  langue: "fr";
  /** Naissances faites avant d'utiliser l'outil (succès des 1 000 naissances). */
  naissancesAnterieures: number;
  /** Niveau du métier Éleveur (détermine le nombre d'enclos : niveaux 1, 40, 80, 120, 160, 200). */
  niveauEleveur: number;
  /** Effets animés du tableau de bord (apparitions, confettis…). */
  animations: boolean;
  /** Lucioles dorées en fond d'écran (si les animations sont actives). */
  particules: boolean;
  /** Image de fond choisie par l'utilisateur (fichier copié dans AppData), vide = aucune. */
  fondEcran: string;
  /** Visibilité de l'image de fond, en % (le reste est assombri pour garder la lisibilité). */
  fondVisibilite: number;
  /** Flou de l'image de fond, en pixels. */
  fondFlou: number;
  /** Opacité des panneaux, en % (plus haut = plus opaque, plus lisible). */
  voile: number;
  /** Thème (palette de couleurs), voir src/themes.ts. */
  theme: string;
  /** Visite guidée : « vu » (faite ou passée), « refuse » ; absent = à proposer à l'ouverture. */
  didacticiel?: "vu" | "refuse";
  /** Makina conseillée : « auto » (meilleure chance globale), ou toujours la même (modifiable à chaque saisie). */
  makina?: "auto" | "optimakina" | "animakina";
  /** Saisie des jauges d'enclos : simple (paliers et demi-paliers) ou avancée (valeur exacte). */
  saisieJauges?: "palier" | "exacte";
  /** Notifications Windows à la fin des minuteurs d'enclos. */
  notifWindows?: boolean;
  /** Tableau de bord en vue compacte : seulement les actions, sans les explications. */
  vueCompacte?: boolean;
}
