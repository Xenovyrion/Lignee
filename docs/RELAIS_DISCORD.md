# Relais Discord : mise en place

Le relais envoie les notifications des **minuteurs d'enclos** sur Discord, **à l'heure dite, même quand Lignée est fermée et le PC éteint**. C'est un petit programme hébergé gratuitement chez Cloudflare (un « Worker »).

Un seul relais suffit pour toute une guilde :

- **Une personne le gère.** Elle l'installe une fois et donne une **clé personnelle** à chaque membre intéressé.
- **Chaque membre** colle l'adresse du relais et sa clé dans Lignée. Les messages arrivent dans le salon de la guilde et **ne mentionnent que lui** : son téléphone sonne, pas celui des autres.
- **Les autres membres ne sont pas concernés** : sans clé, rien ne leur est envoyé.
- **Personne n'a besoin d'être administrateur du Discord**, sauf pour créer le webhook une fois (étape 1).

```
Lignée de Léa ─┐                                      ┌─► #enclos : « @Léa Enclos 2 : prêt »
Lignée de Tom ─┼─ « enclos 2 prêt à 18:40 » ─► Relais ┤
               │      (clé personnelle)    (Cloudflare)└─► #enclos : « @Tom Enclos 1 : prêt »
```

- Lignée ne fait que des **requêtes sortantes** vers le relais, comme un navigateur. Aucun port n'est ouvert sur les PC.
- Les règles de sécurité sont dans [RELAIS_SECURITE.md](RELAIS_SECURITE.md). À lire par celui qui gère le relais.

---

## Si tu es un membre

Tu n'installes rien.

1. Envoie ton **identifiant Discord** à la personne qui gère le relais.
   - Discord → **Paramètres utilisateur → Avancés → Mode développeur** : active-le.
   - Clic droit sur ton pseudo → **Copier l'identifiant de l'utilisateur**. C'est un nombre, par exemple `987654321098765432`. Ce n'est pas un secret.
2. Elle te renvoie, **en message privé**, l'**adresse du relais** et **ta clé personnelle**.
3. Dans Lignée : **Paramètres → Minuteurs d'enclos**.
   - Colle l'adresse et la clé.
   - **Tester** : un message de test doit arriver dans le salon, avec ta mention.
   - **Enregistrer**. Ta clé reste sur ton PC : elle n'est ni dans ta sauvegarde ni dans tes exports.
4. La case **Notifications Discord** coupe ou réactive les messages quand tu veux, sans ressaisir la clé. Les notifications Windows ont leur propre case.

Ne partage jamais ta clé : elle permet de programmer des messages qui te mentionnent.

---

## Si tu gères le relais

Durée : environ 15 minutes, une seule fois. Il te faut :

- Un compte **Cloudflare** gratuit (<https://dash.cloudflare.com/sign-up>), avec la double authentification activée (voir la sécurité).
- **Node.js** et une copie du dépôt Lignée (dossier `relais/`).
- Un **webhook Discord** dans le salon voulu (étape 1).

### 1. Le webhook Discord

Il faut la permission **Gérer les webhooks** sur le salon. Si tu ne l'as pas, demande à un administrateur de faire cette étape et de t'envoyer l'URL en message privé.

1. Choisis ou crée un salon, par exemple `#enclos`. Tout le monde peut y lire les messages, mais seule la personne mentionnée est notifiée.
2. **Modifier le salon → Intégrations → Webhooks → Nouveau webhook**, nomme-le « Lignée ».
3. **Copier l'URL du webhook**. Elle ressemble à `https://discord.com/api/webhooks/123456789012345678/AbCdEf…`.

**C'est un secret** : quiconque l'a peut écrire dans ce salon.

### 2. Une clé par membre

Pour chaque membre (toi compris), génère une clé dans **PowerShell** :

```powershell
-join ([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32) | ForEach-Object { $_.ToString("x2") })
```

Tu obtiens 64 caractères aléatoires. Écris ensuite la liste des membres sous cette forme, **sans espace** :

```
identifiantDiscord:clé,identifiantDiscord:clé
```

Par exemple :

```
987654321098765432:3f9a…c21e,123456789012345678:b07d…9a44
```

Une clé différente par membre : le relais refuse deux membres avec la même clé. Garde cette liste dans ton gestionnaire de mots de passe, pas dans un fichier texte.

### 3. Déployer

Depuis le dossier du dépôt Lignée :

```powershell
cd relais
npx wrangler login
npx wrangler deploy
```

Wrangler est l'outil officiel de Cloudflare. À la fin, il affiche l'adresse du relais, par exemple `https://lignee-relais.ton-sous-domaine.workers.dev`.

Enregistre ensuite les deux secrets. Chaque commande **demande la valeur** : colle-la puis Entrée. Elle n'apparaît ni à l'écran ni dans l'historique, et ne va dans aucun fichier.

```powershell
npx wrangler secret put DISCORD_WEBHOOK
npx wrangler secret put MEMBRES
```

Puis déconnecte Wrangler de ce PC :

```powershell
npx wrangler logout
```

### 4. Distribuer les clés

Envoie à chaque membre, **en message privé** (jamais dans un salon) : l'adresse du relais et **sa** clé. Il suit la partie « Si tu es un membre ».

### Ajouter ou retirer un membre

Mets à jour ta liste, puis renvoie-la **en entier** :

```powershell
cd relais
npx wrangler login
npx wrangler secret put MEMBRES
npx wrangler logout
```

Un membre retiré ne peut plus rien programmer. Ses messages déjà programmés partent quand même : ils s'épuisent en 8 jours au plus.

### Mettre à jour le relais

Quand une version de Lignée modifie le dossier `relais/` (c'est indiqué dans les notes de version) :

```powershell
cd relais
npx wrangler login
npx wrangler deploy
npx wrangler logout
```

Les secrets sont conservés.

### Supprimer le relais

1. `cd relais`, `npx wrangler login`, puis `npx wrangler delete`.
2. Supprime le webhook dans Discord.
3. Préviens les membres : ils cliquent sur **Oublier ce relais** dans Lignée.

---

## Limites

- Par membre : 12 enclos programmés au plus, 10 messages par enclos, 8 jours à l'avance au maximum.
- 50 membres au plus par relais.
- L'offre gratuite de Cloudflare autorise 100 000 requêtes par jour ; un membre en utilise quelques dizaines.
- Si Discord est indisponible à l'heure dite, le relais réessaie jusqu'à 5 fois (après 1, 2, 3 puis 4 minutes).

## Dépannage

| Message dans Lignée | Cause | Solution |
|---|---|---|
| `clé invalide` | Clé mal copiée, ou membre absent de `MEMBRES`. | Recopie la clé. Le gestionnaire vérifie la liste. |
| `relais mal configuré` | Secret manquant ou invalide : webhook mal copié, identifiant non numérique, clé de moins de 32 caractères, clé en double, espace dans la liste. | Le gestionnaire refait `npx wrangler secret put` pour le secret en cause. |
| `Discord a refusé le message` | Webhook supprimé ou URL fausse. | Recréer un webhook, puis `npx wrangler secret put DISCORD_WEBHOOK`. |
| `relais injoignable` | Pas d'internet, ou adresse fausse. | Vérifie l'adresse : `https://…workers.dev`, sans chemin. |

Le **journal de diagnostic** (Paramètres) garde la trace des erreurs du relais, sans la clé.
