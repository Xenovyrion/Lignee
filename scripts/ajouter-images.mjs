// Ajoute à chaque couleur l'adresse de son image officielle (servie par DofusDB, © Ankama).
// Seules les adresses sont enregistrées : aucune image n'est copiée dans le dépôt.
//   node scripts/ajouter-images.mjs
import { readFile, writeFile } from "node:fs/promises";

const FICHIER = new URL("../src/donnees/arbres_croisements_3.7.json", import.meta.url);
const TYPES = { dragodinde: 331, muldo: 332, volkorne: 333 }; // types d'objets « monture » du jeu

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

const donnees = JSON.parse(await readFile(FICHIER, "utf8"));
let manquantes = 0;
for (const [famille, type] of Object.entries(TYPES)) {
  // L'API renvoie 50 résultats au maximum par page.
  const data = [];
  for (let skip = 0; ; skip += 50) {
    const r = await fetch(`https://api.dofusdb.fr/items?typeId=${type}&$limit=50&$skip=${skip}&$select[]=name&$select[]=iconId`);
    const page = await r.json();
    data.push(...page.data);
    if (data.length >= page.total || page.data.length === 0) break;
  }
  const images = new Map(data.map((o) => [canon(o.name.fr), `https://api.dofusdb.fr/img/items/${o.iconId}.png`]));
  for (const c of donnees.familles[famille].couleurs) {
    c.image = images.get(canon(c.nom));
    if (!c.image) {
      manquantes++;
      console.log(`✗ pas d'image : ${famille} ${c.nom}`);
    }
  }
}
await writeFile(FICHIER, JSON.stringify(donnees, null, 1) + "\n");
console.log(manquantes ? `${manquantes} image(s) introuvable(s).` : "Toutes les couleurs ont leur image.");
