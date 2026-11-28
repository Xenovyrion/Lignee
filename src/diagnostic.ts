// Journal de diagnostic : ce qui est fait dans l'application (actions, changements de l'étable,
// erreurs), gardé dans AppData (lignee-journal.jsonl, une entrée par ligne, les 3000 dernières).
// L'export « diagnostic » réunit ce journal, la sauvegarde et un résumé du plan dans un seul
// fichier à transmettre en cas de problème.
import { conseiller } from "./moteur/conseils";
import { FAMILLES, nomCouleur, objectifs } from "./moteur/donnees";
import { planifier } from "./moteur/planificateur";
import type { Sauvegarde } from "./moteur/types";

export type Niveau = "info" | "action" | "etat" | "erreur";
export interface Entree {
  /** Date ISO. */
  t: string;
  n: Niveau;
  m: string;
}

const FICHIER = "lignee-journal.jsonl";
const MAX = 3000;
const enTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let entrees: Entree[] = [];
let charge = false;
let minuteur: number | undefined;
const ecouteurs = new Set<() => void>();

const rogner = () => {
  if (entrees.length > MAX) entrees = entrees.slice(-MAX);
};

async function ecrire() {
  if (!charge) return;
  const texte = entrees.map((e) => JSON.stringify(e)).join("\n");
  try {
    if (enTauri) {
      const fs = await import("@tauri-apps/plugin-fs");
      await fs.writeTextFile(FICHIER, texte, { baseDir: fs.BaseDirectory.AppData });
    } else localStorage.setItem(FICHIER, texte);
  } catch {
    // Le journal ne doit jamais gêner l'application.
  }
}

/** Charge le journal existant (les entrées notées avant le chargement sont gardées à la suite). */
export async function chargerJournal() {
  try {
    let texte: string | null = null;
    if (enTauri) {
      const fs = await import("@tauri-apps/plugin-fs");
      if (await fs.exists(FICHIER, { baseDir: fs.BaseDirectory.AppData })) texte = await fs.readTextFile(FICHIER, { baseDir: fs.BaseDirectory.AppData });
    } else texte = localStorage.getItem(FICHIER);
    const anciennes = (texte ?? "")
      .split("\n")
      .filter(Boolean)
      .flatMap((l) => {
        try {
          return [JSON.parse(l) as Entree];
        } catch {
          return [];
        }
      });
    entrees = [...anciennes, ...entrees];
    rogner();
  } catch {
    // journal illisible : on repart d'un journal vide
  }
  charge = true;
  ecrire();
}

/** Note une entrée dans le journal. */
export function journaliser(n: Niveau, m: string) {
  if (!m) return;
  entrees.push({ t: new Date().toISOString(), n, m });
  rogner();
  window.clearTimeout(minuteur);
  minuteur = window.setTimeout(ecrire, 1500);
  ecouteurs.forEach((f) => f());
}

export const lireJournal = () => entrees.slice();

export function abonnerJournal(f: () => void) {
  ecouteurs.add(f);
  return () => {
    ecouteurs.delete(f);
  };
}

export function viderJournal() {
  entrees = [];
  ecrire();
  ecouteurs.forEach((f) => f());
}

/** Erreurs non rattrapées et messages d'erreur de la console, notés dans le journal. */
export function installerCaptureErreurs() {
  const texte = (x: unknown) => (x instanceof Error ? `${x.message}${x.stack ? `\n${x.stack.split("\n").slice(1, 4).join("\n")}` : ""}` : typeof x === "string" ? x : JSON.stringify(x));
  window.addEventListener("error", (e) => journaliser("erreur", `Erreur : ${texte(e.error ?? e.message)}`));
  window.addEventListener("unhandledrejection", (e) => journaliser("erreur", `Erreur (promesse) : ${texte(e.reason)}`));
  const origine = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    journaliser("erreur", args.map(texte).join(" "));
    origine(...args);
  };
}

const SEXE = { M: "♂", F: "♀" } as const;

