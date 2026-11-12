// Constantes partagées par les cartes d'actions (tableau de bord, mode compagnon).
// Gardées hors des fichiers de composants pour que le rechargement à chaud de React fonctionne.
import { couleur, nomCouleur } from "../../moteur/donnees";
import { rendreFecondes } from "../../moteur/etable";
import { useNotifier } from "../../notifications";
import type { Famille, Makina, Monture, Sauvegarde, Sexe } from "../../moteur/types";

export type GroupePreparer = { couleur: string; sexe: Sexe; montures: Monture[] };
export interface CouleurAPreparer {
  couleur: string;
  M: Monture[];
  F: Monture[];
}

/** Montures à préparer regroupées par génération, puis par couleur (♂ et ♀ ensemble). */
export function preparationParGeneration(famille: Famille, groupes: GroupePreparer[]): { generation: number; couleurs: CouleurAPreparer[] }[] {
  const parCouleur = new Map<string, CouleurAPreparer>();
  for (const g of groupes) {
    const c = parCouleur.get(g.couleur) ?? { couleur: g.couleur, M: [], F: [] };
    c[g.sexe].push(...g.montures);
    parCouleur.set(g.couleur, c);
  }
  const parGeneration = new Map<number, CouleurAPreparer[]>();
  for (const c of parCouleur.values()) {
    const gen = couleur(famille, c.couleur).generation;
    parGeneration.set(gen, [...(parGeneration.get(gen) ?? []), c]);
  }
  return [...parGeneration]
    .sort(([a], [b]) => a - b)
    .map(([generation, couleurs]) => ({ generation, couleurs: couleurs.sort((x, y) => couleur(famille, x.couleur).nom.localeCompare(couleur(famille, y.couleur).nom)) }));
}

export const NOM_MAKINA: Record<Makina, string> = { optimakina: "Optimakina", animakina: "Animakina", kromakina: "Kromakina" };

/** Type d'action : libellé et couleur (numéro, liseré, tuile). */
export const TYPES = {
  naissance: { libelle: "Naissance", teinte: "#22c55e" },
  clonage: { libelle: "Clonage", teinte: "#a78bfa" },
  preparer: { libelle: "Préparer", teinte: "var(--color-accent)" },
  capture: { libelle: "Capture", teinte: "#60a5fa" },
} as const;

/** Passe des montures d'une couleur en Féconde (♂ et ♀ mêlés possibles), avec notification. */
export function useRendrePretes(famille: Famille, setS: (f: (s: Sauvegarde) => Sauvegarde) => void) {
  const notifier = useNotifier();
  return (c: string, montures: Monture[]) => {
    notifier(`${nomCouleur(famille, c)} ×${montures.length} passée${montures.length > 1 ? "s" : ""} en Féconde`, { annulable: true });
    setS((s) => {
      let r = s;
      for (const sexe of ["M", "F"] as Sexe[]) {
        const l = montures.filter((m) => m.sexe === sexe);
        if (l.length) r = rendreFecondes(r, famille, c, sexe, l.length, new Set(l.map((m) => m.id)));
      }
      return r;
    });
  };
}
