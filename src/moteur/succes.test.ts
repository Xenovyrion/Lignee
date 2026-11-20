import { describe, expect, it } from "vitest";
import { sauvegardeVide } from "./actions";
import { couleurs } from "./donnees";
import { bilan, bilanChance, bilanChanceDetail, naissances, nomSuccesGeneration } from "./succes";
import type { Accouplement, Famille, Monture } from "./types";

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

describe("bilan de chance", () => {
  const j = (vise: string, chance: number, couleur: string, famille: Famille = "dragodinde"): Accouplement => ({
    id: Math.random().toString(), date: "", famille, pereId: "a", mereId: "b", bebeIds: ["x"], vise, chance, couleurs: [couleur],
  });
  it("compte les réussites et les attendus, ignore les entrées sans prévision", () => {
    const journal = [j("ivoire", 0.8, "ivoire"), j("ivoire", 0.8, "ebene"), { id: "v", date: "", famille: "dragodinde" as const, pereId: "a", mereId: "b", bebeIds: ["y"] }];
    const b = bilanChance(journal);
    expect(b).toMatchObject({ suivis: 2, reussis: 1, verdict: "trop-tot" });
    expect(b.attendus).toBeCloseTo(1.6);
    expect(b.derniers[0].reussi).toBe(false);
  });
  it("verdict après 10 accouplements et filtre par famille", () => {
    const journal = [...Array.from({ length: 20 }, () => j("ivoire", 0.8, "ebene")), j("prune", 0.5, "prune", "muldo")];
    expect(bilanChance(journal, "dragodinde").verdict).toBe("malchanceux");
    expect(bilanChance(journal, "muldo").suivis).toBe(1);
    expect(bilanChance(Array.from({ length: 20 }, (_, i) => j("ivoire", 0.8, i < 16 ? "ivoire" : "ebene"))).verdict).toBe("conforme");
  });
  it("détail par makina et par niveau des parents", () => {
    const journal: Accouplement[] = [
      { ...j("ivoire", 0.8, "ivoire"), makina: "optimakina", niveaux: [200, 200] },
      { ...j("ivoire", 0.6, "ebene"), makina: "animakina", niveaux: [200, 150] },
      { ...j("ivoire", 0.6, "ivoire"), makina: "animakina" },
    ];
    expect(bilanChanceDetail(journal).map((x) => [x.libelle, x.bilan.suivis, x.bilan.reussis])).toEqual([
      ["Optimakina", 1, 1],
      ["Animakina", 2, 1],
      ["Parents tous deux niv. 200", 1, 1],
      ["Parents niv. 100 à 199", 1, 0],
    ]);
  });
});
