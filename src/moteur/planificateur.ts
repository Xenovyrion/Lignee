// Planificateur : à partir de l'étable et des succès déjà obtenus, calcule la suite d'accouplements
// et de captures qui fait naître toutes les couleurs manquantes d'une famille.
//
// Hypothèses (le plan est recalculé après chaque naissance, ce qui corrige les écarts) :
// - chaque accouplement atteint sa génération cible (Optimakina + niveaux suffisants → 100 %) ;
// - un bébé planifié peut être du sexe voulu (Animakina) ;
// - chaque parent utilisé devient stérile ; deux stériles de même couleur sont clonés en une
//   monture fertile de cette couleur (résultat certain). Les clonages entre couleurs différentes
//   (50/50) ne sont pas comptés : ils sont seulement proposés (suggererClonages).
import { couleur, objectifs } from "./donnees";
import { clonables, peutSAccoupler } from "./regles";
import type { Famille, Monture, Sexe } from "./types";

/** Une monture stérile : existante dans l'étable, ou parent d'une étape planifiée. */
export type Sterile = { monture: Monture } | { apresEtape: number };

export type Source =
  | { type: "monture"; monture: Monture }
  | { type: "naissance"; etape: number }
  | { type: "capture"; couleur: string; sexe?: Sexe }
  | { type: "clone"; couleur: string; steriles: [Sterile, Sterile] };

export interface Etape {
  couleur: string;
  generation: number;
  recette: [string, string];
  /** "succes" : couleur manquante pour un succès. "intermediaire" : sert de parent plus loin. */
  pour: "succes" | "intermediaire";
  parents: [Source, Source];
  /** Sexe souhaité pour le bébé, quand un accouplement suivant en dépend. */
  sexeVoulu?: Sexe;
  /** Les deux parents existants sont du même sexe : il faudra un autre géniteur. */
  alerteSexe?: boolean;
}

export interface Plan {
  famille: Famille;
  etapes: Etape[];
  /** Captures de génération 1 à prévoir, par couleur. */
  captures: Record<string, number>;
  /** Indices des étapes réalisables tout de suite (deux parents existants, de sexes opposés). */
  immediates: number[];
  /** Clonages de stériles de même couleur prévus par le plan. */
  clonages: number;
  /** Montures de l'étable utilisées par le plan (à ne pas sacrifier). */
  reservees: Set<string>;
  /**
   * Importance de chaque étape : coût de reconstruction de ses parents en cas d'échec
   * (naissances et captures en amont) + nombre d'étapes qui en dépendent.
   */
  importance: number[];
  /** Objectif prioritaire : la couleur visée, l'étape qui la fait naître (null si déjà en étable) et son chemin. */
  cible?: { couleur: string; etape: number | null; gardee?: Monture };
  /** Étapes du chemin vers l'objectif prioritaire (passent avant le reste). */
  prioritaires: Set<number>;
}

const autreSexe = (s: Sexe): Sexe => (s === "M" ? "F" : "M");

/** Priorité du plan : finir au plus tôt, ou faire le moins d'actions possible. */
export type PrioritePlan = "rapide" | "equilibre" | "econome";
/**
 * Arbitrage temps / effort : une action de plus (capture ou naissance) n'est ajoutée au plan que si
 * elle fait gagner plus de ce nombre de séances.
 */
export const POIDS_EFFORT: Record<PrioritePlan, number> = { rapide: 1, equilibre: 4, econome: 1e6 };

