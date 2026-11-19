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
export const COURT: Record<TypeJauge, string> = { baffeur: "Baffeur", caresseur: "Caresseur", endurance: "Endurance", maturite: "Maturité", amour: "Amour", mangeoire: "XP" };
const ARTICLE: Partial<Record<TypeJauge, string>> = { endurance: "L'Endurance", maturite: "La Maturité", amour: "L'Amour", mangeoire: "L'XP" };
const nombre = (n: number) => Math.round(n).toLocaleString("fr-FR");
const signe = (n: number) => `${n > 0 ? "+" : ""}${nombre(n)}`;

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
/** Niveau atteint avec une XP cumulée donnée. */
export const niveauXp = (xp: number) => Math.max(1, (XP as number[]).filter((x) => x <= xp).length);

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
  /** Court : « Enclos prêt », « Jauge Amour vide »… */
  titre: string;
  /** Détail chiffré et action à faire. */
  texte: string;
  /** Avancement de chaque objectif à cet instant (barres du message Discord). */
  progression: { type: TypeJauge; pct: number; valeur: string }[];
  /** Sérénité à cet instant. */
  serenite: number;
}

export interface Simulation {
  evenements: Evenement[];
  /** Instant où tout est terminé (secondes), absent si les objectifs ne peuvent pas tous être atteints. */
  fin?: number;
  /** État simulé à l'arrêt. */
  serenite: number;
  caracs: Partial<Record<TypeJauge, number>>;
}

/** Période où l'Almanax double l'effet d'une jauge (ms). */
export interface PeriodeDoublee {
  type: TypeJauge;
  debut: number;
  fin: number;
}

