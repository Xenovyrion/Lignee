// Almanax : bonus du jour liés à l'élevage, appliqués automatiquement par Lignée.
// Source : api.dofusdu.de (données du jeu, vérifiées contre le site officiel). Seules des dates sont envoyées.
// Les jours récupérés sont gardés sur ce PC (localStorage) : Lignée fonctionne aussi hors connexion.
// Le jour de l'Almanax est celui de Paris (heure du serveur), il change à minuit heure de Paris.
import { COURT, simuler, type TypeJauge } from "./moteur/enclos";
import type { Capacite } from "./moteur/types";

const CLE = "lignee-almanax";
const JOURS_A_RECUPERER = 45;
const API = "https://api.dofusdu.de/dofus3/v1/fr/almanax";

export interface JourAlmanax {
  date: string; // AAAA-MM-JJ (Paris)
  id: string; // type de bonus de l'API
  nom: string;
  description: string;
}

/** Ce que le bonus change dans Lignée. */
export interface EffetAlmanax {
  /** +20 % de chance d'obtenir la génération cible. */
  generation?: boolean;
  /** Jauge d'enclos dont l'effet est doublé. */
  jauge?: TypeJauge;
  /** Capacité donnée aux bébés nés ce jour. */
  capacite?: Capacite;
}

/** Bonus en rapport avec l'élevage (les autres sont ignorés). */
export const concerneElevage = (description: string) => /montures?\b|enclos|[ÉE]leveurs?|accouplement|dragodinde|muldo|volkorne/i.test(description);

const JAUGES: [RegExp, TypeJauge][] = [
  [/foudroyeur/i, "endurance"],
  [/abreuvoir/i, "maturite"],
  [/dragofesse/i, "amour"],
  [/mangeoire/i, "mangeoire"],
  [/baffeur/i, "baffeur"],
  [/caresseur/i, "caresseur"],
];
const CAPACITES: [RegExp, Capacite][] = [
  [/capacit[ée] Amoureuse/i, "amoureuse"],
  [/capacit[ée] Sage/i, "sage"],
  [/capacit[ée] Pr[ée]coce/i, "precoce"],
  [/capacit[ée] Endurante/i, "endurante"],
  [/capacit[ée] Reproductr/i, "reproducteur"],
  [/capacit[ée] Cam[ée]l[ée]on/i, "cameleone"],
];

