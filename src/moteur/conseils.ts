// Transforme le plan en liste d'actions concrètes : ce qui est prêt, ce qu'il faut préparer,
// capturer ou cloner, et ce qui bloque. Seules les étapes de la « frontière » sont traitées :
// celles dont aucun parent n'attend une naissance planifiée plus tôt.
import type { Etape, GroupeClonage, Plan, Source } from "./planificateur";
import { probaCible, sommeNiveauxPour100, type Bonus } from "./regles";
import type { Makina, Monture, Sexe } from "./types";

export interface ConseilMakina {
  makina: Makina;
  /** Chance d'obtenir la bonne couleur (et le bon sexe si l'étape en exige un). */
  chance: number;
  raison: string;
}

export interface ActionAccouplement {
  etape: number;
  e: Etape;
  pere: Monture;
  mere: Monture;
  /** Nombre d'étapes suivantes du plan qui dépendent de ce bébé. */
  debloque: number;
  /** Dernière couleur manquante de sa génération : cette naissance termine un succès. */
  termineSucces: boolean;
  /** Rang conseillé parmi toutes les naissances faisables (1 = la plus utile). */
  rang: number;
  /** Nombre d'accouplements identiques (mêmes couleurs de parents) faisables maintenant, celui-ci compris. */
  nombre: number;
  /** Les couples de parents de ces accouplements identiques. */
  paires: { pere: Monture; mere: Monture }[];
  makina: ConseilMakina;
  /** Montures dont les jauges sont à remplir avant l'accouplement. */
  aPreparer: Monture[];
  /** Somme des niveaux à atteindre pour 100 % avec Optimakina (null si déjà atteinte). */
  niveauConseille: number | null;
}

export interface ActionCapture {
  couleur: string;
  /** Sexe nécessaire, quand l'autre parent existe déjà. */
  sexe?: Sexe;
  nombre: number;
}

export interface Blocage {
  etape: number;
  e: Etape;
  message: string;
  /** Nombre d'étapes du plan touchées par ce même blocage. */
  nombre: number;
}

export interface Objectif {
  /** Génération du prochain succès à compléter. */
  generation: number;
  /** Couleurs de cette génération encore à obtenir. */
  manquantes: string[];
  /** Première couleur visée et étapes du plan qui y mènent, dans l'ordre (la dernière est la cible). */
  cible: string;
  chemin: number[];
}

/**
 * Prochain objectif : le succès de plus basse génération encore incomplet, et le chemin (les étapes
 * du plan dont dépend sa première couleur manquante) pour y arriver.
 */
export function prochainObjectif(plan: Plan): Objectif | null {
  const succes = plan.etapes.map((e, i) => ({ e, i })).filter(({ e }) => e.pour === "succes");
  if (!succes.length) return null;
  const generation = Math.min(...succes.map(({ e }) => e.generation));
  const dansGen = succes.filter(({ e }) => e.generation === generation);
  const { e: cible, i: indice } = dansGen[0];
  const chemin = new Set<number>();
  const remonter = (i: number) => {
    if (chemin.has(i)) return;
    chemin.add(i);
    for (const p of plan.etapes[i].parents) if (p.type === "naissance") remonter(p.etape);
  };
  remonter(indice);
  return { generation, manquantes: dansGen.map(({ e }) => e.couleur), cible: cible.couleur, chemin: [...chemin].sort((a, b) => a - b) };
}

/** Une séance à venir : les naissances possibles une fois la séance précédente terminée. */
export interface Seance {
  numero: number;
  naissances: { couleur: string; nombre: number; succes: boolean }[];
  clonages: number;
}

/**
 * Séance de chaque étape du plan : 1 = faisable maintenant, puis 1 + la séance la plus tardive
 * dont elle attend un bébé (ou les stériles à cloner).
 */
export function seancesDesEtapes(plan: Plan): number[] {
  const seance: number[] = [];
  plan.etapes.forEach((e, i) => {
    let s = 1;
    for (const p of e.parents) {
      if (p.type === "naissance") s = Math.max(s, seance[p.etape] + 1);
      if (p.type === "clone") for (const st of p.steriles) if ("apresEtape" in st) s = Math.max(s, seance[st.apresEtape] + 1);
    }
    seance[i] = s;
  });
  return seance;
}

/** Résumé des séances suivantes (à partir de la 2ᵉ). */
export function seancesSuivantes(plan: Plan): Seance[] {
  const num = seancesDesEtapes(plan);
  const seances = new Map<number, Seance>();
  plan.etapes.forEach((e, i) => {
    if (num[i] === 1) return;
    const s = seances.get(num[i]) ?? { numero: num[i], naissances: [], clonages: 0 };
    seances.set(num[i], s);
    const n = s.naissances.find((x) => x.couleur === e.couleur);
    if (n) n.nombre++;
    else s.naissances.push({ couleur: e.couleur, nombre: 1, succes: e.pour === "succes" });
    s.clonages += e.parents.filter((p) => p.type === "clone").length;
  });
  for (const s of seances.values()) s.naissances.sort((a, b) => Number(b.succes) - Number(a.succes) || b.nombre - a.nombre);
  return [...seances.values()].sort((a, b) => a.numero - b.numero);
}

