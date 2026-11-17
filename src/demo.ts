// Étable de démonstration utilisée par la visite guidée : quelques Dragodindes choisies pour que chaque
// type de carte apparaisse (accouplement prêt, clonage, montures à préparer, captures).
// Elle n'est jamais enregistrée : la vraie sauvegarde reste intacte pendant et après la visite.
import type { Etat, Monture, Options, Sauvegarde, Sexe } from "./moteur/types";

const STOCK: [couleur: string, sexe: Sexe, etat: Etat, nombre: number][] = [
  ["amande", "M", "feconde", 1],
  ["amande", "F", "feconde", 1],
  ["amande", "F", "fertile", 1],
  ["doree", "M", "feconde", 1],
  ["doree", "F", "feconde", 1],
  ["rousse", "M", "fertile", 2],
  ["rousse", "F", "fertile", 1],
  ["amande_doree", "M", "sterile", 1],
  ["amande_doree", "F", "sterile", 1],
];

export function construireDemo(options: Options): Sauvegarde {
  const montures: Monture[] = [];
  const creeLe = new Date(0).toISOString();
  for (const [couleur, sexe, etat, nombre] of STOCK)
    for (let i = 0; i < nombre; i++)
      montures.push({
        id: `demo-${couleur}-${sexe}-${etat}-${i}`,
        famille: "dragodinde",
        couleur,
        sexe,
        etat,
        niveau: options.niveauParDefaut,
        origine: couleur.includes("_") ? "naissance" : "capture",
        parents: couleur === "amande_doree" ? ["amande", "doree"] : undefined,
        creeLe,
      });
  return {
    version: 1,
    montures,
    journal: [],
    obtenues: { dragodinde: [], muldo: [], volkorne: [] },
    // Réglages de l'utilisateur (thème, fond…), mais suivi simple et choix de makina automatique.
    options: { ...options, modeSuivi: "simple", makina: "auto", takeza: false },
  };
}
