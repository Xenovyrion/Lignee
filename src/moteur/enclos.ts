// Minuteurs d'enclos : simulation des jauges tic par tic (toutes les 10 s) pour prévoir quand les montures
// sont prêtes. Simplification voulue : les caractéristiques (endurance, maturité, amour) partent de 0 ;
// la sérénité de départ est choisie (ou déduite des jauges : on suppose les montures dans la bonne zone),
// et seul le niveau de départ compte pour l'XP. Règles : docs/REFERENCE_ELEVAGE_3.7.md, section 6.
import XP from "../donnees/xp_monture.json";

export type TypeJauge = "baffeur" | "caresseur" | "endurance" | "maturite" | "amour" | "mangeoire";

export interface JaugeEnclos {
  type: TypeJauge;
  /** Charge de la jauge au lancement (0 à 200 000). */
  charge: number;
}

export interface MinuteurEnclos {
  /** Numéro de l'enclos (1 à 6). */
  enclos: number;
  /** Lancement (ISO). */
  debut: string;
  /** Nombre de montures dans l'enclos : affiché seulement, il ne change pas la durée. */
  montures: number;
  /** Deux jauges actives au maximum. */
  jauges: JaugeEnclos[];
  /** Mangeoire : niveau des montures au lancement et niveau visé. */
  niveauDepart: number;
  niveauCible: number;
  /** Sérénité des montures au lancement (−5 000 à +5 000). Absente : déduite des jauges (sereniteParDefaut). */
  sereniteDepart?: number;
  /** Clés des évènements déjà signalés (pour ne pas notifier deux fois). */
  signales: string[];
}

export const TIC = 10;
export const CHARGE_MAX = 200_000;
export const CARAC_MAX = 20_000;
export const SERENITE_MAX = 5_000;
/** Paliers des jauges (3.7) : jusqu'à cette charge, gain et consommation par tic. */
export const PALIERS = [
  { nom: "T1", jusqua: 80_000, debit: 10 },
  { nom: "T2", jusqua: 140_000, debit: 20 },
  { nom: "T3", jusqua: 180_000, debit: 30 },
  { nom: "T4", jusqua: 200_000, debit: 40 },
];
/** Saisie approximative : palier à moitié ou plein. */
export const CRANS = PALIERS.flatMap((p, i) => {
  const bas = i ? PALIERS[i - 1].jusqua : 0;
  return [
    { libelle: `${p.nom} ½`, charge: Math.round((bas + p.jusqua) / 2) },
    { libelle: `${p.nom} plein`, charge: p.jusqua },
  ];
});

export const NOMS_JAUGE: Record<TypeJauge, string> = {
  baffeur: "Baffeur (sérénité −)",
  caresseur: "Caresseur (sérénité +)",
  endurance: "Endurance (Foudroyeur)",
  maturite: "Maturité (Abreuvoir)",
  amour: "Amour (Dragofesse)",
  mangeoire: "Mangeoire (XP)",
};
const COURT: Record<TypeJauge, string> = { baffeur: "Baffeur", caresseur: "Caresseur", endurance: "Endurance", maturite: "Maturité", amour: "Amour", mangeoire: "XP" };

/** Ordre et couleurs des jauges comme dans l'interface du jeu (sérénité | caractéristiques | expérience). */
export const GROUPES_JAUGES: TypeJauge[][] = [["baffeur", "caresseur"], ["endurance", "maturite", "amour"], ["mangeoire"]];
export const COULEURS_JAUGE: Record<TypeJauge, string> = {
  baffeur: "#d35bdc",
  caresseur: "#d35bdc",
  endurance: "#f2c43a",
  maturite: "#3fb6e3",
  amour: "#ef6f6f",
  mangeoire: "#f4c28e",
};
export const SYMBOLES_JAUGE: Record<TypeJauge, string> = { baffeur: "−", caresseur: "+", endurance: "⚡", maturite: "💧", amour: "❤", mangeoire: "XP" };

