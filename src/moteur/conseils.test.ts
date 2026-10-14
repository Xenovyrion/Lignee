import { describe, expect, it } from "vitest";
import { conseiller, conseillerMakina } from "./conseils";
import { couleurs } from "./donnees";
import { planifier } from "./planificateur";
import type { Monture, Sexe } from "./types";

let n = 0;
const m = (c: string, sexe: Sexe, extra: Partial<Monture> = {}): Monture => ({
  id: `c${++n}`, famille: "dragodinde", couleur: c, sexe, niveau: 200, etat: "feconde", origine: "saisie", creeLe: "", ...extra,
});
const jusquA = (g: number) => couleurs("dragodinde").filter((c) => c.generation <= g).map((c) => c.id);

describe("conseil de makina", () => {
  it("Optimakina quand aucun sexe n'est requis", () => {
    expect(conseillerMakina(200, 200, undefined, false)).toMatchObject({ makina: "optimakina", chance: 1 });
  });
  it("Animakina quand un sexe est requis et que les niveaux sont hauts", () => {
    // Animakina : 90 % garanti du bon sexe ; Optimakina : 100 % × 50 % = 50 %
    expect(conseillerMakina(200, 200, "F", false)).toMatchObject({ makina: "animakina", chance: 0.9 });
  });
});

describe("conseils d'actions", () => {
  it("classe en prêt / à préparer et propose un niveau", () => {
    const pere = m("amande_rousse", "M", { niveau: 100 });
    const mere = m("ebene_indigo", "F", { niveau: 100, etat: "fertile" });
    const c = conseiller(planifier("dragodinde", [pere, mere], jusquA(4)), {});
    expect(c.prets).toHaveLength(0);
    const a = c.aPreparer.find((x) => x.e.couleur === "pourpre")!;
    expect(a.aPreparer.map((x) => x.id)).toEqual([mere.id]);
    expect(a.niveauConseille).toBe(334);
  });
  it("prêt quand les deux parents sont féconds, trié par ce qu'il débloque", () => {
    const c = conseiller(planifier("dragodinde", [m("amande_rousse", "M"), m("ebene_indigo", "F")], jusquA(4)), {});
    expect(c.prets[0].e.couleur).toBe("pourpre");
    expect(c.prets[0].debloque).toBeGreaterThan(0);
    expect(c.prets[0].niveauConseille).toBeNull();
  });
  it("captures avec le sexe nécessaire", () => {
    const c = conseiller(planifier("dragodinde", [m("amande", "F")], []), {});
    expect(c.captures.some((x) => x.couleur === "doree" && x.sexe === "M")).toBe(true);
  });
  it("priorité : terminer un succès de génération d'abord", () => {
    // Toutes les G2-G4 obtenues sauf Amande et Indigo ; Pourpre (G5) débloque bien plus d'étapes.
    const obtenues = jusquA(4).filter((c) => c !== "amande_indigo");
    const etable = [m("amande", "M"), m("indigo", "F"), m("amande_rousse", "M"), m("ebene_indigo", "F")];
    const c = conseiller(planifier("dragodinde", etable, obtenues), {});
    expect(c.ordre[0].e.couleur).toBe("amande_indigo");
    expect(c.ordre[0].termineSucces).toBe(true);
    expect(c.ordre[0].rang).toBe(1);
    expect(c.ordre.find((a) => a.e.couleur === "pourpre")!.rang).toBeGreaterThan(1);
    expect(new Set(c.ordre.map((a) => a.e.couleur)).size).toBe(c.ordre.length);
  });
  it("priorité : à égalité de succès, ce qui est prêt passe avant ce qui est à préparer", () => {
    const obtenues = [...jusquA(4).filter((c) => c !== "amande_indigo"), "pourpre"];
    const etable = [m("amande", "M"), m("indigo", "F"), m("doree_rousse", "M", { etat: "fertile" }), m("ebene_indigo", "F")];
    const c = conseiller(planifier("dragodinde", etable, obtenues), {});
    expect(c.ordre.map((a) => a.e.couleur).slice(0, 2)).toEqual(["amande_indigo", "orchidee"]);
  });
  it("signale un blocage de sexe", () => {
    const c = conseiller(planifier("dragodinde", [m("amande_rousse", "F"), m("ebene_indigo", "F")], jusquA(4)), {});
    expect(c.blocages.some((b) => b.e.couleur === "pourpre")).toBe(true);
  });
});
