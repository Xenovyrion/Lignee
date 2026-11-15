// Mises à jour automatiques : vérifie la dernière release GitHub (fichier latest.json signé),
// télécharge l'installeur, l'installe puis relance l'application.
const enTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export interface MiseAJour {
  version: string;
  notes?: string;
  /** Télécharge et installe ; `progression` reçoit un pourcentage (ou null si inconnu). */
  installer: (progression: (pct: number | null) => void) => Promise<void>;
}

export async function versionActuelle(): Promise<string | null> {
  if (!enTauri) return null;
  const { getVersion } = await import("@tauri-apps/api/app");
  return getVersion();
}

/** Renvoie la mise à jour disponible, ou null si l'application est à jour (ou hors application). */
export async function chercherMiseAJour(): Promise<MiseAJour | null> {
  if (!enTauri) return null;
  const { check } = await import("@tauri-apps/plugin-updater");
  const maj = await check();
  if (!maj) return null;
  return {
    version: maj.version,
    notes: maj.body ?? undefined,
    installer: async (progression) => {
      let total = 0;
      let recu = 0;
      await maj.downloadAndInstall((e) => {
        if (e.event === "Started") total = e.data.contentLength ?? 0;
        if (e.event === "Progress") {
          recu += e.data.chunkLength;
          progression(total ? Math.min(100, Math.round((100 * recu) / total)) : null);
        }
      });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  };
}
