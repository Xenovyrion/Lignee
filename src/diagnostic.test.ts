import { describe, expect, it } from "vitest";
import { resumerDifference, resumerPlans } from "./diagnostic";
import { enregistrerNaissance, sauvegardeVide } from "./moteur/actions";
import { ajusterStock } from "./moteur/etable";

describe("journal de diagnostic", () => {
  it("résume les changements de l'étable, des succès et des réglages", () => {
    const s0 = sauvegardeVide();
    const s1 = ajusterStock(ajusterStock(s0, "volkorne", "ebene", "F", "fertile", 2, 100), "volkorne", "indigo", "M", "fertile", 1, 100);
    expect(resumerDifference(s0, s1)).toBe("Étable : volkorne Ebène ♀ fertile +2, volkorne Indigo ♂ fertile +1");
    const [m, f] = [s1.montures.find((x) => x.sexe === "M")!, s1.montures.find((x) => x.sexe === "F")!];
    const s2 = enregistrerNaissance(s1, m.id, f.id, [{ couleur: "indigo_ebene", sexe: "F" }]);
    const d = resumerDifference(s1, s2);
    expect(d).toContain("Succès volkorne cochés");
    expect(d).toContain("1 accouplement enregistré");
    expect(resumerDifference(s2, { ...s2, options: { ...s2.options, takeza: true } })).toBe("Paramètres : takeza = true");
    expect(resumerDifference(s2, s2)).toBe("");
  });
  it("résume le plan de chaque famille", () => {
    const r = resumerPlans(sauvegardeVide()) as Record<string, { etapes: number; blocages: string[] }>;
    expect(Object.keys(r)).toEqual(["dragodinde", "muldo", "volkorne"]);
    expect(r.muldo.etapes).toBeGreaterThan(0);
    expect(r.muldo.blocages).toEqual([]);
  });
});