export function planifier(famille: Famille, montures: Monture[], obtenues: Iterable<string>, cible?: string | null, priorite: PrioritePlan = "equilibre"): Plan {
  const poids = POIDS_EFFORT[priorite];
  const dejaObtenues = new Set(obtenues);
  // Objectif prioritaire : une monture de cette couleur est gardée (jamais utilisée comme parent),
  // de préférence une stérile (inutile à l'élevage), sinon la plus haut niveau.
  const valide = !!cible && couleur(famille, cible).generation > 1;
  const gardee = valide
    ? montures
        .filter((m) => m.famille === famille && m.couleur === cible)
        .sort((a, b) => Number(b.etat === "sterile") - Number(a.etat === "sterile") || b.niveau - a.niveau)[0]
    : undefined;
  if (gardee) montures = montures.filter((m) => m !== gardee);
  const stock = new Map<string, Monture[]>();
  for (const m of montures) {
    if (m.famille !== famille || !peutSAccoupler(m)) continue;
    if (!stock.has(m.couleur)) stock.set(m.couleur, []);
    stock.get(m.couleur)!.push(m);
  }
  // Priorité aux montures déjà fécondes, puis aux plus hauts niveaux.
  for (const l of stock.values()) l.sort((a, b) => Number(b.etat === "feconde") - Number(a.etat === "feconde") || b.niveau - a.niveau);

  const virtuels = new Map<string, number[]>(); // couleur -> étapes dont le bébé est encore libre
  const steriles = new Map<string, Sterile[]>(); // couleur -> stériles disponibles pour un clonage
  const ajouterSterile = (c: string, st: Sterile) => {
    if (!steriles.has(c)) steriles.set(c, []);
    steriles.get(c)!.push(st);
  };
  for (const m of montures) if (m.famille === famille && m.etat === "sterile") ajouterSterile(m.couleur, { monture: m });
  const etapes: Etape[] = [];
  const captures: Record<string, number> = {};
  const reservees = new Set<string>();
  let clonages = 0;
  let memo = new Map<string, number>();
  let memoT = new Map<string, number>();
  const oublier = () => {
    memo = new Map();
    memoT = new Map();
  };
  /** Séance où chaque étape est faisable (1 = maintenant), comme seancesDesEtapes. */
  const seanceEtape: number[] = [];
  /** Séance à partir de laquelle un stérile (existant ou à venir) peut être cloné. */
  const pretSterile = (st: Sterile) => ("monture" in st ? 1 : seanceEtape[st.apresEtape] + 1);
  /** Séance à partir de laquelle une source est utilisable comme parent. */
  const pretSource = (s: Source): number =>
    s.type === "naissance" ? seanceEtape[s.etape] + 1 : s.type === "clone" ? Math.max(...s.steriles.map(pretSterile)) : 1;

  const disponible = (c: string) =>
    (stock.get(c)?.length ?? 0) + (virtuels.get(c)?.length ?? 0) + Math.floor((steriles.get(c)?.length ?? 0) / 2);

  /** Les deux stériles d'une couleur clonables le plus tôt (existants d'abord). */
  const meilleurePaire = (c: string): [number, number] | null => {
    const st = steriles.get(c);
    if (!st || st.length < 2) return null;
    const ordre = st.map((x, i) => ({ i, t: pretSterile(x) })).sort((a, b) => a.t - b.t);
    return [ordre[0].i, ordre[1].i];
  };
  const pretPaire = (c: string) => {
    const p = meilleurePaire(c);
    return p ? Math.max(...p.map((i) => pretSterile(steriles.get(c)![i]))) : Infinity;
  };
  /** Bébé à naître de cette couleur disponible le plus tôt (compatible avec le sexe voulu). */
  const meilleurVirtuel = (c: string, sexe?: Sexe): number => {
    const v = virtuels.get(c) ?? [];
    let k = -1;
    v.forEach((e, i) => {
      if (sexe && etapes[e].sexeVoulu && etapes[e].sexeVoulu !== sexe) return;
      if (k < 0 || seanceEtape[e] < seanceEtape[v[k]]) k = i;
    });
    return k;
  };

  /**
   * Séance la plus proche où une monture de cette couleur peut être disponible : existante ou capture
   * (1), bébé déjà prévu, clone, ou nouvelle naissance (1 + la séance de ses parents).
   */
  function temps(c: string): number {
    if (stock.get(c)?.length || couleur(famille, c).generation === 1) return 1;
    const deja = memoT.get(c);
    if (deja !== undefined) return deja;
    memoT.set(c, Infinity); // garde-fou contre une boucle
    const v = virtuels.get(c) ?? [];
    const sansEffort = Math.min(pretPaire(c), ...v.map((e) => seanceEtape[e] + 1));
    const tN = tempsNaissance(c);
    const t = tN + poids * coutNeuf(c) < sansEffort ? tN : sansEffort;
    memoT.set(c, t);
    return t;
  }
  /** Actions (naissances + captures) d'une monture de plus de cette couleur, en partant de zéro. */
  const coutNeuf = (c: string) => {
    const col = couleur(famille, c);
    return col.generation === 1 ? 1 : 1 + Math.min(...col.recettes.map(([a, b]) => cout(a) + cout(b)));
  };
  /** Séance où un nouveau bébé de cette couleur serait disponible (meilleure recette). */
  const tempsNaissance = (c: string) => 1 + Math.min(...couleur(famille, c).recettes.map(([a, b]) => Math.max(temps(a), temps(b))));

  /** Nombre d'actions (naissances + captures) pour disposer d'une monture de cette couleur. */
  function cout(c: string): number {
    if (disponible(c) > 0) return 0;
    const deja = memo.get(c);
    if (deja !== undefined) return deja;
    const col = couleur(famille, c);
    const v = col.generation === 1 ? 1 : 1 + Math.min(...col.recettes.map(([a, b]) => cout(a) + cout(b)));
    memo.set(c, v);
    return v;
  }

  /**
   * Source d'une monture de couleur `c`. `sexe` : sexe souhaité ; avec `strict`, une monture
   * existante ou un bébé déjà promis à l'autre sexe ne convient pas (on passe à la source suivante).
   */
  function prendre(c: string, sexe?: Sexe, strict = false): Source {
    const reelles = stock.get(c);
    // Temps d'abord : un bébé déjà prévu ou un clone qui n'arrive que dans plusieurs séances est
    // remplacé par une source plus rapide (capture, nouvelle naissance en parallèle) quand elle existe.
    if (!reelles?.length) {
      const k = meilleurVirtuel(c, strict ? sexe : undefined);
      const tVirtuel = k >= 0 ? seanceEtape[virtuels.get(c)![k]] + 1 : Infinity;
      const tClone = pretPaire(c);
      const tNeuf = couleur(famille, c).generation === 1 ? 1 : tempsNaissance(c);
      // Une séance gagnée doit valoir l'effort ajouté (captures, naissances en plus).
      if (tNeuf + poids * coutNeuf(c) < Math.min(tVirtuel, tClone)) return neuf(c, sexe);
      if (tClone < tVirtuel) return cloner(c);
    }
    if (reelles?.length) {
      // Sans sexe imposé, prendre dans le sexe le plus nombreux pour garder des couples possibles.
      const males = reelles.filter((m) => m.sexe === "M").length;
      const voulu = sexe ?? (males * 2 > reelles.length ? "M" : males * 2 < reelles.length ? "F" : undefined);
      let i = voulu ? reelles.findIndex((m) => m.sexe === voulu) : 0;
      if (i < 0 && !(strict && sexe)) i = 0;
      if (i >= 0) {
        const [m] = reelles.splice(i, 1);
        reservees.add(m.id);
        oublier();
        return { type: "monture", monture: m };
      }
    }
    const v = virtuels.get(c);
    if (v?.length) {
      let k = meilleurVirtuel(c, sexe);
      if (k < 0 && !(strict && sexe)) k = meilleurVirtuel(c);
      if (k >= 0) {
        const [e] = v.splice(k, 1);
        if (sexe && !etapes[e].sexeVoulu) etapes[e].sexeVoulu = sexe;
        oublier();
        return { type: "naissance", etape: e };
      }
    }
    if (meilleurePaire(c)) return cloner(c);
    return neuf(c, sexe);
  }

  /** Clone les deux stériles de cette couleur disponibles le plus tôt. */
  function cloner(c: string): Source {
    const st = steriles.get(c)!;
    const [i, j] = meilleurePaire(c)!;
    const paire = [st[i], st[j]] as [Sterile, Sterile];
    steriles.set(c, st.filter((_, k) => k !== i && k !== j));
    for (const x of paire) if ("monture" in x) reservees.add(x.monture.id);
    clonages++;
    oublier();
    return { type: "clone", couleur: c, steriles: paire };
  }

  /** Nouvelle monture : capture en génération 1, sinon une naissance de plus dans le plan. */
  function neuf(c: string, sexe?: Sexe): Source {
    if (couleur(famille, c).generation === 1) {
      captures[c] = (captures[c] ?? 0) + 1;
      return { type: "capture", couleur: c, sexe };
    }
    const e = produire(c, "intermediaire");
    if (sexe) etapes[e].sexeVoulu = sexe;
    return { type: "naissance", etape: e };
  }

  /** Sexe connu ou déjà décidé d'une source. Un clone garde le sexe de ses stériles : connu s'ils sont du même sexe. */
  const sexeDe = (s: Source): Sexe | undefined => {
    if (s.type === "monture") return s.monture.sexe;
    if (s.type === "naissance") return etapes[s.etape].sexeVoulu;
    if (s.type === "capture") return s.sexe;
    const [x, y] = s.steriles;
    return "monture" in x && "monture" in y && x.monture.sexe === y.monture.sexe ? x.monture.sexe : undefined;
  };
  /** Décide le sexe d'une source encore libre (bébé à naître ou capture). */
  const fixerSexe = (s: Source, sexe: Sexe) => {
    if (s.type === "naissance" && !etapes[s.etape].sexeVoulu) etapes[s.etape].sexeVoulu = sexe;
    if (s.type === "capture" && !s.sexe) s.sexe = sexe;
  };

  function produire(c: string, pour: Etape["pour"]): number {
    const col = couleur(famille, c);
    let recette = col.recettes[0];
    let meilleur = [Infinity, Infinity];
    for (const r of col.recettes) {
      const c0 = cout(r[0]) + cout(r[1]);
      const k = [Math.max(temps(r[0]), temps(r[1])) + poids * c0, c0];
      if (k[0] < meilleur[0] || (k[0] === meilleur[0] && k[1] < meilleur[1])) [meilleur, recette] = [k, r];
    }
    // Si les deux parents existent dans l'étable, choisir le sexe du premier pour que le second
    // ait une monture du sexe opposé disponible, en préférant le couple déjà fécond (prêt tout de suite)
    // à un couple encore à préparer.
    const a0 = stock.get(recette[0]) ?? [];
    const b0 = stock.get(recette[1]) ?? [];
    const couple = (sx: Sexe) => {
      const pa = a0.filter((m) => m.sexe === sx);
      const pb = b0.filter((m) => m.sexe === autreSexe(sx));
      if (!pa.length || !pb.length) return -1;
      return Number(pa.some((m) => m.etat === "feconde")) + Number(pb.some((m) => m.etat === "feconde"));
    };
    const [cm, cf] = [couple("M"), couple("F")];
    const sexeA: Sexe | undefined = cm < 0 && cf < 0 ? undefined : cf > cm ? "F" : "M";
    const a = prendre(recette[0], sexeA);
    // Le second parent doit être de l'autre sexe : jamais deux mâles ou deux femelles.
    if (!sexeDe(a) && a.type !== "clone") fixerSexe(a, sexeA ?? "M");
    const sxA = sexeDe(a);
    const b = prendre(recette[1], sxA ? autreSexe(sxA) : undefined, true);
    const sxB = sexeDe(b);
    if (!sxA && sxB) fixerSexe(a, autreSexe(sxB));
    else if (sxA) fixerSexe(b, autreSexe(sxA));
    const alerteSexe = a.type === "monture" && b.type === "monture" && a.monture.sexe === b.monture.sexe;
    etapes.push({ couleur: c, generation: col.generation, recette, pour, parents: [a, b], alerteSexe });
    const i = etapes.length - 1;
    seanceEtape[i] = Math.max(pretSource(a), pretSource(b));
    oublier();
    // Après l'accouplement, les deux parents sont stériles et peuvent être clonés plus tard.
    ajouterSterile(recette[0], { apresEtape: i });
    ajouterSterile(recette[1], { apresEtape: i });
    return i;
  }

  // Les couleurs manquantes, de la plus basse génération à la plus haute (chaque bébé obtenu pour
  // un succès reste disponible comme parent des générations suivantes) et, dans une génération,
  // la moins coûteuse d'abord pour ne pas lui prendre les montures existantes qu'elle utilise.
  const restants = objectifs(famille).filter((c) => !dejaObtenues.has(c.id));
  // L'objectif prioritaire passe avant tout : il prend les montures existantes en premier, et son bébé
  // est gardé (pas remis comme parent disponible pour la suite).
  let etapeCible: number | null = null;
  if (valide && !gardee) {
    const k = restants.findIndex((c) => c.id === cible);
    if (k >= 0) restants.splice(k, 1);
    etapeCible = produire(cible!, k >= 0 ? "succes" : "intermediaire");
  }
  while (restants.length) {
    const gen = restants[0].generation;
    let iMin = 0;
    let coutMin = Infinity;
    restants.forEach((col, i) => {
      if (col.generation !== gen) return;
      const k = Math.min(...col.recettes.map(([a, b]) => cout(a) + cout(b)));
      if (k < coutMin) [coutMin, iMin] = [k, i];
    });
    const [{ id: c }] = restants.splice(iMin, 1);
    const e = produire(c, "succes");
    if (!virtuels.has(c)) virtuels.set(c, []);
    virtuels.get(c)!.push(e);
  }

  // Réaffectation par niveau : pour chaque couleur et sexe, les montures existantes de plus haut
  // niveau vont aux étapes les plus importantes (un échec en G8 coûte bien plus cher qu'en G2).
  const importance = calculerImportance(etapes);
  const emplacements = new Map<string, { etape: number; cote: 0 | 1 }[]>();
  etapes.forEach((e, i) =>
    e.parents.forEach((p, cote) => {
      if (p.type !== "monture") return;
      const cle = `${p.monture.couleur}/${p.monture.sexe}`;
      if (!emplacements.has(cle)) emplacements.set(cle, []);
      emplacements.get(cle)!.push({ etape: i, cote: cote as 0 | 1 });
    }),
  );
  for (const [cle, places] of emplacements) {
    const candidates = montures
      .filter((m) => m.famille === famille && peutSAccoupler(m) && `${m.couleur}/${m.sexe}` === cle)
      .sort((a, b) => b.niveau - a.niveau || Number(b.etat === "feconde") - Number(a.etat === "feconde"));
    places.sort((x, y) => importance[y.etape] - importance[x.etape] || x.etape - y.etape);
    // À niveau égal, les montures déjà fécondes vont aux accouplements faisables tout de suite
    // (l'autre parent existe aussi), pas à une étape lointaine.
    const faisable = (p: { etape: number }) => etapes[p.etape].parents.every((x) => x.type === "monture");
    for (let debut = 0; debut < places.length; ) {
      let fin = debut;
      while (fin < places.length && candidates[fin].niveau === candidates[debut].niveau) fin++;
      const tranche = places.slice(debut, fin).sort((x, y) => Number(faisable(y)) - Number(faisable(x)));
      places.splice(debut, tranche.length, ...tranche);
      debut = fin;
    }
    places.forEach(({ etape, cote }, k) => {
      const ancienne = etapes[etape].parents[cote] as { monture: Monture };
      reservees.delete(ancienne.monture.id);
      etapes[etape].parents[cote] = { type: "monture", monture: candidates[k] };
    });
    places.forEach((_, k) => reservees.add(candidates[k].id));
  }

  // Rééquilibrage des sexes : une étape dont les deux parents existants sont du même sexe échange
  // l'un d'eux avec une monture de même couleur et de sexe opposé réservée par une autre étape, si
  // l'autre parent de cette étape-là s'en accommode (monture de sexe opposé, clone, capture, ou
  // bébé dont le sexe n'est pas encore imposé).
  const accepte = (src: Source, sexe: Sexe) => sexeDe(src) !== sexe;
  etapes.forEach((e, i) => {
    if (!e.alerteSexe) return;
    const sexe = (e.parents[0] as { monture: Monture }).monture.sexe;
    for (const cote of [0, 1] as const) {
      const x = (e.parents[cote] as { monture: Monture }).monture;
      for (let j = 0; j < etapes.length && e.alerteSexe; j++) {
        if (j === i) continue;
        for (const coteJ of [0, 1] as const) {
          const y = etapes[j].parents[coteJ];
          const autre = etapes[j].parents[1 - coteJ];
          if (y.type !== "monture" || y.monture.couleur !== x.couleur || y.monture.sexe === sexe || !accepte(autre, sexe)) continue;
          etapes[j].parents[coteJ] = { type: "monture", monture: x };
          e.parents[cote] = y;
          if (autre.type === "naissance") etapes[autre.etape].sexeVoulu = autreSexe(sexe);
          if (autre.type === "capture") autre.sexe = autreSexe(sexe);
          e.alerteSexe = false;
          break;
        }
      }
      if (!e.alerteSexe) break;
    }
  });

  const immediates = etapes
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.parents.every((p) => p.type === "monture") && !e.alerteSexe)
    .map(({ i }) => i);

  // Chemin vers l'objectif : son étape et toutes les naissances en amont.
  const prioritaires = new Set<number>();
  const remonter = (i: number) => {
    if (prioritaires.has(i)) return;
    prioritaires.add(i);
    for (const p of etapes[i].parents) if (p.type === "naissance") remonter(p.etape);
  };
  if (etapeCible !== null) remonter(etapeCible);

  return { famille, etapes, captures, immediates, reservees, clonages, importance, prioritaires, ...(valide && { cible: { couleur: cible!, etape: etapeCible, gardee } }) };
}

