// Mode compagnon : la fenêtre devient compacte et reste au premier plan, à côté du jeu.
// Taille et position d'origine sont mémorisées pour être rétablies en quittant le mode.
const enTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const TAILLE_COMPAGNON = { largeur: 420, hauteur: 720 };
const MIN_NORMAL = { largeur: 960, hauteur: 600 };

let avant: { l: number; h: number; x: number; y: number; agrandie: boolean } | null = null;

export async function entrerCompagnon() {
  if (!enTauri) return;
  const { getCurrentWindow, LogicalSize } = await import("@tauri-apps/api/window");
  const f = getCurrentWindow();
  const agrandie = await f.isMaximized();
  if (agrandie) await f.unmaximize();
  const [taille, position] = await Promise.all([f.innerSize(), f.outerPosition()]);
  avant = { l: taille.width, h: taille.height, x: position.x, y: position.y, agrandie };
  await f.setMinSize(new LogicalSize(340, 420));
  await f.setSize(new LogicalSize(TAILLE_COMPAGNON.largeur, TAILLE_COMPAGNON.hauteur));
  await f.setAlwaysOnTop(true);
}

export async function quitterCompagnon() {
  if (!enTauri) return;
  const { getCurrentWindow, LogicalSize, PhysicalSize, PhysicalPosition } = await import("@tauri-apps/api/window");
  const f = getCurrentWindow();
  await f.setAlwaysOnTop(false);
  await f.setMinSize(new LogicalSize(MIN_NORMAL.largeur, MIN_NORMAL.hauteur));
  if (avant) {
    await f.setSize(new PhysicalSize(avant.l, avant.h));
    await f.setPosition(new PhysicalPosition(avant.x, avant.y));
    if (avant.agrandie) await f.maximize();
  } else await f.setSize(new LogicalSize(1280, 820));
  avant = null;
}

/** Garder (ou non) la fenêtre compacte au-dessus du jeu. */
export async function epingler(oui: boolean) {
  if (!enTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow().setAlwaysOnTop(oui);
}
