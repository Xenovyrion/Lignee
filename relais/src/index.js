// Relais Discord de Lignée, partageable entre plusieurs membres d'une guilde.
// Lignée programme ici les notifications de ses minuteurs d'enclos ; le relais les envoie sur Discord
// à l'heure dite, même quand Lignée est fermée. Il n'écrit que dans le webhook configuré en secret
// (DISCORD_WEBHOOK) et chaque membre a sa propre clé : un message ne mentionne que le membre dont la clé
// l'a programmé.
//
// Secrets (npx wrangler secret put …) :
//   DISCORD_WEBHOOK  URL du webhook du salon
//   MEMBRES          « identifiantDiscord:clé,identifiantDiscord:clé » (clés de 32 caractères minimum)
// API (en-tête « Authorization: Bearer <clé du membre> ») :
//   PUT    /planning/<groupe>  { "evenements": [{ "at": <ms epoch>, "message": "…",       remplace le groupe
//                                  "type"?, "titre"?, "texte"?, "pied"? }] }
//          avec titre : message mis en forme (embed coloré selon le type), sinon texte simple ;
//          avec details (Lignée 1.0.18+) : barres de progression, cases et heures locales (voir validerDetails).
//   DELETE /planning/<groupe>                                                          vide le groupe
//   POST   /test                                                                       message immédiat
import { DurableObject } from "cloudflare:workers";

export const LIMITES = {
  corps: 16_000, // caractères
  groupes: 12, // par membre
  membres: 50,
  parGroupe: 10,
  message: 300, // caractères
  titre: 120,
  pied: 160,
  horizon: 8 * 24 * 3600 * 1000, // 8 jours
  essais: 5,
};
const GROUPE = /^[a-z0-9-]{1,40}$/;
const WEBHOOK = /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
/** Couleur (barre latérale) et pictogramme de chaque type de message. */
const STYLES = {
  fin: { couleur: 0x3fb950, picto: "✅", appel: "est prêt ! 🎉" },
  zone: { couleur: 0xf0a020, picto: "⚠️", appel: "a besoin de toi" },
  vide: { couleur: 0xe5534b, picto: "🪫", appel: "a besoin d'une recharge" },
  arret: { couleur: 0xe5534b, picto: "⛔", appel: "a besoin de toi" },
  almanax: { couleur: 0x9b6cf0, picto: "🌙" },
  test: { couleur: 0x3fb6e3, picto: "🔔" },
};
/** Images du dépôt Lignée (logo et vignettes dessinées pour le projet, aucune image du jeu). */
const IMAGES = "https://raw.githubusercontent.com/Xenovyrion/Lignee/main/relais/images/";
/** Couleur des barres de chaque caractéristique, proche de celle du jeu. */
const CARRES = { endurance: "🟨", maturite: "🟦", amour: "🟥", mangeoire: "🟧" };

export default {
  async fetch(requete, env) {
    const cors = enTetesCors(requete, env);
    if (requete.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors ?? {} });
    const repondre = (statut, corps) => Response.json(corps, { status: statut, headers: cors ?? {} });

    const membres = lireMembres(env);
    if (!membres) return repondre(500, { erreur: "relais mal configuré (secrets manquants ou invalides)" });
    const membre = identifier(requete, membres);
    if (!membre) return repondre(401, { erreur: "clé invalide" });

    const url = new URL(requete.url);
    const stub = env.PLANIFICATEUR.get(env.PLANIFICATEUR.idFromName("relais"));
    const m = url.pathname.match(/^\/planning\/([^/]+)$/);

    if (requete.method === "POST" && url.pathname === "/test") {
      const ok = await envoyerDiscord(env, membre, {
        message: "Test du relais : les notifications d'enclos arriveront ici.",
        type: "test",
        titre: "Test du relais",
        texte: "Les notifications de tes minuteurs d'enclos arriveront ici, avec une mention pour toi seul.",
        pied: "Lignée",
        at: Date.now(),
        details: { enclos: "Test", titre: "Le relais fonctionne", jauges: "", barres: [], montures: 0 },
      });
      return repondre(ok ? 200 : 502, ok ? { ok: true } : { erreur: "Discord a refusé le message (webhook ou identifiant ?)" });
    }
    if (m && GROUPE.test(m[1])) {
      if (requete.method === "DELETE") return repondre(200, await stub.planifier(membre, m[1], []));
      if (requete.method === "PUT") {
        const corps = await lireJson(requete);
        const evenements = corps && validerEvenements(corps.evenements, Date.now());
        if (!evenements) return repondre(400, { erreur: "évènements invalides" });
        const r = await stub.planifier(membre, m[1], evenements);
        return repondre(r.erreur ? 400 : 200, r);
      }
    }
    return repondre(404, { erreur: "inconnu" });
  },
};

