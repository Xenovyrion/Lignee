// Almanax : bonus du jour liés à l'élevage, appliqués automatiquement par Lignée.
// Source : api.dofusdu.de (données du jeu, vérifiées contre le site officiel). Seules des dates sont envoyées.
// Les jours récupérés sont gardés sur ce PC (localStorage) : Lignée fonctionne aussi hors connexion.
// Le jour de l'Almanax est celui de Paris (heure du serveur), il change à minuit heure de Paris.
import { simuler, type TypeJauge } from "./moteur/enclos";
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

/** Bonus d'un jour donné. */
export const bonusDu = (date: string, jours = joursConnus()) => jours.filter((j) => j.date === date);

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
