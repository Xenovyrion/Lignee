// Thèmes : une palette (accent, nuances, lueurs du fond, lucioles) et un fond d'écran conseillé,
// réglé pour lui (visibilité, flou). Les couleurs sont appliquées en variables CSS sur la racine.
import { valeurGalerie } from "./fond";

export interface Theme {
  id: string;
  nom: string;
  /** Couleur principale (boutons, onglet actif, barres, rubans). */
  accent: string;
  accentHover: string;
  /** Nuance claire (dégradés, étoiles) et foncée (bas des dégradés). */
  clair: string;
  fonce: string;
  /** Texte posé sur la couleur principale. */
  texte: string;
  /** Couleur secondaire (bordure du logo, confettis). */
  accent2: string;
  /** Lueurs du fond de page (haut gauche, bas droite). */
  lueur1: string;
  lueur2: string;
  luciole: string;
  /** Fond d'écran conseillé (vide = aucun) et ses réglages. */
  fond: string;
  visibilite: number;
  flou: number;
}

export const THEMES: Theme[] = [
  {
    id: "dore",
    nom: "Doré",
    accent: "#d4a017",
    accentHover: "#b8890f",
    clair: "#facc15",
    fonce: "#a16207",
    texte: "#1a1405",
    accent2: "#7c3aed",
    lueur1: "rgba(70, 100, 170, 0.12)",
    lueur2: "rgba(40, 120, 140, 0.1)",
    luciole: "#f1f5f9",
    fond: "",
    visibilite: 35,
    flou: 2,
  },
  {
    id: "portail",
    nom: "Portail",
    accent: "#22d3ee",
    accentHover: "#0891b2",
    clair: "#67e8f9",
    fonce: "#0e7490",
    texte: "#04161c",
    accent2: "#818cf8",
    lueur1: "rgba(34, 211, 238, 0.14)",
    lueur2: "rgba(99, 102, 241, 0.12)",
    luciole: "#a5f3fc",
    fond: valeurGalerie("978522-eliocalypse"),
    visibilite: 45,
    flou: 2,
  },
  {
    id: "sadida",
    nom: "Sadida",
    accent: "#84cc16",
    accentHover: "#65a30d",
    clair: "#bef264",
    fonce: "#3f6212",
    texte: "#111a05",
    accent2: "#2dd4bf",
    lueur1: "rgba(132, 204, 22, 0.12)",
    lueur2: "rgba(20, 184, 166, 0.1)",
    luciole: "#d9f99d",
    fond: valeurGalerie("419911-sadida-shoe"),
    visibilite: 40,
    flou: 3,
  },
  {
    id: "iop",
    nom: "Iop",
    accent: "#f97316",
    accentHover: "#ea580c",
    clair: "#fdba74",
    fonce: "#c2410c",
    texte: "#1c0a02",
    accent2: "#ef4444",
    lueur1: "rgba(249, 115, 22, 0.14)",
    lueur2: "rgba(239, 68, 68, 0.1)",
    luciole: "#fed7aa",
    fond: valeurGalerie("418888-coeur-iop"),
    visibilite: 40,
    flou: 3,
  },
  {
    id: "malice",
    nom: "Malice",
    accent: "#a855f7",
    accentHover: "#9333ea",
    clair: "#d8b4fe",
    fonce: "#7e22ce",
    texte: "#14061f",
    accent2: "#fb923c",
    lueur1: "rgba(168, 85, 247, 0.15)",
    lueur2: "rgba(249, 115, 22, 0.08)",
    luciole: "#e9d5ff",
    fond: valeurGalerie("928541-malice"),
    visibilite: 40,
    flou: 3,
  },
  {
    id: "pandala",
    nom: "Pandala",
    accent: "#2dd4bf",
    accentHover: "#14b8a6",
    clair: "#99f6e4",
    fonce: "#0f766e",
    texte: "#021a17",
    accent2: "#f472b6",
    lueur1: "rgba(45, 212, 191, 0.13)",
    lueur2: "rgba(244, 114, 182, 0.08)",
    luciole: "#ccfbf1",
    fond: valeurGalerie("1251895-reveil-pandala-partie-2-grobe"),
    visibilite: 40,
    flou: 3,
  },
];

export const themeParId = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

/** Applique la palette du thème (variables CSS sur la racine du document). */
export function appliquerPalette(t: Theme) {
  const r = document.documentElement.style;
  const vars: Record<string, string> = {
    "--color-accent": t.accent,
    "--color-accent-hover": t.accentHover,
    "--color-accent-clair": t.clair,
    "--color-accent-fonce": t.fonce,
    "--color-accent-texte": t.texte,
    "--color-accent-2": t.accent2,
    "--color-lueur-1": t.lueur1,
    "--color-lueur-2": t.lueur2,
    "--color-luciole": t.luciole,
  };
  for (const [k, v] of Object.entries(vars)) r.setProperty(k, v);
}

/** Le fond et ses réglages correspondent-ils encore à ceux du thème ? */
export const fondDuTheme = (t: Theme, o: { fondEcran: string; fondVisibilite: number; fondFlou: number }) => o.fondEcran === t.fond && (!t.fond || (o.fondVisibilite === t.visibilite && o.fondFlou === t.flou));
