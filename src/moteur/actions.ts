// Opérations sur la sauvegarde. Fonctions pures : elles renvoient une nouvelle sauvegarde.
import { couleur } from "./donnees";
import { clonables } from "./regles";
import type { Capacite, Famille, Makina, Monture, Sauvegarde, Sexe } from "./types";

export const nouvelId = () => Math.random().toString(36).slice(2, 10);
const maintenant = () => new Date().toISOString();

export function sauvegardeVide(): Sauvegarde {
  return { version: 1, montures: [], journal: [], obtenues: { dragodinde: [], muldo: [], volkorne: [] }, options: { takeza: false, niveauParDefaut: 100, afficherNom: false, langue: "fr" } };
}

function ajouterObtenue(s: Sauvegarde, f: Famille, c: string): Sauvegarde["obtenues"] {
  if (couleur(f, c).generation < 2 || s.obtenues[f].includes(c)) return s.obtenues;
  return { ...s.obtenues, [f]: [...s.obtenues[f], c] };
}

export interface Bebe {
  couleur: string;
  sexe: Sexe;
  capacite?: Capacite;
}

/** Enregistre un accouplement : parents stériles, bébé(s) créé(s), succès mis à jour, journal. */
export function enregistrerNaissance(s: Sauvegarde, pereId: string, mereId: string, bebes: Bebe[], makina?: Makina): Sauvegarde {
  const pere = s.montures.find((m) => m.id === pereId);
  const mere = s.montures.find((m) => m.id === mereId);
  if (!pere || !mere) throw new Error("Parent introuvable");
  if (pere.famille !== mere.famille) throw new Error("Les parents doivent être de la même famille");
  if (pere.sexe === mere.sexe) throw new Error("Les parents doivent être de sexes opposés");
  if (pere.etat === "sterile" || mere.etat === "sterile") throw new Error("Un parent est stérile");
  if (bebes.length < 1 || bebes.length > 2) throw new Error("1 bébé (2 avec Reproducteur)");

  const f = pere.famille;
  const nes: Monture[] = bebes.map((b) => ({
    id: nouvelId(),
    famille: f,
    couleur: couleur(f, b.couleur).id,
    sexe: b.sexe,
    niveau: 1,
    etat: "fertile",
    capacite: b.capacite,
    parents: [pere.couleur, mere.couleur],
    origine: "naissance",
    creeLe: maintenant(),
  }));
  let obtenues = s.obtenues;
  for (const b of nes) obtenues = ajouterObtenue({ ...s, obtenues }, f, b.couleur);
  return {
    ...s,
    montures: [...s.montures.map((m) => (m.id === pereId || m.id === mereId ? { ...m, etat: "sterile" as const } : m)), ...nes],
    obtenues,
    journal: [...s.journal, { id: nouvelId(), date: maintenant(), famille: f, pereId, mereId, makina, bebeIds: nes.map((b) => b.id) }],
  };
}

/** Clone deux stériles de même génération en une monture fertile (couleur et sexe constatés en jeu). */
export function cloner(s: Sauvegarde, idA: string, idB: string, resultat: { couleur: string; sexe: Sexe }): Sauvegarde {
  const a = s.montures.find((m) => m.id === idA);
  const b = s.montures.find((m) => m.id === idB);
  if (!a || !b || !clonables(a, b)) throw new Error("Ces deux montures ne sont pas clonables ensemble");
  if (resultat.couleur !== a.couleur && resultat.couleur !== b.couleur) throw new Error("Le clone a la couleur d'un des deux");
  const modele = resultat.couleur === a.couleur ? a : b;
  const clone: Monture = {
    id: nouvelId(),
    famille: a.famille,
    couleur: resultat.couleur,
    sexe: resultat.sexe,
    niveau: modele.niveau,
    etat: "fertile",
    parents: modele.parents,
    nom: modele.nom,
    origine: "clonage",
    creeLe: maintenant(),
  };
  return { ...s, montures: [...s.montures.filter((m) => m.id !== idA && m.id !== idB), clone] };
}