type Simulable = Pick<MinuteurEnclos, "jauges" | "niveauDepart" | "niveauCible" | "sereniteDepart"> & {
  /** Lancement (ISO) : nécessaire pour appliquer les périodes doublées. */
  debut?: string;
  /** Jours d'Almanax où l'effet d'une jauge est doublé (le gain double, la consommation de la jauge reste la même). */
  doubles?: PeriodeDoublee[];
};

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
  /** Caractéristiques déjà signalées (jauge vide, sortie de zone) : pas de second message pour la même cause. */
  const signalees = new Set<TypeJauge>();
  const sereniteActive = jauges.find((j) => j.type === "baffeur" || j.type === "caresseur");
  const etat = (j: JaugeEnclos) =>
    j.type === "mangeoire" ? `Niveau ${niveauXp(caracs.mangeoire ?? 0)} sur ${m.niveauCible} visé` : `${COURT[j.type]} à ${nombre(caracs[j.type] ?? 0)} / ${nombre(CARAC_MAX)}`;
  const xpDepart = xpNiveau(m.niveauDepart);
  const pct = (j: JaugeEnclos) => {
    const c = caracs[j.type] ?? 0;
    const p = j.type === "mangeoire" ? (xpCible > xpDepart ? (c - xpDepart) / (xpCible - xpDepart) : 1) : c / CARAC_MAX;
    return Math.max(0, Math.min(100, Math.floor(p * 100)));
  };
  const t0 = m.debut ? Date.parse(m.debut) : NaN;
  const doubles = Number.isFinite(t0) ? (m.doubles ?? []) : [];
  /** Multiplicateur de gain d'une jauge pour le tic qui commence à t secondes. */
  const facteur = (type: TypeJauge, t: number) => {
    if (!doubles.length) return 1;
    const ms = t0 + t * 1000;
    return doubles.some((p) => p.type === type && ms >= p.debut && ms < p.fin) ? 2 : 1;
  };
  const ajouter = (e: Omit<Evenement, "progression" | "serenite">) =>
    evenements.push({
      ...e,
      serenite: ser,
      progression: objectifs.map((j) => ({
        type: j.type,
        pct: pct(j),
        valeur: j.type === "mangeoire" ? `niv. ${niveauXp(caracs.mangeoire ?? 0)} / ${m.niveauCible}` : `${nombre(caracs[j.type] ?? 0)} / ${nombre(CARAC_MAX)}`,
      })),
    });

  for (let tic = 1; tic <= 50_000; tic++) {
    const t = tic * TIC;
    const serAvant = ser;
    let progres = false;
    // Débit de chaque jauge pour ce tic (selon sa charge avant consommation), puis consommation.
    const gains = new Map<TypeJauge, number>();
    for (const j of jauges) {
      const d = debit(j.charge);
      const g = d * facteur(j.type, t - TIC);
      gains.set(j.type, g);
      if (!d) continue;
      j.charge = Math.max(0, j.charge - d);
      if (j.type === "baffeur" || j.type === "caresseur") {
        ser = Math.max(-SERENITE_MAX, Math.min(SERENITE_MAX, ser + (j.type === "baffeur" ? -g : g)));
        // Sans caractéristique à monter, la fin du minuteur le dit déjà.
        if (!j.charge && objectifs.length)
          ajouter({ cle: `vide-${j.type}`, t, type: "vide", titre: `Jauge ${COURT[j.type]} vide`, texte: `Sérénité à ${signe(ser)}. Recharge-la si une caractéristique en a encore besoin.` });
      }
    }
    for (const j of objectifs) {
      if (atteint(j)) continue;
      const gain = gains.get(j.type) ?? 0;
      const ok = gain > 0 && dansZone(j.type, ser);
      if (ok) {
        progres = true;
        caracs[j.type] = Math.min(j.type === "mangeoire" ? xpCible : CARAC_MAX, (caracs[j.type] ?? 0) + gain);
      } else if (!gain) {
        signalees.add(j.type);
        ajouter({ cle: `vide-${j.type}`, t, type: "vide", titre: `Jauge ${COURT[j.type]} vide`, texte: `${etat(j)}. Recharge la jauge pour finir.` });
      } else if (progressait.get(j.type)) {
        signalees.add(j.type);
        ajouter({
          cle: `zone-${j.type}`,
          t,
          type: "zone",
          titre: "Sérénité hors zone",
          texte: `${ARTICLE[j.type]} s'arrête à ${nombre(caracs[j.type] ?? 0)} / ${nombre(CARAC_MAX)} (sérénité ${signe(ser)}).${sereniteActive ? ` Retire le ${COURT[sereniteActive.type]}.` : ""}`,
        });
      }
      progressait.set(j.type, ok);
    }
    if (objectifs.length && objectifs.every(atteint)) {
      const texte = objectifs.map((j) => (j.type === "mangeoire" ? `Niveau ${m.niveauCible} atteint` : `${COURT[j.type]} ${nombre(CARAC_MAX)} / ${nombre(CARAC_MAX)}`)).join(" · ");
      ajouter({ cle: "fin", t, type: "fin", titre: "Enclos prêt", texte });
      return { evenements: unique(evenements), fin: t, serenite: ser, caracs };
    }
    if (!objectifs.length && (Math.abs(ser) === SERENITE_MAX || jauges.every((j) => !j.charge))) {
      const borne = Math.abs(ser) === SERENITE_MAX;
      ajouter({ cle: "fin", t, type: "fin", titre: borne ? "Sérénité au maximum" : "Jauge de sérénité vide", texte: `Sérénité à ${signe(ser)} (bornes : ±${nombre(SERENITE_MAX)}).` });
      return { evenements: unique(evenements), fin: t, serenite: ser, caracs };
    }
    // Plus rien ne bouge : certains objectifs ne seront jamais atteints. Message seulement si la cause n'a pas déjà été dite.
    if (!progres && ser === serAvant) {
      const bloques = objectifs.filter((j) => !atteint(j) && !signalees.has(j.type)).map((j) => j.type);
      if (bloques.length)
        ajouter({
          cle: "arret",
          t,
          type: "arret",
          titre: `${bloques.map((x) => ARTICLE[x]).join(" et ")} ne progresse${bloques.length > 1 ? "nt" : ""} pas`,
          texte: conseil(bloques, ser),
        });
      return { evenements: unique(evenements), serenite: ser, caracs };
    }
  }
  return { evenements: unique(evenements), serenite: ser, caracs };
}

function conseil(types: TypeJauge[], ser: number) {
  if (types.includes("endurance") && ser >= 0)
    return "Il faut une sérénité négative : active le Baffeur, ou mets la sérénité de départ sur « Négative » si tes montures y sont déjà.";
  if (types.includes("amour") && ser <= 0)
    return "Il faut une sérénité positive : active le Caresseur, ou mets la sérénité de départ sur « Positive » si tes montures y sont déjà.";
  if (types.includes("maturite"))
    return "Il faut une sérénité entre −2 000 et +2 000 : mets la sérénité de départ sur « Neutre » si tes montures y sont, sinon ramène-la avec le Baffeur ou le Caresseur.";
  return "Vérifie que la jauge est remplie.";
}

const unique = (l: Evenement[]) => l.filter((e, i) => l.findIndex((x) => x.cle === e.cle) === i);

/** Formate une durée en secondes : « 3 h 12 », « 45 min ». */
export function duree(s: number) {
  const min = Math.max(0, Math.round(s / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}
