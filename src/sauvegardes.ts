// Copies de sécurité : sauvegardes automatiques (une par jour, dans AppData/sauvegardes, les 15
// plus récentes gardées), export vers un fichier choisi et import d'un fichier exporté.
import { sauvegardeVide } from "./moteur/actions";
import type { Sauvegarde } from "./moteur/types";

const enTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const DOSSIER = "sauvegardes";
const GARDER = 15;
const CLE_WEB = "lignee-copies";

export interface CopieAuto {
  nom: string;
  date: string; // AAAA-MM-JJ
}

const jour = () => new Date().toISOString().slice(0, 10);
const enTexte = (s: Sauvegarde) => JSON.stringify(s, null, 1);

/** Vérifie qu'un texte est bien une sauvegarde Lignée et la complète avec les valeurs par défaut. */
export function lireTexteSauvegarde(texte: string): Sauvegarde {
  let lue: Partial<Sauvegarde>;
  try {
    lue = JSON.parse(texte);
  } catch {
    throw new Error("Ce fichier n'est pas un JSON valide.");
  }
  if (!lue || !Array.isArray(lue.montures) || typeof lue.obtenues !== "object") throw new Error("Ce fichier n'est pas une sauvegarde Lignée.");
  const vide = sauvegardeVide();
  return { ...vide, ...lue, obtenues: { ...vide.obtenues, ...lue.obtenues }, options: { ...vide.options, ...lue.options } } as Sauvegarde;
}

/** Copie automatique du jour (remplace celle du même jour) et purge des plus anciennes. */
export async function copieAutomatique(s: Sauvegarde) {
  if (!s.montures.length && !s.journal.length) return; // rien à protéger
  if (!enTauri) {
    const copies: Record<string, string> = JSON.parse(localStorage.getItem(CLE_WEB) ?? "{}");
    copies[jour()] = enTexte(s);
    const garder = Object.keys(copies).sort().slice(-GARDER);
    localStorage.setItem(CLE_WEB, JSON.stringify(Object.fromEntries(garder.map((k) => [k, copies[k]]))));
    return;
  }
  const fs = await import("@tauri-apps/plugin-fs");
  const base = { baseDir: fs.BaseDirectory.AppData };
  await fs.mkdir(DOSSIER, { ...base, recursive: true }).catch(() => {});
  await fs.writeTextFile(`${DOSSIER}/lignee-${jour()}.json`, enTexte(s), base);
  const anciennes = (await listerCopies()).slice(GARDER);
  for (const c of anciennes) await fs.remove(`${DOSSIER}/${c.nom}`, base).catch(() => {});
}

/** Copies automatiques, de la plus récente à la plus ancienne. */
export async function listerCopies(): Promise<CopieAuto[]> {
  if (!enTauri) {
    const copies: Record<string, string> = JSON.parse(localStorage.getItem(CLE_WEB) ?? "{}");
    return Object.keys(copies)
      .sort()
      .reverse()
      .map((date) => ({ nom: date, date }));
  }
  const fs = await import("@tauri-apps/plugin-fs");
  const base = { baseDir: fs.BaseDirectory.AppData };
  if (!(await fs.exists(DOSSIER, base))) return [];
  return (await fs.readDir(DOSSIER, base))
    .map((e) => e.name)
    .filter((n) => /^lignee-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort()
    .reverse()
    .map((nom) => ({ nom, date: nom.slice(7, 17) }));
}

export async function lireCopie(c: CopieAuto): Promise<Sauvegarde> {
  if (!enTauri) return lireTexteSauvegarde(JSON.parse(localStorage.getItem(CLE_WEB) ?? "{}")[c.nom]);
  const fs = await import("@tauri-apps/plugin-fs");
  return lireTexteSauvegarde(await fs.readTextFile(`${DOSSIER}/${c.nom}`, { baseDir: fs.BaseDirectory.AppData }));
}

/** Exporte vers un fichier choisi par l'utilisateur. Renvoie le chemin, ou null si annulé. */
export async function exporter(s: Sauvegarde): Promise<string | null> {
  const nom = `lignee-${jour()}.json`;
  if (!enTauri) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([enTexte(s)], { type: "application/json" }));
    a.download = nom;
    a.click();
    URL.revokeObjectURL(a.href);
    return nom;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const chemin = await save({ defaultPath: nom, filters: [{ name: "Sauvegarde Lignée", extensions: ["json"] }] });
  if (!chemin) return null;
  const fs = await import("@tauri-apps/plugin-fs");
  await fs.writeTextFile(chemin, enTexte(s));
  return chemin;
}

/** Ouvre un fichier exporté. Renvoie la sauvegarde lue, ou null si annulé. */
export async function importer(): Promise<Sauvegarde | null> {
  if (!enTauri) {
    return new Promise((ok, ko) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json";
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return ok(null);
        f.text().then((t) => {
          try {
            ok(lireTexteSauvegarde(t));
          } catch (e) {
            ko(e);
          }
        });
      };
      input.click();
    });
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const chemin = await open({ multiple: false, directory: false, filters: [{ name: "Sauvegarde Lignée", extensions: ["json"] }] });
  if (!chemin) return null;
  const fs = await import("@tauri-apps/plugin-fs");
  return lireTexteSauvegarde(await fs.readTextFile(chemin));
}