export interface Conseils {
  prets: ActionAccouplement[];
  /** Toutes les naissances faisables (prêtes ou à préparer), une par couleur, dans l'ordre conseillé. */
  ordre: ActionAccouplement[];
  aPreparer: ActionAccouplement[];
  captures: ActionCapture[];
  /** Étapes qui attendent d'abord un clonage de deux stériles existants. */
  clonagesUtiles: number;
  blocages: Blocage[];
}

const autreSexe = (s: Sexe): Sexe => (s === "M" ? "F" : "M");

/** Meilleure makina pour une étape : l'Animakina garantit le sexe, l'Optimakina la génération. */
export function conseillerMakina(niveauA: number, niveauB: number, sexeVoulu: Sexe | undefined, takeza: boolean): ConseilMakina {
  const avecOpti = probaCible(niveauA, niveauB, { optimakina: true, takeza });
  if (!sexeVoulu) return { makina: "optimakina", chance: avecOpti, raison: "maximise la chance de génération cible" };
  const opti = avecOpti * 0.5; // sexe aléatoire
  const ani = probaCible(niveauA, niveauB, { takeza }); // sexe garanti, pas de bonus de génération
  return ani >= opti
    ? { makina: "animakina", chance: ani, raison: `sexe garanti (${sexeVoulu === "M" ? "mâle" : "femelle"}) nécessaire pour la suite` }
    : { makina: "optimakina", chance: opti, raison: "meilleure chance globale malgré le sexe au hasard" };
}

