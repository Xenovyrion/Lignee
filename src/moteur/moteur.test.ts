import { describe, expect, it } from "vitest";
import { cloner, enregistrerNaissance, sauvegardeVide } from "./actions";
import { couleur, couleurs, FAMILLES } from "./donnees";
import { planifier, suggererClonages } from "./planificateur";
import { cible, probaCible, sommeNiveauxPour100 } from "./regles";
import type { Famille, Monture, Sexe } from "./types";

let n = 0;
const m = (famille: Famille, c: string, sexe: Sexe, extra: Partial<Monture> = {}): Monture => ({
  id: `m${++n}`, famille, couleur: c, sexe, niveau: 200, etat: "feconde", origine: "saisie", creeLe: "", ...extra,
});

describe("données — conformes aux objectifs officiels des succès (jeu 3.7)", () => {
  // Nombre d'objectifs des succès « X : Nème génération » (api.dofusdb.fr), G1 = succès de capture.
  const officiel: Record<Famille, number[]> = {
    dragodinde: [3, 3, 2, 7, 2, 11, 2, 15, 2, 19],
    muldo: [5, 10, 2, 11, 2, 15, 2, 19, 4, 50],
    volkorne: [4, 6, 4, 22, 2, 17, 1, 10, 4, 50],
  };
  for (const f of FAMILLES) {
    it(`${f} : nombre de couleurs par génération`, () => {
      const parGen = Array.from({ length: 10 }, (_, g) => couleurs(f).filter((c) => c.generation === g + 1).length);
      expect(parGen).toEqual(officiel[f]);
    });
    it(`${f} : chaque recette mène à la génération suivante d'un parent`, () => {
      for (const c of couleurs(f)) {
        expect(c.recettes.length > 0).toBe(c.generation > 1);
        for (const [a, b] of c.recettes) {
          expect(Math.max(couleur(f, a).generation, couleur(f, b).generation)).toBe(c.generation - 1);
        }
      }
    });
  }
  it("recettes clés des Dragodindes", () => {
    const r = (id: string) => couleur("dragodinde", id).recettes[0].slice().sort();
    expect(r("pourpre")).toEqual(["amande_rousse", "ebene_indigo"]);
    expect(r("orchidee")).toEqual(["doree_rousse", "ebene_indigo"]);
    expect(r("indigo")).toEqual(["amande_doree", "amande_rousse"]);
    expect(r("ebene")).toEqual(["amande_doree", "doree_rousse"]);
  });
});

describe("probabilité de génération cible", () => {
  it("formule 3.7", () => {
    expect(probaCible(1, 1)).toBe(0.303);
    expect(probaCible(100, 100)).toBe(0.6);
    expect(probaCible(200, 200)).toBe(0.9);
    expect(probaCible(200, 200, { optimakina: true })).toBe(1);
    expect(probaCible(167, 167, { optimakina: true })).toBe(1);
    expect(probaCible(166, 167, { optimakina: true })).toBeLessThan(1);
  });
  it("niveaux nécessaires pour 100 %", () => {
    expect(sommeNiveauxPour100()).toBeNull();
    expect(sommeNiveauxPour100({ optimakina: true })).toBe(334);
    expect(sommeNiveauxPour100({ optimakina: true, takeza: true })).toBe(200);
  });
});

describe("génération cible d'un couple", () => {
  it("recette directe", () => {
    expect(cible("dragodinde", { couleur: "amande_rousse" }, { couleur: "ebene_indigo" })).toEqual({ generation: 5, couleurs: ["pourpre"] });
  });
  it("tient compte des grands-parents", () => {
    const c = cible("dragodinde", { couleur: "amande_rousse", parents: ["amande", "rousse"] }, { couleur: "doree" });
    expect(c?.generation).toBe(2);
    expect(c?.couleurs.sort()).toEqual(["amande_doree", "doree_rousse"]);
  });
  it("aucune recette", () => {
    expect(cible("dragodinde", { couleur: "rousse" }, { couleur: "rousse" })).toBeNull();
  });
});

