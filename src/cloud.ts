// Sauvegarde cloud : copie de la sauvegarde dans le dossier synchronisé par OneDrive ou Google Drive pour
// ordinateur (l'envoi en ligne est fait par leur application). Réglage propre à ce PC (localStorage) :
// le chemin du dossier n'a pas de sens sur une autre machine, il n'est donc pas dans la sauvegarde.
import type { Sauvegarde } from "./moteur/types";
import { journaliser } from "./diagnostic";
import { lireTexteSauvegarde } from "./sauvegardes";

const enTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const CLE = "lignee-cloud";
/** Au plus une copie toutes les 5 minutes pendant l'utilisation (plus une au démarrage). */
const INTERVALLE = 5 * 60 * 1000;

/** Seule l'application Windows peut écrire dans un dossier synchronisé. */
export const cloudDisponible = enTauri;

export type Fournisseur = "onedrive" | "googledrive" | "autre";
export const FOURNISSEURS: Record<Fournisseur, string> = {
  onedrive: "OneDrive",
  googledrive: "Google Drive",
  autre: "Autre dossier",
};

export interface ConfigCloud {
  actif: boolean;
  fournisseur: Fournisseur;
  dossier: string;
  /** Dernière copie réussie (ISO). */
  derniere?: string;
}

export interface DossierCloud {
  fournisseur: "onedrive" | "googledrive";
  chemin: string;
}

export function lireCloud(): ConfigCloud | null {
  try {
    const c = JSON.parse(
      localStorage.getItem(CLE) ?? "null",
    ) as ConfigCloud | null;
    return c?.dossier ? c : null;
  } catch {
    return null;
  }
}

export function ecrireCloud(c: ConfigCloud | null) {
  try {
    if (c) localStorage.setItem(CLE, JSON.stringify(c));
    else localStorage.removeItem(CLE);
  } catch {
    /* stockage indisponible */
  }
}

async function appeler<T>(
  commande: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!enTauri)
    throw new Error(
      "La sauvegarde cloud n'existe que dans l'application Windows.",
    );
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(commande, args);
}

/** Dossiers OneDrive et Google Drive trouvés sur ce PC. */
export const detecterDossiers = () =>
  enTauri ? appeler<DossierCloud[]>("dossiers_cloud") : Promise.resolve([]);

/** Choisit un dossier à la main. Renvoie null si annulé. */
export async function choisirDossier(): Promise<string | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const d = await open({
    directory: true,
    multiple: false,
    title: "Dossier synchronisé où copier les sauvegardes",
  });
  return typeof d === "string" ? d : null;
}

const jour = () => new Date().toISOString().slice(0, 10);

/** Copie la sauvegarde dans le cloud (copie du jour, remplacée tout au long de la journée). */
export async function copierVersCloud(s: Sauvegarde, c = lireCloud()) {
  if (!c?.actif) return;
  await appeler("ecrire_copie_cloud", {
    dossier: c.dossier,
    nom: `lignee-${jour()}.json`,
    contenu: JSON.stringify(s, null, 1),
  });
  ecrireCloud({ ...c, derniere: new Date().toISOString() });
}

let derniereTentative = 0;
let enAttente: number | undefined;
/**
 * Copie au fil de l'utilisation, au plus une toutes les 5 minutes : une modification faite entre-temps est
 * copiée à la fin du délai. Les erreurs vont au journal.
 */
export function copieCloudPeriodique(s: Sauvegarde, forcer = false) {
  const c = lireCloud();
  if (!c?.actif || !enTauri || (!s.montures.length && !s.journal.length))
    return;
  window.clearTimeout(enAttente);
  const reste = derniereTentative + INTERVALLE - Date.now();
  if (!forcer && reste > 0) {
    enAttente = window.setTimeout(() => copieCloudPeriodique(s, true), reste);
    return;
  }
  derniereTentative = Date.now();
  copierVersCloud(s, c).catch((e) =>
    journaliser("erreur", `Sauvegarde cloud impossible : ${String(e)}`),
  );
}

export const listerCopiesCloud = (c: ConfigCloud) =>
  appeler<string[]>("lister_copies_cloud", { dossier: c.dossier });
export const lireCopieCloud = async (c: ConfigCloud, nom: string) =>
  lireTexteSauvegarde(
    await appeler<string>("lire_copie_cloud", { dossier: c.dossier, nom }),
  );
