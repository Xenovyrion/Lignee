// Minuteurs d'enclos : simulation des jauges (règles 3.7, docs/REFERENCE_ELEVAGE_3.7.md section 6).
import { describe, expect, it } from "vitest";
import { CRANS, simuler, xpNiveau, type JaugeEnclos } from "./enclos";

const sim = (jauges: JaugeEnclos[], niveauDepart = 1, niveauCible = 1, sereniteDepart?: number) => simuler({ jauges, niveauDepart, niveauCible, sereniteDepart });

describe("minuteurs d'enclos", () => {
  it("Maturité seule : 20 000 points à 10 par tic au T1, à 40 au T4", () => {
    expect(sim([{ type: "maturite", charge: 80_000 }]).fin).toBe(20_000);
    expect(sim([{ type: "maturite", charge: 200_000 }]).fin).toBe(5_000);
  });

  it("la jauge redescend de palier en se vidant", () => {
    // 80 040 : deux tics au T2 (20 + 20, la charge passe à 80 000), puis 1 996 tics au T1.
    expect(sim([{ type: "maturite", charge: 80_040 }]).fin).toBe(19_980);
  });

  it("Baffeur + Endurance : la sérénité bornée à −5 000 reste dans la zone", () => {
    const r = sim([
      { type: "baffeur", charge: 80_000 },
      { type: "endurance", charge: 80_000 },
    ]);
    expect(r.fin).toBe(20_000);
    expect(r.evenements.some((e) => e.type === "zone")).toBe(false);
  });

  it("Baffeur + Maturité : prévient quand la sérénité passe sous −2 000", () => {
    const r = sim([
      { type: "baffeur", charge: 80_000 },
      { type: "maturite", charge: 80_000 },
    ]);
    const zone = r.evenements.find((e) => e.type === "zone");
    expect(zone?.t).toBe(2_010);
    expect(r.fin).toBeUndefined();
    expect(r.evenements[r.evenements.length - 1].type).toBe("arret");
  });

  it("sérénité de départ déduite : Amour seul progresse (montures supposées en zone positive)", () => {
    expect(sim([{ type: "amour", charge: 80_000 }]).fin).toBe(20_000);
    expect(sim([{ type: "endurance", charge: 80_000 }]).fin).toBe(20_000);
  });

  it("Caresseur + Maturité depuis +1 500 : sort de la zone après 500 points", () => {
    const r = sim([{ type: "caresseur", charge: 80_000 }, { type: "maturite", charge: 80_000 }], 1, 1, 1500);
    expect(r.evenements.find((e) => e.type === "zone")?.t).toBe(510);
  });

  it("Endurance sans Baffeur depuis une sérénité neutre : rien ne progresse, conseil immédiat", () => {
    const r = sim([{ type: "endurance", charge: 200_000 }], 1, 1, 0);
    expect(r.evenements).toHaveLength(1);
    expect(r.evenements[0]).toMatchObject({ type: "arret", t: 10 });
    expect(r.evenements[0].texte).toContain("Baffeur");
  });

  it("jauge vide avant la fin", () => {
    const r = sim([{ type: "amour", charge: 10_000 }, { type: "caresseur", charge: 200_000 }]);
    expect(r.evenements.some((e) => e.cle === "vide-amour")).toBe(true);
    expect(r.fin).toBeUndefined();
  });

  it("Mangeoire : plafonnée au niveau visé", () => {
    const r = sim([{ type: "mangeoire", charge: 200_000 }], 1, 20);
    expect(r.caracs.mangeoire).toBe(xpNiveau(20));
    expect(r.fin).toBeGreaterThan(0);
    expect(xpNiveau(100)).toBe(172_668);
    expect(xpNiveau(200)).toBe(867_582);
  });

  it("crans de la saisie approximative", () => {
    expect(CRANS.map((c) => c.charge)).toEqual([40_000, 80_000, 110_000, 140_000, 160_000, 180_000, 190_000, 200_000]);
  });
});
