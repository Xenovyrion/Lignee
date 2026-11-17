// Relais Discord (Cloudflare Worker, dossier relais/, partageable dans une guilde) : programme les notifications
// des minuteurs d'enclos pour qu'elles arrivent sur Discord même Lignée fermée. Chaque membre a sa propre clé,
// et le relais ne mentionne que lui. Mise en place : docs/RELAIS_DISCORD.md.
// L'adresse et la clé restent sur ce PC (localStorage) : elles ne sont ni dans la sauvegarde ni dans les exports.
import { journaliser } from "./diagnostic";
import { COURT, dependDeLaSerenite, simuler, type MinuteurEnclos } from "./moteur/enclos";

const CLE_STOCKAGE = "lignee-relais";

export interface ConfigRelais {
  url: string;
  /** Clé personnelle donnée par celui qui gère le relais. */
  cle: string;
  /** Notifications Discord activées (la configuration est gardée quand on les coupe). */
  actif?: boolean;
}

/** Configuration enregistrée, active ou non. */
export function lireConfigRelais(): ConfigRelais | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLE_STOCKAGE) ?? "null") as ConfigRelais | null;
    return c?.url && c.cle ? c : null;
  } catch {
    return null;
  }
}

/** Relais à utiliser : configuré et activé. */
export function lireRelais(): ConfigRelais | null {
  const c = lireConfigRelais();
  return c && c.actif !== false ? c : null;
}

export function ecrireRelais(c: ConfigRelais | null) {
  try {
    if (c) localStorage.setItem(CLE_STOCKAGE, JSON.stringify(c));
    else localStorage.removeItem(CLE_STOCKAGE);
  } catch {
    /* stockage indisponible : le relais reste inactif */
  }
}

/** Adresse du relais acceptée : https uniquement (la clé ne doit jamais circuler en clair). */
export const urlRelaisValide = (u: string) => /^https:\/\/[^\s/?#]+$/.test(u.trim().replace(/\/+$/, ""));

async function appeler(chemin: string, init: RequestInit, c = lireRelais()): Promise<{ ok: boolean; erreur?: string }> {
  if (!c) return { ok: false, erreur: "relais non configuré" };
  try {
    const r = await fetch(c.url.replace(/\/+$/, "") + chemin, {
      ...init,
      headers: { Authorization: `Bearer ${c.cle}`, "Content-Type": "application/json" },
    });
    const corps = (await r.json().catch(() => ({}))) as { erreur?: string };
    return r.ok ? { ok: true } : { ok: false, erreur: corps.erreur ?? `erreur ${r.status}` };
  } catch {
    return { ok: false, erreur: "relais injoignable" };
  }
}

export const testerRelais = (c: ConfigRelais) => appeler("/test", { method: "POST" }, c);

/**
 * Messages envoyés pour un minuteur (évènements à venir uniquement). Le relais en fait un message mis en forme
 * (titre, couleur selon le type, pied) ; « message » reste la version texte, comprise par les relais plus anciens.
 */
export function messagesMinuteur(m: MinuteurEnclos, nomEnclos: string) {
  const debut = Date.parse(m.debut);
  const lancement = new Date(debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const jauges = m.jauges.map((j) => COURT[j.type]).join(" + ");
  const pied = `${jauges} · ${m.montures} monture${m.montures > 1 ? "s" : ""} · lancé à ${lancement}`;
  const sim = simuler(m);
  const fin = sim.fin === undefined ? undefined : debut + sim.fin * 1000;
  return sim.evenements
    .map((e) => ({
      at: debut + e.t * 1000,
      message: `${nomEnclos} : ${e.titre}. ${e.texte}`,
      type: e.type,
      titre: `${nomEnclos} — ${e.titre}`,
      texte: e.texte,
      pied,
      // Relais 1.0.18 et plus : message détaillé (barres, cases, heures dans le fuseau de chaque lecteur).
      details: {
        enclos: nomEnclos,
        titre: e.titre,
        jauges,
        barres: e.progression.map((p) => ({ jauge: p.type, nom: COURT[p.type], pct: p.pct, valeur: p.valeur })),
        serenite: dependDeLaSerenite(m.jauges.map((j) => j.type)) ? e.serenite : undefined,
        montures: m.montures,
        debut,
        fin,
      },
    }))
    .filter((e) => e.at > Date.now());
}

/** Programme (ou annule, si m est absent) les notifications Discord d'un enclos. Sans relais : ne fait rien. */
export async function synchroniserRelais(enclos: number, m: MinuteurEnclos | undefined) {
  if (!lireRelais()) return;
  const groupe = `enclos-${enclos}`;
  const r = m
    ? await appeler(`/planning/${groupe}`, { method: "PUT", body: JSON.stringify({ evenements: messagesMinuteur(m, `Enclos ${enclos}`) }) })
    : await appeler(`/planning/${groupe}`, { method: "DELETE" });
  if (!r.ok) journaliser("erreur", `Relais Discord (enclos ${enclos}) : ${r.erreur}`);
  return r;
}