export class Planificateur extends DurableObject {
  async planifier(membre, groupe, evenements) {
    const groupes = (await this.ctx.storage.get("groupes")) ?? {};
    const cle = `${membre}/${groupe}`;
    if (evenements.length) groupes[cle] = evenements.map((e) => ({ ...e, membre, essais: 0 }));
    else delete groupes[cle];
    if (Object.keys(groupes).filter((g) => g.startsWith(`${membre}/`)).length > LIMITES.groupes) return { erreur: "trop de minuteurs programmés" };
    await this.ctx.storage.put("groupes", groupes);
    await this.reprogrammer(groupes);
    return { ok: true, programmes: evenements.length };
  }

  async alarm() {
    const groupes = (await this.ctx.storage.get("groupes")) ?? {};
    const maintenant = Date.now();
    for (const [g, liste] of Object.entries(groupes)) {
      const restants = [];
      for (const e of liste) {
        if (e.at > maintenant) restants.push(e);
        else if (!(await envoyerDiscord(this.env, e.membre, e)) && e.essais + 1 < LIMITES.essais)
          restants.push({ ...e, essais: e.essais + 1, at: maintenant + 60_000 * (e.essais + 1) });
      }
      if (restants.length) groupes[g] = restants;
      else delete groupes[g];
    }
    await this.ctx.storage.put("groupes", groupes);
    await this.reprogrammer(groupes);
  }

  async reprogrammer(groupes) {
    const prochains = Object.values(groupes)
      .flat()
      .map((e) => e.at);
    if (prochains.length) await this.ctx.storage.setAlarm(Math.min(...prochains));
    else await this.ctx.storage.deleteAlarm();
  }
}

/** Envoie un évènement : message mis en forme s'il a un titre, sinon texte simple (anciennes versions de Lignée). */
async function envoyerDiscord(env, membre, e) {
  const style = STYLES[e.type] ?? STYLES.test;
  const contenu = e.details
    ? messageDetaille(membre, e, style)
    : e.titre
    ? {
        // La mention reste hors du cadre : c'est elle qui fait sonner le téléphone.
        content: `<@${membre}>`,
        embeds: [
          {
            title: `${style.picto} ${e.titre}`,
            description: e.texte || undefined,
            color: style.couleur,
            footer: e.pied ? { text: e.pied } : undefined,
            timestamp: new Date(e.at).toISOString(),
          },
        ],
      }
    : { content: `<@${membre}> ${e.message}` };
  try {
    const r = await fetch(env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Lignée",
        ...contenu,
        // Seul le membre concerné est notifié : ni @everyone, ni @here, ni rôles, ni autre membre.
        allowed_mentions: { parse: [], users: [membre] },
      }),
    });
    // Aucun contenu de message dans les journaux : seulement le code de retour.
    if (!r.ok) console.log(`Discord a répondu ${r.status}`);
    return r.ok;
  } catch {
    console.log("Discord injoignable");
    return false;
  }
}

/** Message complet : appel, logo, barres de progression, cases et vignette selon le type. */
export function messageDetaille(membre, e, style) {
  const d = e.details;
  const heure = (ms, f) => `<t:${Math.floor(ms / 1000)}:${f}>`;
  const barres = d.barres.map((b) => {
    const plein = Math.floor(b.pct / 10);
    return `**${b.nom}** · ${b.pct} %  (${b.valeur})\n${(CARRES[b.jauge] ?? "🟩").repeat(plein)}${"⬛".repeat(10 - plein)}`;
  });
  const lignes = [e.texte, barres.join("\n")];
  if (d.serenite !== undefined) lignes.push(`🟪 **Sérénité** ${d.serenite > 0 ? "+" : ""}${d.serenite.toLocaleString("fr-FR")}`);
  const champs = [];
  if (d.montures) champs.push({ name: "Montures", value: String(d.montures), inline: true });
  if (d.debut) champs.push({ name: "Lancé", value: `${heure(d.debut, "t")} · ${heure(d.debut, "R")}`, inline: true });
  if (d.debut) champs.push({ name: "Prêt", value: d.fin ? `${heure(d.fin, "t")} · ${heure(d.fin, "R")}` : "jamais en l'état", inline: true });
  const nom = d.enclos.charAt(0).toLowerCase() + d.enclos.slice(1);
  return {
    // La mention reste hors du cadre : c'est elle qui fait sonner le téléphone.
    content: style.appel ? `<@${membre}>, ton ${nom} ${style.appel}` : `<@${membre}>`,
    avatar_url: `${IMAGES}logo.png`,
    embeds: [
      {
        author: { name: `Lignée · ${d.enclos}`, icon_url: `${IMAGES}logo.png` },
        title: `${style.picto} ${d.titre}`,
        description: lignes.filter(Boolean).join("\n\n") || undefined,
        color: style.couleur,
        thumbnail: { url: `${IMAGES}${e.type}.png` },
        fields: champs.length ? champs : undefined,
        footer: d.jauges ? { text: d.jauges, icon_url: `${IMAGES}logo.png` } : undefined,
        timestamp: new Date(e.at).toISOString(),
      },
    ],
  };
}

