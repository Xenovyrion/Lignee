# Lignée

Outil de pilotage de l'élevage pour **Dofus 3.7** (Dragodindes, Muldos, Volkornes). À partir de ton étable, il calcule quoi accoupler, quoi capturer et quoi cloner, dans quel ordre, pour obtenir **tous les succès de génération** (294 couleurs à faire naître).

> Projet de fan, non affilié à Ankama. Dofus est une marque d'Ankama Games.
> Les images des montures (via [DofusDB](https://dofusdb.fr)) et les fonds d'écran proposés dans les Paramètres
> ([wallpapers officiels](https://www.dofus.com/fr/mmorpg/medias/wallpapers)) sont © Ankama : ils ne sont pas
> inclus dans ce dépôt, l'application les charge depuis leur site d'origine.

## Installation

1. Télécharge l'installateur Windows (`Lignee_x.y.z_x64-setup.exe`) dans la [dernière release](../../releases/latest).
2. Lance-le. L'application n'étant pas signée par un éditeur reconnu, Windows SmartScreen peut afficher un avertissement : *Informations complémentaires → Exécuter quand même*.

**Mises à jour automatiques** (depuis la 1.0.1) : au démarrage, Lignée vérifie si une nouvelle version est publiée et propose *Installer et redémarrer*. Les nouveautés s'affichent ensuite dans l'application (aussi dans *Paramètres → Mises à jour → Voir les nouveautés*). Si tu as la 1.0.0, installe une fois la dernière version par-dessus : tes données sont conservées.

## Prise en main

À la première ouverture, Lignée propose une **visite guidée** en quatre chapitres : Découverte, Gérer l'étable, Suivre le tableau de bord, Au quotidien. Les chapitres sur l'Étable et le tableau de bord se pratiquent sur une **étable d'exemple** (ta vraie étable n'est pas touchée). Chaque chapitre se relance avec le bouton **? Aide** de l'écran affiché, ou depuis *Paramètres → Visite guidée*. En résumé :

1. **Choisis la famille** (Dragodindes, Muldos, Volkornes) en haut de l'écran.
2. **Saisis ton étable** (onglet *Étable*) : pour chaque couleur, le nombre de mâles et de femelles, et leur état (fertile, féconde, stérile). Coche dans *Succès* les couleurs déjà obtenues avant d'utiliser l'outil.
3. **Suis le tableau de bord** : les actions sont numérotées dans l'ordre. Après chaque action faite en jeu, enregistre le résultat (bouton de la carte) : le plan se recalcule.

## Les écrans

- **Tableau de bord** : la progression vers le prochain succès, puis les *Prochaines étapes* regroupées par type :
  - **Naissances** : les couples à accoupler, combien de fois, quelle makina utiliser et la chance d'obtenir la couleur visée. Le formulaire gère les échecs (autre couleur obtenue) et les jumeaux (Reproducteur).
  - **Clonages** : les paires de stériles à cloner pour récupérer une monture fertile.
  - **Préparer** : les jauges à remplir en enclos, par génération puis par couleur ; *✓ Toutes prêtes* passe tout en Féconde d'un coup.
  - **Captures** : combien de mâles et de femelles capturer, par couleur.
  - Puis le résumé des séances suivantes jusqu'à la génération 10.
- **Mode compagnon** (bouton en haut à droite) : une petite fenêtre toujours au premier plan, à garder à côté du jeu, avec les mêmes actions en version compacte.
- **Étable** : tes montures par couleur, avec des filtres (à préparer, fécondes, stériles, utiles au plan, à vendre…). Les montures dont le plan n'a plus besoin sont signalées *à vendre*.
- **Enclos** : les jauges de chaque enclos comme en jeu. Tu actives les deux jauges utilisées et règles leur remplissage (par palier, ou valeur exacte en mode avancé) : Lignée calcule l'heure où les montures sont prêtes, prévient quand la sérénité sort de la zone ou qu'une jauge se vide, et envoie une notification Windows. Avec un relais Cloudflare gratuit, partageable dans une guilde, la notification arrive aussi sur Discord avec une mention pour toi seul, même Lignée fermée : voir [docs/RELAIS_DISCORD.md](docs/RELAIS_DISCORD.md) et [docs/RELAIS_SECURITE.md](docs/RELAIS_SECURITE.md).
- **Arbre** : la carte de toutes les couleurs par génération, avec les liens de parenté, le chemin pour obtenir une couleur et ce que tu as déjà.
- **Succès** : les couleurs par génération et les paliers de naissances, cochés automatiquement à chaque naissance enregistrée.
- **Paramètres** : thèmes, fond d'écran (galerie Ankama ou image perso), transparence, animations, niveau par défaut, almanax Takeza, sauvegardes et mises à jour.

Chaque modification affiche une notification discrète avec **Annuler**.

## Comment le plan est calculé

- Il part des couleurs manquantes et remonte jusqu'aux générations 1, en réutilisant d'abord tes montures existantes (les plus hauts niveaux pour les étapes les plus importantes).
- Chaque accouplement est **toujours un mâle et une femelle** : le plan décide à l'avance le sexe des bébés (Animakina quand c'est utile) et de chaque capture.
- Les parents deviennent stériles ; deux stériles de même génération sont **clonés** en une monture fertile. Ce recyclage divise le nombre de naissances nécessaires par plus de dix.
- Le plan suppose que chaque accouplement réussit ; en cas d'échec, il suffit d'enregistrer ce qui est né, le plan s'adapte.

Un test joue un élevage complet de zéro pour les trois familles (sexes tirés au hasard) et vérifie qu'il arrive à 100 % sans blocage.

## Données et règles

- Les arbres de croisement ([src/donnees](src/donnees/arbres_croisements_3.7.json)) sont vérifiés contre les objectifs officiels des succès du jeu : `npm run verifier-donnees`.
- Les règles appliquées (chances, makinas, clonage…), leurs sources et leur niveau de confiance sont décrits dans [docs/REFERENCE_ELEVAGE_3.7.md](docs/REFERENCE_ELEVAGE_3.7.md).
- En cas de doute, **l'interface de génétique du jeu fait foi** : signale l'écart dans une [issue](../../issues).

## Tes données

- Sauvegarde : `%APPDATA%\io.github.xenovyrion.lignee\lignee-sauvegarde.json`.
- Copies automatiques : une par jour dans le sous-dossier `sauvegardes` (les 15 dernières sont gardées).
- *Paramètres → Sauvegardes* : exporter ta sauvegarde dans un fichier, en importer une, restaurer une copie automatique.

## Développement

Prérequis : Node.js 22+, Rust (stable) et les [prérequis Tauri pour Windows](https://tauri.app/start/prerequisites/).

```bash
npm install
npm test              # tests (moteur, simulation complète, sauvegardes)
npm run tauri dev     # application de bureau
npm run dev           # interface seule dans le navigateur (sauvegarde en localStorage)
```

| Dossier | Rôle |
|---|---|
| `src/moteur` | règles 3.7, planificateur, conseils, actions sur la sauvegarde (TypeScript pur, testé) |
| `src/ecrans` | interface React (tableau de bord, compagnon, étable, arbre, succès, paramètres) |
| `src/donnees` | arbres de croisement vérifiés, galerie de fonds d'écran |
| `src-tauri` | application Windows (sauvegarde dans AppData, mises à jour) |
| `docs` | référence des règles d'élevage 3.7 et sources |

### Publier une version

1. Monter la version dans `package.json`, `src-tauri/tauri.conf.json` et `src-tauri/Cargo.toml`.
2. Commiter, pousser, attendre la CI.
3. Pousser une étiquette `vX.Y.Z` : le workflow *Release* compile, signe et publie l'installeur et `latest.json` (lu par la mise à jour automatique). La clé de signature est le secret `TAURI_SIGNING_PRIVATE_KEY` du dépôt.

## Licence

© Xenovyrion. Code visible mais pas libre : [PolyForm Strict License 1.0.0](LICENSE). Utilisation gratuite et non commerciale de l'application autorisée ; copie, modification, redistribution et revente interdites.
