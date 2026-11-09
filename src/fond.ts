// Image de fond personnalisée : l'utilisateur choisit une image sur son PC, elle est copiée dans
// le dossier de l'application (AppData) ; dans le navigateur, elle est gardée dans localStorage.
import catalogue from "./donnees/fonds-ankama.json";

const enTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const CLE_WEB = "lignee-fond";
const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** Ouvre le sélecteur d'image et copie l'image choisie. Renvoie son nom, ou null si annulé. */
export async function choisirFond(): Promise<string | null> {
  if (!enTauri) {
    return new Promise((ok) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return ok(null);
        const lecteur = new FileReader();
        lecteur.onload = () => {
          try {
            localStorage.setItem(CLE_WEB, String(lecteur.result));
            ok(f.name);
          } catch {
            alert("Image trop lourde pour la version navigateur.");
            ok(null);
          }
        };
        lecteur.readAsDataURL(f);
      };
      input.click();
    });
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const chemin = await open({ multiple: false, directory: false, filters: [{ name: "Images", extensions: Object.keys(TYPES) }] });
  if (!chemin) return null;
  const fs = await import("@tauri-apps/plugin-fs");
  const ext = chemin.split(".").pop()!.toLowerCase();
  const nom = `fond-${Date.now()}.${ext}`;
  await fs.writeFile(nom, await fs.readFile(chemin), { baseDir: fs.BaseDirectory.AppData });
  return nom;
}

/** Galerie : fonds d'écran officiels d'Ankama (liens seulement, images chargées depuis leur site). */
export const FONDS_ANKAMA: { id: string; titre: string; vignette: string; image: string }[] = catalogue.fonds;
export const SOURCE_FONDS = catalogue.source;
const PREFIXE = "ankama:";
export const valeurGalerie = (id: string) => PREFIXE + id;
export const idGalerie = (nom: string) => (nom.startsWith(PREFIXE) ? nom.slice(PREFIXE.length) : null);

/** URL affichable de l'image de fond (null si absente). */
export async function urlFond(nom: string): Promise<string | null> {
  if (!nom) return null;
  const id = idGalerie(nom);
  if (id) return FONDS_ANKAMA.find((f) => f.id === id)?.image ?? null;
  if (!enTauri) return localStorage.getItem(CLE_WEB);
  const fs = await import("@tauri-apps/plugin-fs");
  if (!(await fs.exists(nom, { baseDir: fs.BaseDirectory.AppData }))) return null;
  const octets = await fs.readFile(nom, { baseDir: fs.BaseDirectory.AppData });
  return URL.createObjectURL(new Blob([octets], { type: TYPES[nom.split(".").pop()!.toLowerCase()] ?? "image/png" }));
}

/** Supprime le fichier de l'image de fond. */
export async function supprimerFond(nom: string) {
  if (!nom || idGalerie(nom)) return;
  if (!enTauri) return localStorage.removeItem(CLE_WEB);
  const fs = await import("@tauri-apps/plugin-fs");
  await fs.remove(nom, { baseDir: fs.BaseDirectory.AppData }).catch(() => {});
}