export const debit = (charge: number) => (charge <= 0 ? 0 : (PALIERS.find((p) => charge <= p.jusqua) ?? PALIERS[3]).debit);
export const palier = (charge: number) => (charge <= 0 ? "vide" : (PALIERS.find((p) => charge <= p.jusqua) ?? PALIERS[3]).nom);
/** Charge restante d'une jauge active après un certain temps (elle se vide au rythme de son palier). */
export function chargeApres(charge: number, secondes: number) {
  let c = Math.max(0, Math.min(CHARGE_MAX, charge));
  for (let i = Math.floor(secondes / TIC); i > 0 && c > 0; i--) c = Math.max(0, c - debit(c));
  return c;
}

/** XP cumulée pour atteindre un niveau (1 à 200). */
export const xpNiveau = (n: number) => (XP as number[])[Math.min(200, Math.max(1, Math.round(n))) - 1];

/** Zone de sérénité où chaque caractéristique progresse. */
const ZONES: Partial<Record<TypeJauge, [number, number]>> = { endurance: [-SERENITE_MAX, -1], maturite: [-2000, 2000], amour: [1, SERENITE_MAX] };
/** Sérénité de départ approximative (mode simple) : milieu de la zone négative, neutre ou positive. */
export const SERENITES = [
  { nom: "Négative", valeur: -2500 },
  { nom: "Neutre", valeur: 0 },
  { nom: "Positive", valeur: 2500 },
] as const;
/** On suppose que les montures ont été mises dans la zone de la caractéristique travaillée. */
export function sereniteParDefaut(types: TypeJauge[]) {
  if (types.includes("amour")) return 2500;
  if (types.includes("endurance")) return -2500;
  return 0;
}
/** La sérénité de départ change-t-elle le résultat ? (une jauge de sérénité active : estimation) */
export const dependDeLaSerenite = (types: TypeJauge[]) => types.includes("baffeur") || types.includes("caresseur");

const dansZone = (t: TypeJauge, ser: number) => {
  const z = ZONES[t];
  return !z || (ser >= z[0] && ser <= z[1]);
};

export interface Evenement {
  /** Unique pour un minuteur donné (sert aux notifications). */
  cle: string;
  /** Secondes depuis le lancement. */
  t: number;
  type: "fin" | "zone" | "vide" | "arret";
  texte: string;
}

export interface Simulation {
  evenements: Evenement[];
  /** Instant où tout est terminé (secondes), absent si les objectifs ne peuvent pas tous être atteints. */
  fin?: number;
  /** État simulé à l'arrêt. */
  serenite: number;
  caracs: Partial<Record<TypeJauge, number>>;
}

type Simulable = Pick<MinuteurEnclos, "jauges" | "niveauDepart" | "niveauCible" | "sereniteDepart">;

