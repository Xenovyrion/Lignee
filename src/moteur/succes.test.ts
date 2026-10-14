import { describe, expect, it } from "vitest";
import { sauvegardeVide } from "./actions";
import { couleurs } from "./donnees";
import { bilan, naissances, nomSuccesGeneration } from "./succes";
import type { Monture } from "./types";

describe("succès", () => {
  it("noms officiels des succès de génération", () => {
    expect(nomSuccesGeneration("dragodinde", 4)).toBe("Dragodinde : Quatrième génération");
    expect(nomSuccesGeneration("muldo", 10)).toBe("Muldo : Dixième génération");
  });
  it("bilan : générations validées, couleurs obtenues, capture déduite de l'étable", () => {
    const s = sauvegardeVide();
    s.obtenues.dragodinde = couleurs("dragodinde").filter((c) => c.generation === 2 || c.generation === 3).map((c) => c.id);
    s.montures = (["amande", "rousse", "doree"] as const).map(
      (c, i): Monture => ({ id: `m${i}`, famille: "dragodinde", couleur: c, sexe: "F", niveau: 1, etat: "fertile", origine: "capture", creeLe: "" }),
    );
    const b = bilan("dragodinde", s);
    expect(b.total).toBe(63);
    expect(b.obtenues).toBe(5);
    expect(b.validees).toBe(2);
    expect(b.generations.find((g) => g.generation === 4)!.valide).toBe(false);
    expect(b.capture.valide).toBe(true);
    expect(b.meta.valide).toBe(false);
  });
  it("naissances : journal + naissances antérieures", () => {
    const s = sauvegardeVide();
    s.options.naissancesAnterieures = 120;
    s.journal = [{ id: "j", date: "", famille: "dragodinde", pereId: "a", mereId: "b", bebeIds: ["x", "y"] }];
    expect(naissances(s)).toBe(122);
  });
});