/** Résumé lisible de ce qui a changé entre deux états de la sauvegarde (vide si rien d'utile). */
export function resumerDifference(avant: Sauvegarde, apres: Sauvegarde): string {
  const lignes: string[] = [];
  const compter = (s: Sauvegarde) => {
    const r = new Map<string, number>();
    for (const m of s.montures) {
      const k = `${m.famille}|${m.couleur}|${m.sexe}|${m.etat}`;
      r.set(k, (r.get(k) ?? 0) + 1);
    }
    return r;
  };
  const a = compter(avant);
  const b = compter(apres);
  const changements: string[] = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const d = (b.get(k) ?? 0) - (a.get(k) ?? 0);
    if (!d) continue;
    const [f, c, sexe, etat] = k.split("|") as [Sauvegarde["montures"][number]["famille"], string, "M" | "F", string];
    changements.push(`${f} ${nomCouleur(f, c)} ${SEXE[sexe]} ${etat} ${d > 0 ? "+" : ""}${d}`);
  }
  if (changements.length) lignes.push(`Étable : ${changements.sort().join(", ")}`);
  for (const f of FAMILLES) {
    const plus = apres.obtenues[f].filter((c) => !avant.obtenues[f].includes(c));
    const moins = avant.obtenues[f].filter((c) => !apres.obtenues[f].includes(c));
    if (plus.length) lignes.push(`Succès ${f} cochés : ${plus.map((c) => nomCouleur(f, c)).join(", ")}`);
    if (moins.length) lignes.push(`Succès ${f} décochés : ${moins.map((c) => nomCouleur(f, c)).join(", ")}`);
  }
  const nj = apres.journal.length - avant.journal.length;
  if (nj > 0) lignes.push(`${nj} accouplement${nj > 1 ? "s" : ""} enregistré${nj > 1 ? "s" : ""}`);
  if (nj < 0) lignes.push(`${-nj} accouplement${nj < -1 ? "s" : ""} retiré${nj < -1 ? "s" : ""} de l'historique`);
  const options = (Object.keys(apres.options) as (keyof Sauvegarde["options"])[]).filter((k) => apres.options[k] !== avant.options[k]);
  if (options.length) lignes.push(`Paramètres : ${options.map((k) => `${k} = ${JSON.stringify(apres.options[k])}`).join(", ")}`);
  return lignes.join(" · ");
}

/** Résumé du plan de chaque famille, tel que le tableau de bord le calcule. */
export function resumerPlans(s: Sauvegarde) {
  return Object.fromEntries(
    FAMILLES.map((f) => {
      const plan = planifier(f, s.montures, s.obtenues[f], s.options.cibles?.[f], s.options.priorite);
      const c = conseiller(plan, { takeza: s.options.takeza, makina: s.options.makina, seuilAnimakina: s.options.seuilAnimakina });
      return [
        f,
        {
          montures: s.montures.filter((m) => m.famille === f).length,
          obtenues: `${s.obtenues[f].length}/${objectifs(f).length}`,
          etapes: plan.etapes.length,
          captures: plan.captures,
          clonages: plan.clonages,
          pretes: c.prets.length,
          aPreparer: c.aPreparer.length,
          capturesMaintenant: c.captures,
          blocages: c.blocages.map((b) => `${b.e.couleur} : ${b.message} (×${b.nombre})`),
        },
      ];
    }),
  );
}

const jour = () => new Date().toISOString().slice(0, 10);

/** Exporte le fichier de diagnostic (journal + sauvegarde + résumé du plan). Renvoie le chemin, ou null si annulé. */
export async function exporterDiagnostic(s: Sauvegarde, version: string | null): Promise<string | null> {
  let resume: unknown;
  try {
    resume = resumerPlans(s);
  } catch (e) {
    resume = { erreur: String(e) };
  }
  const contenu = JSON.stringify(
    {
      format: "lignee-diagnostic",
      version: version ?? "navigateur",
      date: new Date().toISOString(),
      systeme: navigator.userAgent,
      ecran: `${window.innerWidth}×${window.innerHeight}`,
      resume,
      journal: entrees,
      sauvegarde: s,
    },
    null,
    1,
  );
  const nom = `lignee-diagnostic-${jour()}.json`;
  if (!enTauri) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([contenu], { type: "application/json" }));
    a.download = nom;
    a.click();
    URL.revokeObjectURL(a.href);
    return nom;
  }
  const { save } = await import("@tauri-apps/plugin-dialog");
  const chemin = await save({ defaultPath: nom, filters: [{ name: "Diagnostic Lignée", extensions: ["json"] }] });
  if (!chemin) return null;
  const fs = await import("@tauri-apps/plugin-fs");
  await fs.writeTextFile(chemin, contenu);
  return chemin;
}
