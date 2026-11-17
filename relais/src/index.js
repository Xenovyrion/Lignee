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
//   PUT    /planning/<groupe>  { "evenements": [{ "at": <ms epoch>, "message": "…" }] }  remplace le groupe
//   DELETE /planning/<groupe>                                                          vide le groupe
//   POST   /test                                                                       message immédiat
import { DurableObject } from "cloudflare:workers";

export const LIMITES = {
  corps: 8_000, // caractères
  groupes: 12, // par membre
  membres: 50,
  parGroupe: 10,
  message: 300, // caractères
  horizon: 8 * 24 * 3600 * 1000, // 8 jours
  essais: 5,
};
const GROUPE = /^[a-z0-9-]{1,40}$/;
const WEBHOOK = /^https:\/\/(?:discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

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
      const ok = await envoyerDiscord(env, membre, "Test du relais : les notifications d'enclos arriveront ici.");
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
        else if (!(await envoyerDiscord(this.env, e.membre, e.message)) && e.essais + 1 < LIMITES.essais)
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

async function envoyerDiscord(env, membre, message) {
  try {
    const r = await fetch(env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Lignée",
        content: `<@${membre}> ${message}`,
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

/** Contrôle les évènements reçus ; null si la requête est invalide. */
export function validerEvenements(l, maintenant) {
  if (!Array.isArray(l) || l.length > LIMITES.parGroupe) return null;
  const r = [];
  for (const e of l) {
    if (!e || typeof e.at !== "number" || !Number.isFinite(e.at) || typeof e.message !== "string") return null;
    if (e.at > maintenant + LIMITES.horizon) return null;
    // Pas de mention ni de balise glissée dans le texte.
    const message = e.message.replace(/[@<>]/g, "").slice(0, LIMITES.message).trim();
    if (!message) return null;
    // Évènement déjà passé : ignoré (Lignée l'a déjà signalé si elle était ouverte).
    if (e.at > maintenant - 60_000) r.push({ at: Math.max(e.at, maintenant), message });
  }
  return r;
}
