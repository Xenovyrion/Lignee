// Transforme le plan en liste d'actions concrètes : ce qui est prêt, ce qu'il faut préparer,
// capturer ou cloner, et ce qui bloque. Seules les étapes de la « frontière » sont traitées :
// celles dont aucun parent n'attend une naissance planifiée plus tôt.
import type { Etape, Plan, Source } from "./planificateur";
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
  const vues = new Set<string>();
  const ordre = [...prets, ...aPreparer].sort(priorite).filter((a) => !vues.has(a.e.couleur) && vues.add(a.e.couleur));
  ordre.forEach((a, i) => (a.rang = i + 1));
  prets.sort(priorite);
  aPreparer.sort(priorite);

  return { prets, ordre, aPreparer, captures: [...captures.values()].sort((x, y) => y.nombre - x.nombre), clonagesUtiles, blocages };
}
