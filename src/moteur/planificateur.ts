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
  | { type: "capture"; couleur: string }
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
}

const autreSexe = (s: Sexe): Sexe => (s === "M" ? "F" : "M");

export function planifier(famille: Famille, montures: Monture[], obtenues: Iterable<string>): Plan {
  const dejaObtenues = new Set(obtenues);
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

  const disponible = (c: string) =>
    (stock.get(c)?.length ?? 0) + (virtuels.get(c)?.length ?? 0) + Math.floor((steriles.get(c)?.length ?? 0) / 2);

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

  function prendre(c: string, sexe?: Sexe): Source {
    const reelles = stock.get(c);
    if (reelles?.length) {
      const i = sexe ? Math.max(0, reelles.findIndex((m) => m.sexe === sexe)) : 0;
      const [m] = reelles.splice(i, 1);
      reservees.add(m.id);
      memo = new Map();
      return { type: "monture", monture: m };
    }
    const v = virtuels.get(c);
    if (v?.length) {
      const e = v.shift()!;
      if (sexe && !etapes[e].sexeVoulu) etapes[e].sexeVoulu = sexe;
      memo = new Map();
      return { type: "naissance", etape: e };
    }
    const st = steriles.get(c);
    if (st && st.length >= 2) {
      const paire = st.splice(0, 2) as [Sterile, Sterile];
      for (const x of paire) if ("monture" in x) reservees.add(x.monture.id);
      clonages++;
      memo = new Map();
      return { type: "clone", couleur: c, steriles: paire };
    }
    if (couleur(famille, c).generation === 1) {
      captures[c] = (captures[c] ?? 0) + 1;
      return { type: "capture", couleur: c };
    }
    const e = produire(c, "intermediaire");
    if (sexe) etapes[e].sexeVoulu = sexe;
    return { type: "naissance", etape: e };
  }

  function produire(c: string, pour: Etape["pour"]): number {
    const col = couleur(famille, c);
    let recette = col.recettes[0];
    let meilleur = Infinity;
    for (const r of col.recettes) {
      const k = cout(r[0]) + cout(r[1]);
      if (k < meilleur) [meilleur, recette] = [k, r];
    }
    const a = prendre(recette[0]);
    const b = prendre(recette[1], a.type === "monture" ? autreSexe(a.monture.sexe) : undefined);
    const alerteSexe = a.type === "monture" && b.type === "monture" && a.monture.sexe === b.monture.sexe;
    etapes.push({ couleur: c, generation: col.generation, recette, pour, parents: [a, b], alerteSexe });
    const i = etapes.length - 1;
    // Après l'accouplement, les deux parents sont stériles et peuvent être clonés plus tard.
    ajouterSterile(recette[0], { apresEtape: i });
    ajouterSterile(recette[1], { apresEtape: i });
    return i;
  }

  // Les couleurs manquantes, de la plus basse génération à la plus haute (chaque bébé obtenu pour
  // un succès reste disponible comme parent des générations suivantes) et, dans une génération,
  // la moins coûteuse d'abord pour ne pas lui prendre les montures existantes qu'elle utilise.
  const restants = objectifs(famille).filter((c) => !dejaObtenues.has(c.id));
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

  const immediates = etapes
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.parents.every((p) => p.type === "monture") && !e.alerteSexe)
    .map(({ i }) => i);

  return { famille, etapes, captures, immediates, reservees, clonages };
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
