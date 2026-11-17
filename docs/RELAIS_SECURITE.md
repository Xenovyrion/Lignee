# Relais Discord : sécurité

Ce document s'adresse surtout à **celui qui gère le relais**. Il explique ce que le relais protège, ce qu'il contient, et les réglages à faire.

- Mise en place : [RELAIS_DISCORD.md](RELAIS_DISCORD.md).
- Code : [`relais/src/index.js`](../relais/src/index.js), environ 200 lignes lisibles.

## En bref

- **Les PC ne sont pas exposés.** Lignée envoie des requêtes HTTPS sortantes vers le relais, comme un navigateur. Il n'y a aucun port ouvert, aucun tunnel, rien qui écoute.
- **Aucune donnée sensible.** Le relais ne voit que des textes comme « Enclos 2 : Enclos prêt : Amour 20 000 », leur heure d'envoi et l'identifiant Discord du membre. Il ne voit ni l'étable, ni la sauvegarde, ni le compte Dofus.
- **Le pire scénario est du spam dans le salon choisi**, pas plus. Voir « Si un secret fuit ».

## Ce que le relais contient

| Élément | Où | Secret ? | Rôle |
|---|---|---|---|
| `DISCORD_WEBHOOK` | Secret Cloudflare uniquement | **Oui** | Adresse d'écriture dans le salon. Les membres ne la connaissent pas. |
| `MEMBRES` | Secret Cloudflare | **Oui** (les clés) | Pour chaque membre : son identifiant Discord et sa clé personnelle. |
| Clé d'un membre | Secret Cloudflare + Lignée de ce membre | **Oui** | Autorise ce membre, et lui seul, à programmer ses messages. |
| Messages programmés | Stockage du relais (Durable Object) | Non | Effacés dès l'envoi. |

Une fois enregistrés, les secrets Cloudflare sont chiffrés. On ne peut plus les relire, même depuis le tableau de bord.

## Protections intégrées au relais

1. **Une clé par membre**, obligatoire à chaque requête (`Authorization: Bearer …`).
   - 32 caractères minimum, et deux membres ne peuvent pas avoir la même clé. Sinon le relais refuse de fonctionner.
   - Toutes les clés sont comparées **à temps constant**, si bien que le temps de réponse ne révèle rien.
2. **Le membre est déduit de sa clé**, jamais d'une donnée envoyée par l'appli.
   - Un membre ne peut mentionner que lui-même.
   - Il ne peut ni modifier ni annuler les minuteurs d'un autre : chaque membre a son propre espace.
3. **Destination figée.** Le webhook est un secret du relais, jamais transmis par l'appli. Même avec une clé, on ne peut écrire **que dans ce salon** : le relais ne peut pas servir à écrire sur n'importe quel Discord.
4. **Mentions verrouillées.**
   - `allowed_mentions` n'autorise que le membre concerné : ni `@everyone`, ni `@here`, ni rôles.
   - Les caractères `@`, `<`, `>`, `[` et `]` sont retirés des textes reçus (ni mention ni lien glissé).
5. **Entrées bornées.**
   - Requête de 16 000 caractères au plus, 300 caractères par texte, 120 par titre.
   - Type de message limité à une liste fixe (prêt, sérénité hors zone, jauge vide, blocage) ; liens retirés des textes.
   - 10 messages par enclos, 12 enclos par membre, 50 membres.
   - Pas plus de 8 jours à l'avance, et des noms de groupe limités à `a-z 0-9 -`.
   - Le reste est refusé.
6. **Origines web limitées (CORS).** Un navigateur n'accepte que les appels venant de Lignée : `http://tauri.localhost`, `tauri://localhost` et le serveur de développement local. Un site web malveillant ne peut donc pas appeler le relais depuis le navigateur d'un membre.
7. **Journaux sans contenu.** Seuls les codes d'erreur de Discord sont journalisés : ni messages, ni clés, ni webhook.
8. **Une seule adresse publique.** `preview_urls: false` désactive les URL de prévisualisation.

Ces protections ont été testées en local, avec `wrangler dev` accessible depuis ce PC seulement :

