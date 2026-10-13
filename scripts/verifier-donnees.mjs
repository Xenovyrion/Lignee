// Compare src/donnees/arbres_croisements_3.7.json aux objectifs officiels des succès d'élevage
// (données du jeu exposées par api.dofusdb.fr). À relancer après chaque mise à jour de Dofus :
//   npm run verifier-donnees
import { readFile } from "node:fs/promises";

const API = "https://api.dofusdb.fr";
const CATEGORIES = { dragodinde: 78, muldo: 79, volkorne: 80 };
const ORDINAUX = { Deuxième: 2, Troisième: 3, Quatrième: 4, Cinquième: 5, Sixième: 6, Septième: 7, Huitième: 8, Neuvième: 9, Dixième: 10 };

const canon = (n) =>
  n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(dragodinde|muldo|volkorne) /, "")
    .replace(/aigue-marine/g, "aiguemarine")
    .replace(/ et /g, "_")
    .replace(/-/g, "_")
    .replace(/doree?/g, "dore")
    .replace(/rousse/g, "roux")
    .split("_")
    .sort()
    .join("+");

const get = async (chemin) => {
  const r = await fetch(API + chemin);
  if (!r.ok) throw new Error(`${r.status} sur ${chemin}`);
  return r.json();
};

const donnees = JSON.parse(await readFile(new URL("../src/donnees/arbres_croisements_3.7.json", import.meta.url), "utf8"));
let erreurs = 0;

for (const [famille, cat] of Object.entries(CATEGORIES)) {
  const { data: succes } = await get(`/achievements?categoryId=${cat}&$limit=50`);
  for (const s of succes) {
    const desc = s.description.fr;
    const gen = desc.startsWith("Capturer") ? 1 : ORDINAUX[Object.keys(ORDINAUX).find((o) => desc.toLowerCase().includes(o.toLowerCase()))];
    if (!gen) continue; // succès « méta » (obtenir les succès suivants)
    const ids = s.objectiveIds.map((i) => `id[$in][]=${i}`).join("&");
    const { data: objectifs } = await get(`/achievement-objectives?$limit=50&${ids}`);
    const officiel = new Set(objectifs.map((o) => canon(o.name.fr)));
    const local = new Set(donnees.familles[famille].couleurs.filter((c) => c.generation === gen).map((c) => canon(c.nom)));
    const manquent = [...officiel].filter((x) => !local.has(x));
    const enTrop = [...local].filter((x) => !officiel.has(x));
    if (manquent.length || enTrop.length) {
      erreurs++;
      console.log(`✗ ${famille} G${gen} — absentes des données : ${manquent.join(", ") || "—"} ; en trop : ${enTrop.join(", ") || "—"}`);
    } else console.log(`✓ ${famille} G${gen} (${officiel.size})`);
  }
}

console.log(erreurs ? `\n${erreurs} écart(s) avec le jeu.` : "\nDonnées conformes aux succès officiels.");
process.exit(erreurs ? 1 : 0);
