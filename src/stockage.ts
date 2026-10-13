// Sauvegarde locale : fichier JSON dans le dossier AppData de l'application (Tauri),
// ou localStorage quand l'interface tourne dans un navigateur (développement, version web).
import { useEffect, useRef, useState } from "react";
import { sauvegardeVide } from "./moteur/actions";
import type { Sauvegarde } from "./moteur/types";

const FICHIER = "lignee-sauvegarde.json";
const enTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function lire(): Promise<Sauvegarde> {
  try {
    let texte: string | null;
    if (enTauri) {
      const fs = await import("@tauri-apps/plugin-fs");
      texte = (await fs.exists(FICHIER, { baseDir: fs.BaseDirectory.AppData })) ? await fs.readTextFile(FICHIER, { baseDir: fs.BaseDirectory.AppData }) : null;
    } else texte = localStorage.getItem(FICHIER);
    return texte ? { ...sauvegardeVide(), ...JSON.parse(texte) } : sauvegardeVide();
  } catch (e) {
    console.error("Lecture de la sauvegarde impossible", e);
    return sauvegardeVide();
  }
}

async function ecrire(s: Sauvegarde) {
  const texte = JSON.stringify(s, null, 1);
  if (enTauri) {
    const fs = await import("@tauri-apps/plugin-fs");
    await fs.mkdir("", { baseDir: fs.BaseDirectory.AppData, recursive: true }).catch(() => {});
    await fs.writeTextFile(FICHIER, texte, { baseDir: fs.BaseDirectory.AppData });
  } else localStorage.setItem(FICHIER, texte);
}

/** État de l'application, chargé au démarrage et enregistré automatiquement à chaque modification. */
export function useSauvegarde() {
  const [s, setS] = useState<Sauvegarde | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const minuteur = useRef<number>();

  useEffect(() => {
    lire().then(setS);
  }, []);

  useEffect(() => {
    if (!s) return;
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => {
      ecrire(s).then(() => setErreur(null), (e) => setErreur(String(e)));
    }, 400);
  }, [s]);

  return { s, setS, erreur };
}
