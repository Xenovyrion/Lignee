import { describe, expect, it } from "vitest";
import { clonerPlusieurs, enregistrerNaissances, sauvegardeVide } from "./actions";
import { actionsMaintenant, conseiller, conseillerMakina, prochainObjectif, seancesDesEtapes, seancesSuivantes } from "./conseils";
import { couleurs } from "./donnees";
import { planifier, regrouperClonages, suggererClonages } from "./planificateur";
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
  it("prochain objectif : succès de plus basse génération et chemin pour y arriver", () => {
    // G2 à G5 obtenues mais plus de Pourpre en stock : la G6 exige de refaire Ébène-Indigo puis Pourpre.
    const obtenues = jusquA(5);
    const etable = [m("indigo", "M"), m("ebene", "F"), m("amande_rousse", "M"), m("doree", "F")];
    const plan = planifier("dragodinde", etable, obtenues);
    const o = prochainObjectif(plan)!;
    expect(o.generation).toBe(6);
    expect(o.manquantes).toHaveLength(11);
    const couleursChemin = o.chemin.map((i) => plan.etapes[i].couleur);
    expect(couleursChemin[couleursChemin.length - 1]).toBe(o.cible);
    expect(new Set(couleursChemin).has("ebene_indigo") || new Set(couleursChemin).has("orchidee")).toBe(true);
    expect(prochainObjectif(planifier("dragodinde", [], couleurs("dragodinde").map((c) => c.id)))).toBeNull();
  });
  it("blocages : un seul par couleur et par cause, avec le nombre d'étapes touchées", () => {
    const etable = [m("amande_rousse", "F"), m("ebene_indigo", "F")];
    const c = conseiller(planifier("dragodinde", etable, jusquA(4)), {});
    const cles = c.blocages.map((b) => b.e.couleur + b.message);
    expect(new Set(cles).size).toBe(cles.length);
  });
  it("signale un blocage de sexe", () => {
    const c = conseiller(planifier("dragodinde", [m("amande_rousse", "F"), m("ebene_indigo", "F")], jusquA(4)), {});
    expect(c.blocages.some((b) => b.e.couleur === "pourpre")).toBe(true);
  });
});

describe("séances", () => {
  it("regroupe les accouplements identiques et numérote les séances", () => {
    // 2 couples Ebène × Indigo faisables tout de suite ; leurs bébés servent à la séance suivante.
    const etable = [m("ebene", "M"), m("ebene", "M"), m("indigo", "F"), m("indigo", "F"), m("doree_rousse", "F"), m("amande_rousse", "F")];
    const plan = planifier("dragodinde", etable, jusquA(5).filter((x) => !["ebene_indigo", "orchidee", "pourpre"].includes(x)));
    const c = conseiller(plan, {});
    const ei = c.ordre.filter((a) => a.e.couleur === "ebene_indigo");
    expect(ei).toHaveLength(1);
    expect(ei[0].nombre).toBe(2);
    const num = seancesDesEtapes(plan);
    for (const a of c.ordre) expect(num[a.etape]).toBe(1);
    const suivantes = seancesSuivantes(plan);
    expect(suivantes[0].numero).toBe(2);
    expect(suivantes.every((s, i) => i === 0 || s.numero > suivantes[i - 1].numero)).toBe(true);
  });
});

describe("actions groupées", () => {
  it("enregistre plusieurs naissances et clonages d'un coup", () => {
    let s = sauvegardeVide();
    s = { ...s, montures: [m("ebene", "M"), m("ebene", "M"), m("indigo", "F"), m("indigo", "F")] };
    const [p1, p2, f1, f2] = s.montures.map((x) => x.id);
    const bebes = [
      { couleur: "ebene_indigo", sexe: "M" as Sexe },
      { couleur: "ebene_indigo", sexe: "F" as Sexe },
      { couleur: "ebene", sexe: "F" as Sexe },
    ];
    s = enregistrerNaissances(s, [{ pereId: p1, mereId: f1 }, { pereId: p2, mereId: f2 }], bebes);
    expect(s.montures.filter((x) => x.etat === "sterile")).toHaveLength(4);
    expect(s.montures.filter((x) => x.origine === "naissance")).toHaveLength(3);
    expect(() => enregistrerNaissances(s, [{ pereId: p1, mereId: f1 }], bebes)).toThrow();
    const groupes = regrouperClonages(suggererClonages(s.montures));
    const ebene = groupes.find((g) => g.memeCouleur && g.couleurs[0] === "ebene")!;
    expect(ebene.paires).toHaveLength(1);
    s = clonerPlusieurs(s, ebene.paires.map((p) => ({ idA: p.a.id, idB: p.b.id })), [{ couleur: "ebene", sexe: "M" }]);
    expect(s.montures.filter((x) => x.couleur === "ebene" && x.etat === "fertile")).toHaveLength(2);
  });
  it("numérote naissances prêtes, puis préparation, puis naissances en attente", () => {
    const tout = jusquA(10).filter((x) => x !== "ebene_indigo");
    // Féconde prête utilisée en priorité, même à niveau égal.
    const pret = conseiller(planifier("dragodinde", [m("ebene", "M", { etat: "fertile" }), m("ebene", "M"), m("indigo", "F")], tout), {});
    expect(actionsMaintenant(pret, []).map((x) => x.type)).toEqual(["naissance"]);
    // Parent à préparer : la préparation passe avant la naissance qui l'attend.
    const attente = conseiller(planifier("dragodinde", [m("ebene", "M", { etat: "fertile" }), m("indigo", "F")], tout), {});
    const liste = actionsMaintenant(attente, []);
    expect(liste.map((x) => x.type)).toEqual(["preparer", "naissance"]);
    expect(liste.map((x) => x.numero)).toEqual([1, 2]);
    expect((liste[1] as { a: { rang: number } }).a.rang).toBe(2);
  });
});
