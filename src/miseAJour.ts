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

export interface NoteVersion {
  version: string;
  date: string;
  notes: string;
  url: string;
}

/** Notes de version publiées sur GitHub, de la plus récente à la plus ancienne. */
export async function notesDesVersions(): Promise<NoteVersion[]> {
  const r = await fetch("https://api.github.com/repos/Xenovyrion/Lignee/releases?per_page=30", { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error(`GitHub a répondu ${r.status}`);
  const liste: { tag_name: string; published_at: string; body: string | null; html_url: string; draft: boolean }[] = await r.json();
  return liste.filter((x) => !x.draft).map((x) => ({ version: x.tag_name.replace(/^v/, ""), date: x.published_at, notes: x.body ?? "", url: x.html_url }));
}

const CLE_VERSION_VUE = "lignee-version-vue";

/** Version installée si elle n'a pas encore été présentée (juste après une mise à jour), sinon null. */
export async function versionNouvellementInstallee(): Promise<string | null> {
  const v = await versionActuelle();
  if (!v) return null;
  let vue: string | null = null;
  try {
    vue = localStorage.getItem(CLE_VERSION_VUE);
    localStorage.setItem(CLE_VERSION_VUE, v);
  } catch {
    return null;
  }
  // Premier lancement : rien à présenter.
  return vue && vue !== v ? v : null;
}