export function conseiller(plan: Plan, options: Bonus & { takeza?: boolean }): Conseils {
  const takeza = !!options.takeza;
  // Dépendances : combien d'étapes suivantes reposent (directement ou non) sur chaque bébé.
  const enfants = plan.etapes.map(() => [] as number[]);
  plan.etapes.forEach((e, i) =>
    e.parents.forEach((p) => {
      if (p.type === "naissance") enfants[p.etape].push(i);
    }),
  );
  const debloque = plan.etapes.map(() => -1);
  const compter = (i: number): number => {
    if (debloque[i] >= 0) return debloque[i];
    const vus = new Set<number>();
    const pile = [...enfants[i]];
    while (pile.length) {
      const j = pile.pop()!;
      if (vus.has(j)) continue;
      vus.add(j);
      pile.push(...enfants[j]);
    }
    return (debloque[i] = vus.size);
  };

  // Couleurs encore à obtenir par génération : chacune est une étape « succès » du plan.
  const manquantesParGeneration = new Map<number, number>();
  for (const e of plan.etapes) if (e.pour === "succes") manquantesParGeneration.set(e.generation, (manquantesParGeneration.get(e.generation) ?? 0) + 1);

  const estFrontiere = (p: Source) =>
    p.type === "monture" || p.type === "capture" || (p.type === "clone" && p.steriles.every((s) => "monture" in s));

  const prets: ActionAccouplement[] = [];
  const aPreparer: ActionAccouplement[] = [];
  const captures = new Map<string, ActionCapture>();
  const blocages: Blocage[] = [];
  let clonagesUtiles = 0;
  const seuil = sommeNiveauxPour100({ optimakina: true, takeza });

  plan.etapes.forEach((e, i) => {
    if (!e.parents.every(estFrontiere)) return;
    const [a, b] = e.parents;
    if (a.type === "monture" && b.type === "monture") {
      if (e.alerteSexe) {
        blocages.push({
          etape: i,
          e,
          nombre: 1,
          message: `Deux parents ${a.monture.sexe === "M" ? "mâles" : "femelles"} disponibles : il faut ${a.monture.sexe === "M" ? "une femelle" : "un mâle"} de l'une des deux couleurs.`,
        });
        return;
      }
      const [pere, mere] = a.monture.sexe === "M" ? [a.monture, b.monture] : [b.monture, a.monture];
      const action: ActionAccouplement = {
        etape: i,
        e,
        pere,
        mere,
        debloque: compter(i),
        termineSucces: e.pour === "succes" && manquantesParGeneration.get(e.generation) === 1,
        rang: 0,
        nombre: 1,
        paires: [{ pere, mere }],
        makina: conseillerMakina(pere.niveau, mere.niveau, e.sexeVoulu, takeza),
        aPreparer: [pere, mere].filter((m) => m.etat !== "feconde"),
        niveauConseille: seuil !== null && pere.niveau + mere.niveau < seuil ? seuil : null,
      };
      (action.aPreparer.length ? aPreparer : prets).push(action);
      return;
    }
    if (a.type === "clone" || b.type === "clone") {
      clonagesUtiles++;
      return;
    }
    // Au moins une capture : le sexe compte si l'autre parent existe déjà.
    for (const [p, autre] of [
      [a, b],
      [b, a],
    ] as const) {
      if (p.type !== "capture") continue;
      const sexe = autre.type === "monture" ? autreSexe(autre.monture.sexe) : undefined;
      const cle = `${p.couleur}/${sexe ?? "?"}`;
      const c = captures.get(cle) ?? { couleur: p.couleur, sexe, nombre: 0 };
      c.nombre++;
      captures.set(cle, c);
    }
  });

  // Priorité : ce que l'accouplement fait avancer (son propre succès + les étapes qu'il débloque).
  // Ordre conseillé : terminer un succès de génération, puis obtenir une nouvelle couleur, puis
  // ce qui est prêt avant ce qui est à préparer, puis ce qui débloque le plus d'étapes.
  const priorite = (x: ActionAccouplement, y: ActionAccouplement) =>
    Number(y.termineSucces) - Number(x.termineSucces) ||
    Number(y.e.pour === "succes") - Number(x.e.pour === "succes") ||
    Number(!y.aPreparer.length) - Number(!x.aPreparer.length) ||
    y.debloque - x.debloque ||
    y.e.generation - x.e.generation;
  // Accouplements identiques (même bébé, même couleur de père et de mère, même préparation) regroupés.
  const cle = (a: ActionAccouplement) => `${a.aPreparer.length ? "A" : "P"}|${a.e.couleur}|${a.pere.couleur}>${a.mere.couleur}`;
  const parCle = new Map<string, ActionAccouplement>();
  for (const a of [...prets, ...aPreparer].sort(priorite)) {
    const deja = parCle.get(cle(a));
    if (deja) {
      deja.nombre++;
      deja.paires.push(...a.paires);
      for (const m of a.aPreparer) deja.aPreparer.push(m);
    } else parCle.set(cle(a), a);
  }
  // Ce qui est prêt d'abord (tri stable : l'ordre de priorité est conservé).
  const ordre = [...parCle.values()].sort((x, y) => Number(!!x.aPreparer.length) - Number(!!y.aPreparer.length));
  ordre.forEach((a, i) => (a.rang = i + 1));
  prets.sort(priorite);
  aPreparer.sort(priorite);

  // Un même blocage (même couleur, même cause) n'est affiché qu'une fois.
  const blocagesUniques = new Map<string, Blocage>();
  for (const b of blocages) {
    const k = `${b.e.couleur}|${b.message}`;
    const deja = blocagesUniques.get(k);
    if (deja) deja.nombre++;
    else blocagesUniques.set(k, b);
  }
  return { prets, ordre, aPreparer, captures: [...captures.values()].sort((x, y) => y.nombre - x.nombre), clonagesUtiles, blocages: [...blocagesUniques.values()] };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Une action de la séance en cours, numérotée dans l'ordre conseillé. */
export type ActionMaintenant =
  | { type: "naissance"; numero: number; a: ActionAccouplement }
  | { type: "clonage"; numero: number; g: GroupeClonage }
  | { type: "preparer"; numero: number; groupes: { couleur: string; sexe: Sexe; montures: Monture[] }[] }
  | { type: "capture"; numero: number; capture: ActionCapture };

/**
 * Liste unique des actions à faire maintenant : naissances prêtes, clonages (instantanés), jauges
 * à remplir, captures, puis les naissances qui attendent cette préparation. Fixe aussi le rang
 * des naissances sur ce numéro (étoiles de l'arbre et du chemin).
 */
export function actionsMaintenant(c: Conseils, clonages: GroupeClonage[]): ActionMaintenant[] {
  const liste: ActionMaintenant[] = [];
  const ajouter = (x: DistributiveOmit<ActionMaintenant, "numero">) => liste.push({ ...x, numero: liste.length + 1 } as ActionMaintenant);
  for (const a of c.ordre) if (!a.aPreparer.length) ajouter({ type: "naissance", a });
  for (const g of clonages) ajouter({ type: "clonage", g });
  const groupes = new Map<string, { couleur: string; sexe: Sexe; montures: Monture[] }>();
  for (const a of c.ordre)
    for (const m of a.aPreparer) {
      const k = `${m.couleur}/${m.sexe}`;
      const g = groupes.get(k) ?? { couleur: m.couleur, sexe: m.sexe, montures: [] };
      if (!g.montures.some((x) => x.id === m.id)) g.montures.push(m);
      groupes.set(k, g);
    }
  if (groupes.size) ajouter({ type: "preparer", groupes: [...groupes.values()] });
  for (const capture of c.captures) ajouter({ type: "capture", capture });
  for (const a of c.ordre) if (a.aPreparer.length) ajouter({ type: "naissance", a });
  for (const x of liste) if (x.type === "naissance") x.a.rang = x.numero;
  return liste;
}