| Cas testé | Résultat |
|---|---|
| Sans clé, ou avec une clé inconnue | 401 |
| Message programmé plus de 8 jours à l'avance | 400 |
| Chemin invalide | 404 |
| Origine web étrangère | 403 |
| Origine Lignée | acceptée |
| Deux membres sur le même enclos | indépendants (l'un ne supprime pas l'autre) |
| Message programmé | envoyé à l'heure, réessayé en cas d'échec |

## Réglages à faire (gestionnaire du relais)

### Compte Cloudflare
- [ ] **Double authentification** : My Profile → Authentication → Two-Factor Authentication. C'est la protection la plus importante.
- [ ] Mot de passe unique, de préférence dans un gestionnaire de mots de passe.
- [ ] Après chaque déploiement ou changement de secret : `npx wrangler logout`. Sinon Wrangler garde un jeton de connexion sur le PC.
- [ ] Si un jour le déploiement est automatisé (GitHub Actions…) : un **jeton d'API limité** (modèle « Edit Cloudflare Workers »), jamais la clé globale.

### Secrets et clés
- [ ] Secrets **uniquement** via `npx wrangler secret put` : jamais dans `wrangler.jsonc`, jamais dans un commit. Le dépôt ignore déjà `relais/.dev.vars*`, `relais/.wrangler/` et `relais/node_modules/`.
- [ ] Clés générées avec la commande PowerShell du guide (générateur cryptographique), 64 caractères, **une par membre**.
- [ ] Liste `MEMBRES` gardée dans un gestionnaire de mots de passe, pas dans un fichier texte ni un message.
- [ ] Clés envoyées **en message privé**, jamais dans un salon.

### Discord
- [ ] Webhook créé par quelqu'un qui a la permission « Gérer les webhooks », URL transmise en privé.
- [ ] Ne jamais montrer l'URL du webhook : ni capture d'écran, ni message, ni fichier.
- [ ] Un salon dédié aux notifications évite de noyer les discussions de la guilde.

### Optionnel
- **Domaine personnel.** Avec un domaine Cloudflare à toi plutôt que `workers.dev`, tu peux ajouter une règle **WAF → Rate limiting**, par exemple 30 requêtes par minute par IP. Sur `workers.dev`, ces règles ne s'appliquent pas, mais les clés suffisent.
- **Bombardement de requêtes.** Au pire, il épuise le quota gratuit du jour (100 000 requêtes) : le relais s'arrête jusqu'au lendemain, **sans aucun frais**. L'offre gratuite ne facture jamais.

## Si un secret fuit

| Secret exposé | Ce que l'attaquant peut faire | Que faire |
|---|---|---|
| Clé d'un membre | Programmer des messages **dans ce salon uniquement**, mentionnant **ce membre seulement** : au plus 120 messages en attente. | Nouvelle clé pour ce membre, `npx wrangler secret put MEMBRES`, puis le membre la ressaisit dans Lignée. |
| `DISCORD_WEBHOOK` | Écrire dans ce salon. | Supprimer le webhook dans Discord, en recréer un, puis `npx wrangler secret put DISCORD_WEBHOOK`. |
| Liste `MEMBRES` | Ce qu'on peut faire avec chaque clé (ci-dessus). | Régénérer **toutes** les clés et les redistribuer. |
| Compte Cloudflare | Tout ce qui est hébergé sur le compte. | Changer le mot de passe, vérifier la double authentification, révoquer les jetons d'API (My Profile → API Tokens), changer tous les secrets ci-dessus. |

**Rotation conseillée** : changer la clé d'un membre s'il réinstalle Windows, donne ou revend son PC, ou quitte la guilde. Dans ce dernier cas, retire-le simplement de `MEMBRES`.

## Côté Lignée (chaque membre)

- L'adresse du relais et la clé sont stockées dans le stockage local de l'appli (WebView2, dossier AppData de Lignée).
  - Elles ne sont **pas** dans la sauvegarde JSON ni dans les exports : partager une sauvegarde ne partage pas la clé.
- Lignée n'accepte qu'une adresse **https** : la clé ne circule jamais en clair.
- Chaque membre active ou coupe ses notifications Discord et Windows indépendamment, dans ses Paramètres.
- Les notifications Windows passent par le système, sans service externe.
- Les erreurs du relais vont dans le journal de diagnostic, **sans la clé**.
