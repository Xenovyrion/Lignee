import { describe, expect, it } from "vitest";
import { concerneElevage, dateParis, effet, jourSuivant, minuitParis } from "./almanax";
import { simuler } from "./moteur/enclos";

const j = (description: string, id = "x") => ({ id, description });

describe("Almanax", () => {
  it("reconnaît les bonus d'élevage (descriptions réelles de l'API)", () => {
    expect(effet(j("Lors des accouplements de montures, un bonus de 20 % est ajouté aux chances d'obtenir la génération cible.", "growing-generation"))).toEqual({ generation: true });
    expect(effet(j("Dans les enclos, l'effet des foudroyeurs est doublé."))).toEqual({ jauge: "endurance" });
    expect(effet(j("Dans les enclos, l'effet des abreuvoirs est doublé."))).toEqual({ jauge: "maturite" });
    expect(effet(j("Dans les enclos, l'effet des dragofesses est doublé."))).toEqual({ jauge: "amour" });
    expect(effet(j("Dans les enclos, l'effet des mangeoires est doublé."))).toEqual({ jauge: "mangeoire" });
    expect(effet(j("Toutes les montures qui naissent ce jour auront la capacité Précoce."))).toEqual({ capacite: "precoce" });
    expect(effet(j("Toutes les montures qui naissent ce jour auront la capacité Sage."))).toEqual({ capacite: "sage" });
    expect(concerneElevage("Les Éleveurs économisent 15 % de leurs ingrédients lorsqu'ils fabriquent des objets.")).toBe(true);
    expect(concerneElevage("Les Bûcherons économisent 15 % de leurs ingrédients lorsqu'ils fabriquent des objets.")).toBe(false);
  });

  it("suit le jour de Paris, heure d'été comme d'hiver", () => {
    expect(minuitParis("2026-11-19")).toBe(Date.UTC(2026, 10, 18, 23));
    expect(minuitParis("2026-07-10")).toBe(Date.UTC(2026, 6, 9, 22));
    expect(dateParis(Date.UTC(2026, 10, 18, 23, 30))).toBe("2026-11-19");
    expect(jourSuivant("2026-10-25")).toBe("2026-10-26");
  });

  it("double le gain de la jauge concernée pendant le jour d'Almanax", () => {
    const base = { jauges: [{ type: "amour" as const, charge: 80_000 }], niveauDepart: 1, niveauCible: 1, debut: "2026-12-10T08:00:00Z" };
    const normal = simuler(base).fin!;
    const double = simuler({ ...base, doubles: [{ type: "amour", debut: minuitParis("2026-12-10"), fin: minuitParis("2026-12-11") }] }).fin!;
    expect(normal).toBe(20_000);
    expect(double).toBe(10_000);
    // Une autre jauge doublée ne change rien.
    expect(simuler({ ...base, doubles: [{ type: "maturite", debut: 0, fin: Number.MAX_SAFE_INTEGER }] }).fin).toBe(normal);
  });
});