describe("planificateur", () => {
  it("étable vide : 63 naissances de Dragodindes au minimum, uniquement des captures G1", () => {
    const p = planifier("dragodinde", [], []);
    expect(p.etapes.filter((e) => e.pour === "succes")).toHaveLength(63);
    expect(Object.keys(p.captures).sort()).toEqual(["amande", "doree", "rousse"]);
    expect(p.immediates).toEqual([]);
  });
  it("chaque étape utilise une recette valide et chaque bébé planifié n'est utilisé qu'une fois", () => {
    for (const f of FAMILLES) {
      const p = planifier(f, [], []);
      const utilisations = new Map<number, number>();
      p.etapes.forEach((e, i) => {
        expect(couleur(f, e.couleur).recettes).toContainEqual(e.recette);
        for (const s of e.parents) {
          if (s.type === "naissance") {
            expect(s.etape).toBeLessThan(i);
            utilisations.set(s.etape, (utilisations.get(s.etape) ?? 0) + 1);
          }
        }
      });
      for (const nb of utilisations.values()) expect(nb).toBe(1);
    }
  });
  it("utilise les montures existantes et propose l'accouplement immédiat", () => {
    const pere = m("dragodinde", "amande_rousse", "M");
    const mere = m("dragodinde", "ebene_indigo", "F");
    const obtenues = couleurs("dragodinde").filter((c) => c.generation <= 4).map((c) => c.id);
    const p = planifier("dragodinde", [pere, mere], obtenues);
    const premiere = p.etapes[p.immediates[0]];
    expect(premiere.couleur).toBe("pourpre");
    expect(premiere.parents.map((s) => (s.type === "monture" ? s.monture.id : null)).sort()).toEqual([pere.id, mere.id].sort());
    expect(p.reservees.has(pere.id)).toBe(true);
  });
  it("ignore les stériles et les couleurs déjà obtenues", () => {
    const obtenues = couleurs("dragodinde").filter((c) => c.generation > 1).map((c) => c.id);
    const p = planifier("dragodinde", [m("dragodinde", "amande", "M", { etat: "sterile" })], obtenues);
    expect(p.etapes).toHaveLength(0);
  });
  it("recycle les stériles de même couleur par clonage", () => {
    const sansClone = planifier("dragodinde", [], []);
    expect(sansClone.clonages).toBeGreaterThan(0);
    const p = planifier("dragodinde", [m("dragodinde", "pourpre", "M", { etat: "sterile" }), m("dragodinde", "pourpre", "F", { etat: "sterile" })], []);
    const clone = p.etapes.flatMap((e) => e.parents).find((s) => s.type === "clone" && s.couleur === "pourpre");
    expect(clone).toBeDefined();
  });
  it("signale deux parents existants du même sexe", () => {
    const obtenues = couleurs("dragodinde").filter((c) => c.generation <= 4).map((c) => c.id);
    const p = planifier("dragodinde", [m("dragodinde", "amande_rousse", "F"), m("dragodinde", "ebene_indigo", "F")], obtenues);
    expect(p.etapes.find((e) => e.couleur === "pourpre")?.alerteSexe).toBe(true);
    expect(p.immediates.map((i) => p.etapes[i].couleur)).not.toContain("pourpre");
  });
});

describe("actions", () => {
  it("naissance : parents stériles, bébé créé avec son arbre, succès coché", () => {
    const s0 = sauvegardeVide();
    const pere = m("dragodinde", "amande_rousse", "M");
    const mere = m("dragodinde", "ebene_indigo", "F");
    const s1 = enregistrerNaissance({ ...s0, montures: [pere, mere] }, pere.id, mere.id, [{ couleur: "pourpre", sexe: "F" }], "optimakina");
    expect(s1.montures.filter((x) => x.etat === "sterile")).toHaveLength(2);
    const bebe = s1.montures.find((x) => x.couleur === "pourpre")!;
    expect(bebe.parents).toEqual(["amande_rousse", "ebene_indigo"]);
    expect(bebe.niveau).toBe(1);
    expect(s1.obtenues.dragodinde).toEqual(["pourpre"]);
    expect(s1.journal).toHaveLength(1);
    expect(() => enregistrerNaissance(s1, pere.id, mere.id, [{ couleur: "pourpre", sexe: "F" }])).toThrow();
  });
  it("clonage de deux stériles de même génération", () => {
    const a = m("dragodinde", "amande_rousse", "M", { etat: "sterile" });
    const b = m("dragodinde", "doree_rousse", "F", { etat: "sterile" });
    const s = cloner({ ...sauvegardeVide(), montures: [a, b] }, a.id, b.id, { couleur: "doree_rousse", sexe: "F" });
    expect(s.montures).toHaveLength(1);
    expect(s.montures[0]).toMatchObject({ couleur: "doree_rousse", etat: "fertile" });
    expect(suggererClonages([a, b])).toEqual([{ a, b, memeCouleur: false }]);
    const c = m("dragodinde", "pourpre", "M", { etat: "sterile" });
    expect(() => cloner({ ...sauvegardeVide(), montures: [a, c] }, a.id, c.id, { couleur: "pourpre", sexe: "M" })).toThrow();
  });
});
