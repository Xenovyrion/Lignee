// Bilan de l'étable : stock de chaque couleur comparé aux besoins du plan, et enclos.
import { couleur } from "./donnees";
import type { Etape, Plan } from "./planificateur";
import type { Etat, Famille, Monture, Sauvegarde, Sexe } from "./types";

export interface BesoinCouleur {
  males: number;
  femelles: number;
  fecondes: number;
  steriles: number;
  niveauMax: number;
  /** Montures existantes (non stériles) utilisées par le plan. */
  utilisees: number;
  /** Montures existantes (non stériles) que le plan n'utilise pas. */
  libres: number;
  /** Naissances de cette couleur que le plan prévoit (pour un succès ou comme parent). */
  aProduire: number;
  /** Captures de cette couleur que le plan prévoit (générations 1). */
  aCapturer: number;
}

export function besoinsParCouleur(famille: Famille, montures: Monture[], plan: Plan): Map<string, BesoinCouleur> {
  const r = new Map<string, BesoinCouleur>();
  const de = (c: string) => {
    if (!r.has(c)) r.set(c, { males: 0, femelles: 0, fecondes: 0, steriles: 0, niveauMax: 0, utilisees: 0, libres: 0, aProduire: 0, aCapturer: 0 });
    return r.get(c)!;
  };
  for (const m of montures) {
    if (m.famille !== famille) continue;
    const b = de(m.couleur);
    b.niveauMax = Math.max(b.niveauMax, m.niveau);
    if (m.etat === "sterile") {
      b.steriles++;
      continue;
    }
    if (m.sexe === "M") b.males++;
    else b.femelles++;
    if (m.etat === "feconde") b.fecondes++;
    if (plan.reservees.has(m.id)) b.utilisees++;
    else b.libres++;
  }
  for (const e of plan.etapes) de(e.couleur).aProduire++;
  for (const [c, n] of Object.entries(plan.captures)) de(c).aCapturer += n;
  return r;
}

export const CAPACITE_ENCLOS = 10;
/** Niveaux du métier Éleveur qui débloquent chacun un enclos. */
export const PALIERS_ENCLOS = [1, 40, 80, 120, 160, 200];

export const nombreEnclos = (niveauEleveur: number) => PALIERS_ENCLOS.filter((p) => niveauEleveur >= p).length;

/** Prochain palier qui débloquera un enclos, s'il en reste. */
export const prochainPalierEnclos = (niveauEleveur: number) => PALIERS_ENCLOS.find((p) => p > niveauEleveur) ?? null;

/** Étapes du plan qui utilisent cette monture comme parent (en pratique, une au plus). */
export function roleDansLePlan(plan: Plan, idMonture: string): { indice: number; e: Etape }[] {
  return plan.etapes.flatMap((e, indice) => (e.parents.some((p) => p.type === "monture" && p.monture.id === idMonture) ? [{ indice, e }] : []));
}

export const RESSOURCE_EXTRACTION: Record<Famille, string> = {
  dragodinde: "Neurone de dragodinde",
  muldo: "Ambre de muldo",
  volkorne: "Corne de volkorne",
};

/** Ressources rendues par l'extraction : une par génération ; les générations 1 ne s'extraient pas. */
export const ressourcesExtraction = (m: Monture) => {
  const g = couleur(m.famille, m.couleur).generation;
  return g === 1 ? 0 : g;
};

/** Nombre de montures d'une couleur pour un sexe et un état donnés (saisie en mode simple). */
export const compterStock = (montures: Monture[], famille: Famille, c: string, sexe: Sexe, etat: Etat) =>
  montures.filter((m) => m.famille === famille && m.couleur === c && m.sexe === sexe && m.etat === etat).length;

/**
 * Mode simple : ajoute (delta > 0) ou retire (delta < 0) des montures d'une couleur, d'un sexe et
 * d'un état. Les retraits enlèvent d'abord les montures ajoutées le plus récemment.
 */
export function ajusterStock(s: Sauvegarde, famille: Famille, c: string, sexe: Sexe, etat: Etat, delta: number, niveau: number): Sauvegarde {
  if (delta > 0) {
    const maintenant = new Date().toISOString();
    const nouvelles: Monture[] = Array.from({ length: delta }, () => ({
      id: Math.random().toString(36).slice(2, 10),
      famille,
      couleur: c,
      sexe,
      niveau,
      etat,
      origine: couleur(famille, c).generation === 1 ? "capture" : "saisie",
      creeLe: maintenant,
    }));
    return { ...s, montures: [...s.montures, ...nouvelles] };
  }
  const candidates = s.montures
    .filter((m) => m.famille === famille && m.couleur === c && m.sexe === sexe && m.etat === etat)
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
  const retirees = new Set(candidates.slice(0, -delta).map((m) => m.id));
  return { ...s, montures: s.montures.filter((m) => !retirees.has(m.id)) };
}

/** Passe en « Féconde » `n` montures fertiles d'une couleur et d'un sexe (celles utiles au plan d'abord). */
export function rendreFecondes(s: Sauvegarde, famille: Famille, c: string, sexe: Sexe, n: number, prioritaires: Set<string> = new Set()): Sauvegarde {
  const ids = new Set(
    s.montures
      .filter((m) => m.famille === famille && m.couleur === c && m.sexe === sexe && m.etat === "fertile")
      .sort((a, b) => Number(prioritaires.has(b.id)) - Number(prioritaires.has(a.id)))
      .slice(0, n)
      .map((m) => m.id),
  );
  return { ...s, montures: s.montures.map((m) => (ids.has(m.id) ? { ...m, etat: "feconde" as const, enclos: undefined } : m)) };
}

/** Mode simple : toutes les montures prennent le niveau unique réglé dans les Paramètres. */
export const appliquerNiveauUnique = (s: Sauvegarde, niveau: number): Sauvegarde => ({ ...s, montures: s.montures.map((m) => (m.niveau === niveau ? m : { ...m, niveau })) });
