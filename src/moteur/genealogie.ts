// Généalogie des couleurs : arbres d'ancêtres et de descendants, lignées, disposition en soleil.
import { couleur, couleurs } from "./donnees";
import type { Famille } from "./types";

const enfantsIndex = new Map<Famille, Map<string, string[]>>();

/** Couleurs qu'une couleur permet d'obtenir (elle figure dans au moins une de leurs recettes). */
export function enfantsDe(f: Famille, id: string): string[] {
  if (!enfantsIndex.has(f)) {
    const idx = new Map<string, string[]>();
    for (const c of couleurs(f))
      for (const p of new Set(c.recettes.flat())) {
        if (!idx.has(p)) idx.set(p, []);
        idx.get(p)!.push(c.id);
      }
    enfantsIndex.set(f, idx);
  }
  return enfantsIndex.get(f)!.get(id) ?? [];
}

/**
 * Ancêtres (toutes recettes confondues) et descendants d'une couleur, jusqu'à `profondeur`
 * liens de parenté (1 = parents et enfants directs).
 */
export function lignee(f: Famille, id: string, profondeur = Infinity): { ancetres: Set<string>; descendants: Set<string> } {
  const parcourir = (depart: string, suivants: (x: string) => string[]) => {
    const vus = new Set<string>();
    let niveau = [depart];
    for (let d = 0; d < profondeur && niveau.length; d++) {
      const suivant: string[] = [];
      for (const x of niveau)
        for (const y of suivants(x))
          if (!vus.has(y)) {
            vus.add(y);
            suivant.push(y);
          }
      niveau = suivant;
    }
    return vus;
  };
  return {
    ancetres: parcourir(id, (x) => couleur(f, x).recettes.flat()),
    descendants: parcourir(id, (x) => enfantsDe(f, x)),
  };
}

export interface Noeud {
  couleur: string;
  enfants: Noeud[];
  /** Couleur déjà détaillée plus haut dans l'arbre : branche repliée. */
  dejaVu: boolean;
  /** Arbre des ancêtres : recette affichée et nombre de recettes possibles. */
  recette?: number;
  nbRecettes?: number;
}

/**
 * Arbre construit en largeur d'abord : chaque couleur n'est détaillée qu'une fois, à sa
 * profondeur la plus faible ; ses autres apparitions sont repliées (dejaVu).
 */
function construire(racine: string, suivants: (n: Noeud) => string[], profondeur: number): Noeud {
  const tete: Noeud = { couleur: racine, enfants: [], dejaVu: false };
  const vus = new Set([racine]);
  const file = [tete];
  const prof = new Map([[tete, 0]]);
  while (file.length) {
    const n = file.shift()!;
    if (prof.get(n)! >= profondeur) continue;
    for (const c of suivants(n)) {
      const enfant: Noeud = { couleur: c, enfants: [], dejaVu: vus.has(c) };
      n.enfants.push(enfant);
      prof.set(enfant, prof.get(n)! + 1);
      if (!enfant.dejaVu) {
        vus.add(c);
        file.push(enfant);
      }
    }
  }
  return tete;
}

/** Ancêtres jusqu'aux générations 1. `choix` : recette retenue par couleur (Muldos, Volkornes). */
export function arbreAncetres(f: Famille, id: string, choix: Record<string, number> = {}, profondeur = Infinity): Noeud {
  return construire(id, (n) => {
    const c = couleur(f, n.couleur);
    if (!c.recettes.length) return [];
    n.nbRecettes = c.recettes.length;
    n.recette = Math.min(choix[c.id] ?? 0, c.recettes.length - 1);
    return c.recettes[n.recette];
  }, profondeur);
}

/** Descendants : ce que la couleur permet d'obtenir, de génération en génération. */
export function arbreDescendants(f: Famille, id: string, profondeur = Infinity): Noeud {
  return construire(id, (n) => [...enfantsDe(f, n.couleur)].sort((a, b) => couleur(f, a).generation - couleur(f, b).generation), profondeur);
}

/**
 * Parents principaux : ceux de plus haute génération (la « nouvelle » couleur de la recette,
 * ex. Prune pour Prune et Rousse). Pour plusieurs recettes, les plus fréquents parmi eux.
 */
