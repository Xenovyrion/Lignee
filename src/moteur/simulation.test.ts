// Simulation d'un élevage complet, de l'étable vide à 100 % des succès, en suivant les conseils :
// le plan ne doit jamais se bloquer, même quand les sexes des bébés et des clones tombent au hasard.
import { describe, expect, it } from "vitest";
import { cloner, enregistrerNaissance, nouvelId, sauvegardeVide } from "./actions";
import { conseiller } from "./conseils";
import { objectifs } from "./donnees";
import { planifier, suggererClonages } from "./planificateur";
import type { Famille, Monture, Sauvegarde, Sexe } from "./types";

/** Générateur pseudo-aléatoire déterministe (résultats reproductibles). */
function hasard(graine: number) {
  let x = graine;
  return () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 < 0.5 ? "M" : "F") as Sexe;
}

const feconder = (s: Sauvegarde): Sauvegarde => ({ ...s, montures: s.montures.map((m) => (m.etat === "fertile" ? { ...m, etat: "feconde" as const, niveau: 100 } : m)) });

function simuler(f: Famille, graine: number) {
  const sexe = hasard(graine);
  let s = sauvegardeVide();
  let blocages = 0;
  for (let tour = 0; tour < 1000; tour++) {
    const plan = planifier(f, s.montures, s.obtenues[f]);
    if (!plan.etapes.length) break;
    const c = conseiller(plan, {});
    blocages += c.blocages.length;
    const naissances = [...c.prets, ...c.aPreparer];
    if (naissances.length) {
      for (const a of naissances) {
        const libre = (id: string) => s.montures.some((m) => m.id === id && m.etat !== "sterile");
        if (libre(a.pere.id) && libre(a.mere.id)) s = enregistrerNaissance(s, a.pere.id, a.mere.id, [{ couleur: a.e.couleur, sexe: a.e.sexeVoulu ?? sexe() }]);
      }
    } else if (c.clonagesUtiles) {
      for (const p of suggererClonages(s.montures.filter((m) => m.famille === f)).filter((p) => p.memeCouleur)) s = cloner(s, p.a.id, p.b.id, { couleur: p.a.couleur, sexe: sexe() });
    } else if (c.captures.length) {
      const prises: Monture[] = c.captures.flatMap((k) =>
        [...Array(k.M).fill("M"), ...Array(k.F).fill("F"), ...Array.from({ length: k.libres }, sexe)].map((sx: Sexe) => ({ id: nouvelId(), famille: f, couleur: k.couleur, sexe: sx, niveau: 100, etat: "feconde" as const, origine: "capture" as const, creeLe: "" })),
      );
      s = { ...s, montures: [...s.montures, ...prises] };
    } else break;
    s = feconder(s);
  }
  return { manquantes: objectifs(f).filter((o) => !s.obtenues[f].includes(o.id)).length, blocages };
}

describe("simulation d'un élevage complet", () => {
  for (const f of ["dragodinde", "muldo", "volkorne"] as Famille[])
    it(`${f} : toutes les couleurs obtenues, sans blocage de sexe`, () => {
      for (const graine of [1, 2]) expect(simuler(f, graine)).toEqual({ manquantes: 0, blocages: 0 });
      // Centaines de plans recalculés : plusieurs secondes sur les machines lentes de l'intégration continue.
    }, 30_000);
});
