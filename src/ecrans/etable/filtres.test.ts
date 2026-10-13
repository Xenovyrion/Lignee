import { describe, expect, it } from "vitest";
import type { Monture } from "../../moteur/types";
import { filtreVide, filtrer, trier, trouverCouleur } from "./filtres";

const m = (id: string, couleur: string, extra: Partial<Monture> = {}): Monture => ({
  id, famille: "dragodinde", couleur, sexe: "F", niveau: 100, etat: "fertile", origine: "saisie", creeLe: "", ...extra,
});
const etable = [m("a", "amande"), m("b", "ebene_indigo", { sexe: "M", niveau: 150 }), m("c", "pourpre", { etat: "sterile" }), m("d", "indigo")];

describe("filtres de l'étable", () => {
  it("recherche sans accents, mots dans le désordre", () => {
    expect(filtrer(etable, "dragodinde", { ...filtreVide(), texte: "indigo eben" }, new Set()).map((x) => x.id)).toEqual(["b"]);
  });
  it("combine génération, sexe, état et niveau", () => {
    expect(filtrer(etable, "dragodinde", { ...filtreVide(), generations: [3, 4] }, new Set()).map((x) => x.id)).toEqual(["b", "d"]);
    expect(filtrer(etable, "dragodinde", { ...filtreVide(), sexes: ["M"], niveauMin: 120 }, new Set()).map((x) => x.id)).toEqual(["b"]);
    expect(filtrer(etable, "dragodinde", { ...filtreVide(), etats: ["sterile"] }, new Set()).map((x) => x.id)).toEqual(["c"]);
  });
  it("réservées par le plan / libres", () => {
    expect(filtrer(etable, "dragodinde", { ...filtreVide(), plan: "libres" }, new Set(["a", "b"])).map((x) => x.id)).toEqual(["c", "d"]);
  });
  it("tri par niveau décroissant", () => {
    expect(trier(etable, "dragodinde", { cle: "niveau", sens: -1 })[0].id).toBe("b");
  });
  it("retrouve une couleur depuis une saisie partielle", () => {
    expect(trouverCouleur("dragodinde", "eb ind")).toBe("ebene_indigo");
    expect(trouverCouleur("dragodinde", "Ébène et Indigo (G4)")).toBe("ebene_indigo");
    expect(trouverCouleur("dragodinde", "indigo")).toBe("indigo"); // nom exact prioritaire
    expect(trouverCouleur("dragodinde", "amande")).toBe("amande");
    expect(trouverCouleur("dragodinde", "pourp")).toBeNull(); // ambigu : Pourpre et ses bicolores
    expect(trouverCouleur("dragodinde", "xyz")).toBeNull();
  });
});