export function effet(j: Pick<JourAlmanax, "id" | "description">): EffetAlmanax {
  const d = j.description;
  if (j.id === "growing-generation" || /chances d'obtenir la g[ée]n[ée]ration cible/i.test(d)) return { generation: true };
  if (/enclos/i.test(d) && /doubl/i.test(d)) {
    const jauge = JAUGES.find(([r]) => r.test(d))?.[1];
    if (jauge) return { jauge };
  }
  const capacite = /naissent ce jour/i.test(d) ? CAPACITES.find(([r]) => r.test(d))?.[1] : undefined;
  return capacite ? { capacite } : {};
}

/** Ce que Lignée fait du bonus, pour le bandeau. */
export function impact(e: EffetAlmanax) {
  if (e.generation) return "Chances et conseils d'accouplement calculés avec ce bonus.";
  if (e.jauge) return "Minuteurs d'enclos calculés avec cette jauge doublée.";
  if (e.capacite) return "Capacité ajoutée aux bébés que tu enregistres aujourd'hui.";
  return "";
}

/** Date du jour à Paris (AAAA-MM-JJ). */
export const dateParis = (ms = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(ms);

/** Minuit (heure de Paris) au début d'une date AAAA-MM-JJ, en ms. */
export function minuitParis(date: string) {
  const [a, m, j] = date.split("-").map(Number);
  const utc = Date.UTC(a, m - 1, j);
  const heure = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(utc));
  return utc - heure * 3600_000;
}

export const jourSuivant = (date: string) => dateParis(minuitParis(date) + 36 * 3600_000);

interface Cache {
  recupere: string;
  jours: JourAlmanax[];
}

function lireCache(): Cache | null {
  try {
    return JSON.parse(localStorage.getItem(CLE) ?? "null");
  } catch {
    return null;
  }
}

/** Jours d'Almanax liés à l'élevage connus sur ce PC. */
export const joursConnus = (): JourAlmanax[] => lireCache()?.jours ?? [];

/** Récupère les prochains jours (au plus une fois par jour). Renvoie true si de nouvelles données sont arrivées. */
export async function rafraichirAlmanax(forcer = false): Promise<boolean> {
  const aujourdhui = dateParis();
  const cache = lireCache();
  if (!forcer && cache?.recupere === aujourdhui) return false;
  const r = await fetch(`${API}?${new URLSearchParams({ "range[from]": aujourdhui, "range[size]": String(JOURS_A_RECUPERER) })}`);
  if (!r.ok) throw new Error(`Almanax indisponible (${r.status})`);
  const l = (await r.json()) as { date: string; bonus: { description: string; type: { id: string; name: string } } }[];
  const jours = l
    .filter((x) => concerneElevage(x.bonus.description))
    .map((x) => ({ date: x.date, id: x.bonus.type.id, nom: x.bonus.type.name, description: x.bonus.description }));
  // On garde aussi les jours passés récents : un minuteur lancé hier peut encore en dépendre.
  const anciens = (cache?.jours ?? []).filter((j) => j.date < aujourdhui && j.date >= dateParis(Date.now() - 3 * 86400_000));
  try {
    localStorage.setItem(CLE, JSON.stringify({ recupere: aujourdhui, jours: [...anciens, ...jours] }));
  } catch {
    /* stockage indisponible */
  }
  return true;
}

/** Bonus d'un jour donné qui changent quelque chose dans Lignée (les autres, ex. économie d'ingrédients, sont ignorés). */
export const bonusDu = (date: string, jours = joursConnus()) => jours.filter((j) => j.date === date && Object.keys(effet(j)).length);

/** Périodes où une jauge d'enclos est doublée (ms, heure de Paris), pour les minuteurs. */
export function periodesDoublees(jours = joursConnus()) {
  return jours.flatMap((j) => {
    const e = effet(j);
    return e.jauge ? [{ type: e.jauge, debut: minuitParis(j.date), fin: minuitParis(jourSuivant(j.date)) }] : [];
  });
}

/** Simulation d'enclos avec les jauges doublées par l'Almanax. */
export const simulerAlmanax = (m: Parameters<typeof simuler>[0]) => simuler({ ...m, doubles: periodesDoublees() });

/** Capacité que l'Almanax donne aux bébés nés aujourd'hui, s'il y en a une. */
export const capaciteDuJour = () => bonusDu(dateParis()).map(effet).find((e) => e.capacite)?.capacite;

/** Prochains bonus qui changent quelque chose dans Lignée, aujourd'hui compris, dans l'ordre. */
export const prochainsBonus = (jours = joursConnus(), aujourdhui = dateParis()) =>
  jours.filter((j) => j.date >= aujourdhui && Object.keys(effet(j)).length).sort((a, b) => a.date.localeCompare(b.date));

/** Jour et heure courts : « jeu. 10 déc. à 03:20 ». */
const quand = (ms: number) =>
  `${new Date(ms).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} à ${new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

/**
 * Conseil de lancement quand une jauge de l'enclos sera doublée dans les 36 prochaines heures :
 * attendre le début du jour d'Almanax, ou lancer tout de suite. Rien si aucun bonus proche ou s'il a déjà commencé.
 */
export function conseilLancement(
  m: Omit<Parameters<typeof simuler>[0], "debut" | "doubles">,
  maintenant = Date.now(),
  jours = joursConnus(),
): { attendre: boolean; texte: string } | null {
  const types = m.jauges.map((j) => j.type);
  const doubles = periodesDoublees(jours);
  const p = doubles
    .filter((x) => types.includes(x.type) && x.fin > maintenant && x.debut < maintenant + 36 * 3600_000)
    .sort((a, b) => a.debut - b.debut)[0];
  if (!p || p.debut <= maintenant) return null;
  const finA = (debut: number) => {
    const f = simuler({ ...m, debut: new Date(debut).toISOString(), doubles }).fin;
    return f === undefined ? undefined : debut + f * 1000;
  };
  const maint = finA(maintenant);
  const attente = finA(p.debut);
  const bonus = `${COURT[p.type]} doublé par l'Almanax à partir du ${quand(p.debut)}`;
  if (attente !== undefined && (maint === undefined || attente < maint))
    return {
      attendre: true,
      texte: `Attends le ${quand(p.debut)} pour lancer (${COURT[p.type]} doublé par l'Almanax) : prêt le ${quand(attente)}${maint === undefined ? ", alors que lancé maintenant cette charge ne suffit pas." : ` au lieu du ${quand(maint)}.`}`,
    };
  if (maint !== undefined && maint <= p.debut)
    return {
      attendre: false,
      texte: `${bonus}. Lancé maintenant, tout est fini avant. En lançant à ce moment-là, tu serais prêt le ${quand(attente ?? p.debut)} en consommant moins de jauge.`,
    };
  return { attendre: false, texte: `${bonus} : déjà compté dans l'heure de fin, tu peux lancer maintenant.` };
}

/** Rappels Discord de la veille (20 h, heure de Paris) pour les bonus d'élevage des 7 prochains jours. */
export function rappelsAlmanax(maintenant = Date.now(), jours = joursConnus()) {
  return prochainsBonus(jours, dateParis(maintenant))
    .map((j) => ({ j, e: effet(j), at: minuitParis(j.date) - 4 * 3600_000 }))
    .filter(({ e, at }) => Object.keys(e).length && at > maintenant && at < maintenant + 7 * 86400_000)
    .slice(0, 10)
    .map(({ j, e, at }) => ({
      at,
      message: `Almanax de demain : ${j.description}`,
      type: "almanax",
      titre: `Demain : ${j.nom}`,
      texte: `${j.description}${e.generation ? " Garde tes accouplements importants pour demain." : e.jauge ? " Prépare tes jauges : Lignée comptera ce doublement dans tes minuteurs." : ""}`,
      pied: "Almanax · Lignée",
    }));
}
