import { describe, expect, it } from "vitest";
import { sauvegardeVide } from "./moteur/actions";
import { lireTexteSauvegarde } from "./sauvegardes";

describe("import de sauvegarde", () => {
  it("relit un export et complète les options manquantes", () => {
    const s = sauvegardeVide();
    const ancien = { ...s, options: { takeza: true } };
    const lue = lireTexteSauvegarde(JSON.stringify(ancien));
    expect(lue.options.takeza).toBe(true);
    expect(lue.options.modeSuivi).toBe("simple");
    expect(lue.obtenues.muldo).toEqual([]);
  });
  it("refuse un fichier qui n'est pas une sauvegarde Lignée", () => {
    expect(() => lireTexteSauvegarde("pas du json")).toThrow("JSON");
    expect(() => lireTexteSauvegarde(JSON.stringify({ a: 1 }))).toThrow("Lignée");
  });
});