export function parentsPrincipaux(f: Famille, id: string): string[] {
  const c = couleur(f, id);
  if (!c.recettes.length) return [];
  const parents = c.recettes.flat();
  const genMax = Math.max(...parents.map((p) => couleur(f, p).generation));
  const freq = new Map<string, number>();
  for (const p of parents) if (couleur(f, p).generation === genMax) freq.set(p, (freq.get(p) ?? 0) + 1);
  const max = Math.max(...freq.values());
  return [...freq].filter(([, n]) => n === max).map(([p]) => p);
}

/**
 * Arbre principal de la famille : chaque couleur est rattachée à un seul parent principal.
 * Entre deux parents principaux à égalité, celui qui a le moins d'enfants (arbre équilibré).
 */
export function arbrePrincipal(f: Famille): { principal: Map<string, string>; enfants: Map<string, string[]>; racines: string[] } {
  const enfants = new Map<string, string[]>();
  const principal = new Map<string, string>();
  const racines: string[] = [];
  for (const c of [...couleurs(f)].sort((a, b) => a.generation - b.generation || a.id.localeCompare(b.id))) {
    const candidats = parentsPrincipaux(f, c.id);
    if (!candidats.length) {
      racines.push(c.id);
      continue;
    }
    const p = candidats.reduce((x, y) => ((enfants.get(y)?.length ?? 0) < (enfants.get(x)?.length ?? 0) ? y : x));
    principal.set(c.id, p);
    if (!enfants.has(p)) enfants.set(p, []);
    enfants.get(p)!.push(c.id);
  }
  return { principal, enfants, racines };
}

export const CASE = 64; // emplacement d'un médaillon
const ECART = 28; // espace entre deux branches voisines
const COLONNES_BOUQUET = 3; // largeur maximale d'un demi-bouquet de feuilles
const ESPACE_NIVEAU = 46; // espace vertical entre deux générations

export interface Disposition {
  positions: Map<string, { x: number; y: number }>;
  principal: Map<string, string>;
  /** Ligne de chaque génération (pour les repères). */
  niveaux: { generation: number; y: number }[];
  largeur: number;
  hauteur: number;
}

/**
 * Vue d'ensemble en arbre qui pousse vers le haut : générations 1 en bas (racines), monocolores
 * formant le tronc et les branches, bicolores regroupés en bouquets de part et d'autre de leur
 * branche. Les sous-arbres sont emboîtés génération par génération au plus près (contours),
 * et les branches principales ne se croisent jamais.
 */
