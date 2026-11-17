// L'étable de démo doit montrer chaque type de carte du tableau de bord, sans blocage.
import { describe, expect, it } from "vitest";
import { construireDemo } from "./demo";
import { sauvegardeVide } from "./moteur/actions";
import { actionsMaintenant, conseiller } from "./moteur/conseils";
import { planifier, regrouperClonages, suggererClonages } from "./moteur/planificateur";

describe("étable de démonstration", () => {
  it("fait apparaître accouplement prêt, clonage, préparation et capture", () => {
    const s = construireDemo(sauvegardeVide().options);
    const plan = planifier("dragodinde", s.montures, s.obtenues.dragodinde);
    const c = conseiller(plan, { makina: "auto" });
    const actions = actionsMaintenant(c, regrouperClonages(suggererClonages(s.montures)));
    const types = actions.map((x) => x.type);
    expect(types[0]).toBe("naissance");
    expect(types).toContain("clonage");
    expect(types).toContain("preparer");
    expect(types).toContain("capture");
    expect(c.blocages).toHaveLength(0);
  });
});