export function simuler(m: Simulable): Simulation {
  const jauges = m.jauges.slice(0, 2).map((j) => ({ ...j, charge: Math.max(0, Math.min(CHARGE_MAX, j.charge)) }));
  const evenements: Evenement[] = [];
  const caracs: Partial<Record<TypeJauge, number>> = {};
  let ser = Math.max(-SERENITE_MAX, Math.min(SERENITE_MAX, Math.round(m.sereniteDepart ?? sereniteParDefaut(jauges.map((j) => j.type)))));
  const xpCible = xpNiveau(Math.max(m.niveauCible, m.niveauDepart));
  // Objectifs : 20 000 dans chaque caractéristique, le niveau visé pour la Mangeoire.
  // Sans objectif (sérénité seule), la jauge de sérénité tourne jusqu'à la borne.
  const objectifs = jauges.filter((j) => j.type !== "baffeur" && j.type !== "caresseur");
  for (const j of objectifs) caracs[j.type] = j.type === "mangeoire" ? xpNiveau(m.niveauDepart) : 0;
  const atteint = (j: JaugeEnclos) => (j.type === "mangeoire" ? (caracs.mangeoire ?? 0) >= xpCible : (caracs[j.type] ?? 0) >= CARAC_MAX);
  const progressait = new Map<TypeJauge, boolean>();

  for (let tic = 1; tic <= 50_000; tic++) {
    const t = tic * TIC;
    const serAvant = ser;
    let progres = false;
    // Débit de chaque jauge pour ce tic (selon sa charge avant consommation), puis consommation.
    const gains = new Map<TypeJauge, number>();
    for (const j of jauges) {
      const d = debit(j.charge);
      gains.set(j.type, d);
      if (!d) continue;
      j.charge = Math.max(0, j.charge - d);
      if (j.type === "baffeur" || j.type === "caresseur") {
        ser = Math.max(-SERENITE_MAX, Math.min(SERENITE_MAX, ser + (j.type === "baffeur" ? -d : d)));
        if (!j.charge) evenements.push({ cle: `vide-${j.type}`, t, type: "vide", texte: `Jauge ${COURT[j.type]} vide` });
      }
    }
    for (const j of objectifs) {
      if (atteint(j)) continue;
      const gain = gains.get(j.type) ?? 0;
      const ok = gain > 0 && dansZone(j.type, ser);
      if (ok) {
        progres = true;
        caracs[j.type] = Math.min(j.type === "mangeoire" ? xpCible : CARAC_MAX, (caracs[j.type] ?? 0) + gain);
      } else if (gain > 0 && progressait.get(j.type))
        evenements.push({
          cle: `zone-${j.type}`,
          t,
          type: "zone",
          texte: `La sérénité sort de la zone ${j.type === "endurance" ? "de l'Endurance" : j.type === "amour" ? "de l'Amour" : "de la Maturité"} : retire la jauge de sérénité`,
        });
      else if (!gain) evenements.push({ cle: `vide-${j.type}`, t, type: "vide", texte: `Jauge ${COURT[j.type]} vide avant la fin : recharge-la` });
      progressait.set(j.type, ok);
    }
    if (objectifs.length && objectifs.every(atteint)) {
      evenements.push({ cle: "fin", t, type: "fin", texte: texteFin(objectifs.map((j) => j.type), m.niveauCible) });
      return { evenements: unique(evenements), fin: t, serenite: ser, caracs };
    }
    if (!objectifs.length && (Math.abs(ser) === SERENITE_MAX || jauges.every((j) => !j.charge))) {
      evenements.push({ cle: "fin", t, type: "fin", texte: `Sérénité à ${ser > 0 ? "+" : ""}${ser}` });
      return { evenements: unique(evenements), fin: t, serenite: ser, caracs };
    }
    // Plus rien ne bouge : certains objectifs ne seront jamais atteints.
    if (!progres && ser === serAvant) {
      const manquants = objectifs.filter((j) => !atteint(j)).map((j) => COURT[j.type]);
      evenements.push({ cle: "arret", t, type: "arret", texte: `Plus rien ne progresse (${manquants.join(", ")}) : ${conseilArret(objectifs.filter((j) => !atteint(j)).map((j) => j.type), ser)}` });
      return { evenements: unique(evenements), serenite: ser, caracs };
    }
  }
  return { evenements: unique(evenements), serenite: ser, caracs };
}

const unique = (l: Evenement[]) => l.filter((e, i) => l.findIndex((x) => x.cle === e.cle) === i);

function texteFin(types: TypeJauge[], cible: number) {
  return `Enclos prêt : ${types.map((t) => (t === "mangeoire" ? `niveau ${cible}` : `${COURT[t]} 20 000`)).join(", ")}`;
}

function conseilArret(types: TypeJauge[], ser: number) {
  if (types.some((t) => !dansZone(t, ser) && t !== "mangeoire")) {
    if (types.includes("endurance") && ser >= 0) return "l'Endurance demande une sérénité négative (Baffeur)";
    if (types.includes("amour") && ser <= 0) return "l'Amour demande une sérénité positive (Caresseur)";
    return "la sérénité est hors de la zone (Maturité : entre −2 000 et +2 000)";
  }
  return "jauge vide, recharge-la";
}

/** Formate une durée en secondes : « 3 h 12 », « 45 min ». */
export function duree(s: number) {
  const min = Math.max(0, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}
