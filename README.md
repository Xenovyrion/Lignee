# Lignée

Outil de pilotage de l'élevage pour **Dofus 3.7** (Dragodindes, Muldos, Volkornes) : il calcule quoi accoupler, quoi capturer et quoi cloner pour obtenir tous les succès de génération.

> Projet de fan, non affilié à Ankama. Dofus est une marque d'Ankama Games.

## Ce que fait l'outil

- **Prochaines actions** : les accouplements réalisables tout de suite avec ton étable, la probabilité d'obtenir la génération cible et le niveau à atteindre pour 100 %. L'outil liste aussi les captures et les clonages à faire, puis le plan complet jusqu'à la génération 10.
- **Étable** : une fiche par monture (couleur, sexe, niveau, état, couleur des parents).
- **Succès** : les 294 couleurs à faire naître, cochées automatiquement à chaque naissance enregistrée.

Le plan est recalculé après chaque naissance. Il recycle les stériles par clonage, ce qui divise le nombre de naissances nécessaires par plus de dix par rapport à un élevage sans recyclage.

## Données et règles

- Les arbres de croisement ([src/donnees](src/donnees/arbres_croisements_3.7.json)) sont vérifiés contre les objectifs officiels des succès du jeu : `npm run verifier-donnees`.
- Les règles appliquées, leurs sources et leur niveau de confiance sont décrits dans [docs/REFERENCE_ELEVAGE_3.7.md](docs/REFERENCE_ELEVAGE_3.7.md).
- En cas de doute, **l'interface de génétique du jeu fait foi** : signale l'écart dans une issue.

## Installation

Télécharge l'installateur Windows dans les [Releases](../../releases). L'application n'étant pas signée, Windows SmartScreen peut afficher un avertissement au premier lancement : *Informations complémentaires → Exécuter quand même*.

Ta sauvegarde est un fichier JSON situé dans `%APPDATA%\io.github.xenovyrion.lignee\`.

## Développement

Prérequis : Node.js 22+, Rust (stable) et les [prérequis Tauri pour Windows](https://tauri.app/start/prerequisites/).

```bash
npm install
npm test              # tests du moteur
npm run tauri dev     # application de bureau
npm run dev           # interface seule dans le navigateur (sauvegarde en localStorage)
```

Organisation :

| Dossier | Rôle |
|---|---|
| `src/moteur` | règles 3.7, génération cible, planificateur, actions (TypeScript pur, testé) |
| `src/ecrans` | interface React |
| `src/donnees` | arbres de croisement vérifiés |
| `src-tauri` | coque Windows (sauvegarde dans AppData) |

## Licence

[GPL-3.0-or-later](LICENSE) : tu peux utiliser, modifier et redistribuer le code, mais toute version modifiée distribuée doit rester open source sous la même licence.