/** Importance de chaque étape : coût en amont (naissances + captures) + étapes en aval. */
export function calculerImportance(etapes: Etape[]): number[] {
  const amont: number[] = [];
  etapes.forEach((e, i) => {
    amont[i] = 1 + e.parents.reduce((a, p) => a + (p.type === "naissance" ? amont[p.etape] : p.type === "capture" ? 1 : 0), 0);
  });
  const aval = etapes.map(() => 0);
  for (let i = etapes.length - 1; i >= 0; i--) {
    for (const p of etapes[i].parents) if (p.type === "naissance") aval[p.etape] += 1 + aval[i];
  }
  return etapes.map((_, i) => amont[i] + aval[i]);
}

export interface PaireClonage {
  a: Monture;
  b: Monture;
  /** Même couleur : résultat garanti. Sinon 50/50 entre les deux couleurs. */
  memeCouleur: boolean;
}

/** Associe les stériles clonables, en privilégiant les paires de même couleur (résultat certain). */
export function suggererClonages(montures: Monture[]): PaireClonage[] {
  const steriles = montures.filter((m) => m.etat === "sterile");
  const groupes = new Map<string, Monture[]>();
  for (const m of steriles) {
    const k = `${m.famille}/${couleur(m.famille, m.couleur).generation}`;
    if (!groupes.has(k)) groupes.set(k, []);
    groupes.get(k)!.push(m);
  }
  const paires: PaireClonage[] = [];
  for (const groupe of groupes.values()) {
    const restants = [...groupe].sort((x, y) => x.couleur.localeCompare(y.couleur));
    for (let i = 0; i + 1 < restants.length; ) {
      if (restants[i].couleur === restants[i + 1].couleur) {
        paires.push({ a: restants[i], b: restants[i + 1], memeCouleur: true });
        restants.splice(i, 2);
      } else i++;
    }
    for (let i = 0; i + 1 < restants.length; i += 2) {
      if (clonables(restants[i], restants[i + 1])) paires.push({ a: restants[i], b: restants[i + 1], memeCouleur: false });
    }
  }
  return paires;
}

export interface GroupeClonage {
  couleurs: [string, string];
  memeCouleur: boolean;
  paires: PaireClonage[];
}

/** Regroupe les clonages proposés par couleurs de stériles (A + A, ou A + B). */
export function regrouperClonages(paires: PaireClonage[]): GroupeClonage[] {
  const groupes = new Map<string, GroupeClonage>();
  for (const p of paires) {
    const couleurs = [p.a.couleur, p.b.couleur].sort() as [string, string];
    const k = couleurs.join("+");
    const g = groupes.get(k) ?? { couleurs, memeCouleur: p.memeCouleur, paires: [] };
    g.paires.push(p);
    groupes.set(k, g);
  }
  return [...groupes.values()].sort((x, y) => Number(y.memeCouleur) - Number(x.memeCouleur) || y.paires.length - x.paires.length);
}
