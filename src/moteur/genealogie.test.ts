import { describe, expect, it } from "vitest";
import { couleur, couleurs, FAMILLES } from "./donnees";
import { arbreAncetres, arbreDescendants, CASE, dispositionArbre, enfantsDe, lignee, parentsPrincipaux, type Noeud } from "./genealogie";

const tous = (n: Noeud): Noeud[] => [n, ...n.enfants.flatMap(tous)];

describe("généalogie", () => {
  it("enfants d'une couleur", () => {
    expect(enfantsDe("dragodinde", "ebene_indigo").sort()).toEqual(["orchidee", "pourpre"]);
  });
  it("lignée complète", () => {
    const l = lignee("dragodinde", "pourpre");
    expect([...l.ancetres].sort()).toEqual(["amande", "amande_doree", "amande_rousse", "doree", "doree_rousse", "ebene", "ebene_indigo", "indigo", "rousse"].sort());
    expect(l.descendants.has("prune_pourpre")).toBe(true);
    expect(l.descendants.has("rousse")).toBe(false);
  });
  it("arbre des ancêtres : descend jusqu'aux G1, chaque couleur détaillée une seule fois", () => {
    for (const f of FAMILLES)
      for (const c of couleurs(f)) {
        const noeuds = tous(arbreAncetres(f, c.id));
        const detailles = noeuds.filter((n) => !n.dejaVu).map((n) => n.couleur);
        expect(new Set(detailles).size).toBe(detailles.length);
        for (const n of noeuds) if (!n.dejaVu && couleur(f, n.couleur).generation > 1) expect(n.enfants).toHaveLength(2);
      }
  });
  it("recette choisie pour une couleur à plusieurs recettes", () => {
    const a = arbreAncetres("muldo", "roux", { roux: 2 });
    expect(a.recette).toBe(2);
    expect(a.nbRecettes).toBe(6);
    expect(a.enfants.map((n) => n.couleur)).toEqual(couleur("muldo", "roux").recettes[2]);
  });
  it("arbre des descendants", () => {
    const d = arbreDescendants("dragodinde", "prune");
    expect(d.enfants.every((n) => couleur("dragodinde", n.couleur).generation === 10)).toBe(true);
    expect(d.enfants).toHaveLength(10);
  });
  it("distance de parenté (zoom au survol)", () => {
    const d = lignee("dragodinde", "pourpre").distance;
    expect([d.get("pourpre"), d.get("amande_rousse"), d.get("amande"), d.get("prune_pourpre"), d.get("prune")]).toEqual([0, 1, 2, 1, 4]);
  });
  it("profondeur limitée : parents et enfants directs seulement", () => {
    const l = lignee("dragodinde", "amande", 1);
    expect(l.descendants.size).toBe(10);
    expect(lignee("dragodinde", "pourpre", 1).ancetres).toEqual(new Set(["amande_rousse", "ebene_indigo"]));
    expect(arbreDescendants("dragodinde", "amande", 1).enfants.every((n) => n.enfants.length === 0)).toBe(true);
    expect(tous(arbreAncetres("dragodinde", "pourpre", {}, 2)).length).toBe(7);
  });
  it("parent principal : la couleur la plus récente de la recette", () => {
    expect(parentsPrincipaux("dragodinde", "prune_rousse")).toEqual(["prune"]);
    expect(parentsPrincipaux("dragodinde", "amande_rousse").sort()).toEqual(["amande", "rousse"]);
  });
  it("vue d'ensemble : toutes les couleurs placées, sans chevauchement", () => {
    for (const f of FAMILLES)
      for (const colonnes of [2, 3, 4, 5, 6]) {
      const { positions } = dispositionArbre(f, colonnes);
      expect(positions.size).toBe(couleurs(f).length);
      const p = [...positions.values()];
      for (let i = 0; i < p.length; i++)
        for (let j = i + 1; j < p.length; j++) expect(Math.hypot(p[i].x - p[j].x, p[i].y - p[j].y)).toBeGreaterThanOrEqual(CASE - 1);
    }
  });
  it("vue d'ensemble : l'arbre pousse vers le haut, un seul parent principal par couleur", () => {
    for (const f of FAMILLES) {
      const { positions, principal } = dispositionArbre(f);
      expect(principal.size).toBe(couleurs(f).filter((c) => c.generation > 1).length);
      for (const [c, p] of principal) expect(positions.get(c)!.y).toBeLessThan(positions.get(p)!.y);
    }
  });
  it("vue d'ensemble : les Prune-X forment un bouquet autour de la Prune", () => {
    const { positions } = dispositionArbre("dragodinde");
    const prune = positions.get("prune")!;
    for (const c of couleurs("dragodinde").filter((x) => x.generation === 10 && parentsPrincipaux("dragodinde", x.id).join() === "prune"))
      expect(Math.abs(positions.get(c.id)!.x - prune.x)).toBeLessThan(6 * CASE);
  });
});