/** Membres déclarés dans le secret MEMBRES ; null si le relais est mal configuré. */
export function lireMembres(env) {
  if (!WEBHOOK.test(env.DISCORD_WEBHOOK ?? "") || typeof env.MEMBRES !== "string") return null;
  const l = env.MEMBRES.split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const i = x.indexOf(":");
      return { id: x.slice(0, i), cle: x.slice(i + 1) };
    });
  if (!l.length || l.length > LIMITES.membres) return null;
  if (l.some((m) => !/^\d{5,25}$/.test(m.id) || m.cle.length < 32)) return null;
  if (new Set(l.map((m) => m.cle)).size !== l.length) return null; // deux membres ne partagent jamais une clé
  return l;
}

/** Identifiant Discord du membre dont la clé est présentée, ou null. */
function identifier(requete, membres) {
  const recu = new TextEncoder().encode((requete.headers.get("Authorization") ?? "").replace(/^Bearer /, ""));
  let trouve = null;
  // Toutes les clés sont comparées, à temps constant : le temps de réponse ne donne aucun indice.
  for (const m of membres) {
    const attendu = new TextEncoder().encode(m.cle);
    if (recu.byteLength === attendu.byteLength && crypto.subtle.timingSafeEqual(recu, attendu)) trouve = m.id;
  }
  return trouve;
}

function enTetesCors(requete, env) {
  const origine = requete.headers.get("Origin");
  if (!origine) return {}; // appel hors navigateur (curl) : pas d'en-têtes CORS
  if (!env.ORIGINES.split(",").includes(origine)) return null;
  return {
    "Access-Control-Allow-Origin": origine,
    "Access-Control-Allow-Methods": "PUT, DELETE, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

async function lireJson(requete) {
  const texte = await requete.text();
  if (texte.length > LIMITES.corps) return null;
  try {
    return JSON.parse(texte);
  } catch {
    return null;
  }
}

const fini = (x) => typeof x === "number" && Number.isFinite(x);

/** Détails d'un message (barres, cases) ; null s'ils sont invalides. Seuls des textes nettoyés et des nombres passent. */
export function validerDetails(d, nettoyer) {
  if (!d || typeof d !== "object" || !Array.isArray(d.barres) || d.barres.length > 3) return null;
  const barres = [];
  for (const b of d.barres) {
    if (!b || !Object.hasOwn(CARRES, b.jauge) || !fini(b.pct)) return null;
    barres.push({ jauge: b.jauge, nom: nettoyer(b.nom, 20), pct: Math.max(0, Math.min(100, Math.round(b.pct))), valeur: nettoyer(b.valeur, 40) });
  }
  const r = { enclos: nettoyer(d.enclos, 40), titre: nettoyer(d.titre, LIMITES.titre), jauges: nettoyer(d.jauges, 60), barres };
  if (!r.enclos || !r.titre) return null;
  if (fini(d.serenite)) r.serenite = Math.max(-5000, Math.min(5000, Math.round(d.serenite)));
  if (fini(d.montures)) r.montures = Math.max(0, Math.min(99, Math.round(d.montures)));
  if (fini(d.debut)) r.debut = d.debut;
  if (fini(d.fin)) r.fin = d.fin;
  return r;
}

/** Contrôle les évènements reçus ; null si la requête est invalide. */
export function validerEvenements(l, maintenant) {
  if (!Array.isArray(l) || l.length > LIMITES.parGroupe) return null;
  const r = [];
  for (const e of l) {
    if (!e || typeof e.at !== "number" || !Number.isFinite(e.at) || typeof e.message !== "string") return null;
    if (e.at > maintenant + LIMITES.horizon) return null;
    // Pas de mention, de balise ni de lien glissé dans les textes.
    const nettoyer = (x, max) => (typeof x === "string" ? x.replace(/[@<>[\]]/g, "").slice(0, max).trim() : "");
    const message = nettoyer(e.message, LIMITES.message);
    if (!message) return null;
    const riche = {};
    if (e.titre !== undefined) {
      if (!Object.hasOwn(STYLES, e.type) || e.type === "test") return null;
      riche.type = e.type;
      riche.titre = nettoyer(e.titre, LIMITES.titre);
      riche.texte = nettoyer(e.texte, LIMITES.message);
      riche.pied = nettoyer(e.pied, LIMITES.pied);
      if (!riche.titre) return null;
      if (e.details !== undefined) {
        riche.details = validerDetails(e.details, nettoyer);
        if (!riche.details) return null;
      }
    }
    // Évènement déjà passé : ignoré (Lignée l'a déjà signalé si elle était ouverte).
    if (e.at > maintenant - 60_000) r.push({ at: Math.max(e.at, maintenant), message, ...riche });
  }
  return r;
}