export function dispositionArbre(f: Famille): Disposition {
  const { principal, enfants, racines } = arbrePrincipal(f);
  const gen = (id: string) => couleur(f, id).generation;
  const internes = (id: string) => (enfants.get(id) ?? []).filter((e) => enfants.has(e));
  const feuilles = (id: string) => (enfants.get(id) ?? []).filter((e) => !enfants.has(e));
  const seul = (id: string) => internes(id).length === 0;
  // Feuilles en deux demi-bouquets, de part et d'autre de la branche (au-dessus si la couleur
  // n'a pas d'autre descendance).
  const bouquets = (id: string): string[][] => {
    const l = feuilles(id);
    if (!l.length) return [];
    if (seul(id)) return [l];
    const m = Math.ceil(l.length / 2);
    return [l.slice(0, m), l.slice(m)].filter((x) => x.length);
  };
  const colonnes = (n: number, s: boolean) => Math.min(n, s ? 2 * COLONNES_BOUQUET : COLONNES_BOUQUET);

  // Hauteur de chaque génération : assez pour le plus grand bouquet qui y pousse.
  const lignes = new Map<number, number>();
  for (const c of couleurs(f))
    for (const b of bouquets(c.id)) {
      const g = gen(c.id) + 1;
      lignes.set(g, Math.max(lignes.get(g) ?? 1, Math.ceil(b.length / colonnes(b.length, seul(c.id)))));
    }
  const genMax = Math.max(...couleurs(f).map((c) => c.generation));
  const base = new Map<number, number>(); // ordonnée de la ligne la plus basse de chaque génération
  let y = 0;
  for (let g = genMax; g >= 1; g--) {
    y += (lignes.get(g) ?? 1) * CASE;
    base.set(g, y - CASE / 2);
    y += ESPACE_NIVEAU;
  }
  const hauteur = y - ESPACE_NIVEAU;

  // Sous-arbre : positions relatives (x de la couleur = 0) et contour [gauche, droite] par génération.
  type Contour = Map<number, [number, number]>;
  type Sous = { rel: Map<string, { x: number; y: number }>; contour: Contour };
  const fusionner = (c: Contour, d: Contour, dx: number) => {
    for (const [g, [l, r]] of d) {
      const e = c.get(g);
      c.set(g, e ? [Math.min(e[0], l + dx), Math.max(e[1], r + dx)] : [l + dx, r + dx]);
    }
  };
  const bouquet = (l: string[], g: number, s: boolean): Sous => {
    const k = colonnes(l.length, s);
    const w = k * CASE;
    const rel = new Map(l.map((id, i) => [id, { x: ((i % k) + 0.5) * CASE - w / 2, y: base.get(g)! - Math.floor(i / k) * CASE }]));
    return { rel, contour: new Map([[g, [-w / 2, w / 2]]]) };
  };
  const sousArbre = (id: string): Sous => {
    const g = gen(id);
    const bq = bouquets(id).map((b) => bouquet(b, g + 1, seul(id)));
    const blocs: (Sous & { interne?: string })[] = seul(id) ? bq : [...bq.slice(0, 1), ...internes(id).map((e) => ({ ...sousArbre(e), interne: e })), ...bq.slice(1)];
    const rel = new Map<string, { x: number; y: number }>();
    const contour: Contour = new Map();
    const xInternes: number[] = [];
    let precedent = 0;
    blocs.forEach((b, i) => {
      // Décalage minimal pour que le bloc ne touche pas les précédents, génération par génération.
      let dx = i ? precedent + CASE : 0;
      if (i)
        for (const [gg, [l]] of b.contour) {
          const e = contour.get(gg);
          if (e) dx = Math.max(dx, e[1] + ECART - l);
        }
      for (const [k, p] of b.rel) rel.set(k, { x: p.x + dx, y: p.y });
      fusionner(contour, b.contour, dx);
      if (b.interne) xInternes.push(dx);
      precedent = dx;
    });
    // Le tronc reste droit : la couleur se place sous ses sous-branches, sinon au centre.
    const centre = xInternes.length ? (Math.min(...xInternes) + Math.max(...xInternes)) / 2 : blocs.length ? (contour.get(g + 1)![0] + contour.get(g + 1)![1]) / 2 : 0;
    const decale: Sous = { rel: new Map(), contour: new Map() };
    for (const [k, p] of rel) decale.rel.set(k, { x: p.x - centre, y: p.y });
    fusionner(decale.contour, contour, -centre);
    decale.rel.set(id, { x: 0, y: base.get(g)! });
    fusionner(decale.contour, new Map([[g, [-CASE / 2, CASE / 2]]]), 0);
    return decale;
  };

  // Les racines (générations 1) côte à côte, emboîtées de la même manière.
  const positions = new Map<string, { x: number; y: number }>();
  const contour: Contour = new Map();
  let precedent = 0;
  racines.forEach((r, i) => {
    const s = sousArbre(r);
    let dx = i ? precedent + CASE : 0;
    if (i)
      for (const [g, [l]] of s.contour) {
        const e = contour.get(g);
        if (e) dx = Math.max(dx, e[1] + 2 * ECART - l);
      }
    for (const [k, p] of s.rel) positions.set(k, { x: p.x + dx, y: p.y });
    fusionner(contour, s.contour, dx);
    precedent = dx;
  });
  const gauche = Math.min(...[...contour.values()].map(([l]) => l));
  const droite = Math.max(...[...contour.values()].map(([, r]) => r));
  for (const p of positions.values()) p.x -= gauche;
  return { positions, principal, niveaux: [...base].map(([generation, yy]) => ({ generation, y: yy })), largeur: droite - gauche, hauteur };
}
