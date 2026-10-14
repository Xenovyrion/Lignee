import { describe, expect, it } from "vitest";
import { couleurs } from "./donnees";
import { besoinsParCouleur, nombreEnclos, prochainPalierEnclos } from "./etable";
import { planifier } from "./planificateur";
import type { Monture, Sexe } from "./types";

let n = 0;
const m = (c: string, sexe: Sexe, extra: Partial<Monture> = {}): Monture => ({
  id: `e${++n}`, famille: "dragodinde", couleur: c, sexe, niveau: 100, etat: "fertile", origine: "saisie", creeLe: "", ...extra,
});

describe("étable", () => {
  it("besoins par couleur : stock, montures utilisées ou libres, naissances et captures prévues", () => {
    const obtenues = couleurs("dragodinde").filter((c) => c.generation <= 4).map((c) => c.id);
    const etable = [m("amande_rousse", "M"), m("amande_rousse", "M", { niveau: 150 }), m("ebene_indigo", "F", { etat: "feconde" }), m("pourpre", "F", { etat: "sterile" })];
    const plan = planifier("dragodinde", etable, obtenues);
    const b = besoinsParCouleur("dragodinde", etable, plan);
    const ar = b.get("amande_rousse")!;
    expect([ar.males, ar.femelles, ar.niveauMax]).toEqual([2, 0, 150]);
    expect(ar.utilisees + ar.libres).toBe(2);
    expect(b.get("ebene_indigo")!.fecondes).toBe(1);
    expect(b.get("pourpre")!.steriles).toBe(1);
    expect(b.get("pourpre")!.aProduire).toBeGreaterThan(0);
    expect(Object.keys(plan.captures).every((c) => b.get(c)!.aCapturer > 0)).toBe(true);
  });
  it("nombre d'enclos selon le niveau du métier Éleveur", () => {
    expect([1, 39, 40, 119, 120, 199, 200].map(nombreEnclos)).toEqual([1, 1, 2, 3, 4, 5, 6]);
    expect(prochainPalierEnclos(85)).toBe(120);
    expect(prochainPalierEnclos(200)).toBeNull();
  });
});
