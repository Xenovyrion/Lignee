# Référence élevage Dofus 3.7 — mécaniques vérifiées

Rédigée le 13/10/2026 (la 3.7 est sortie le 06/10/2026). Chaque règle indique son **niveau de confiance** :
- ✅ **Officiel** : données du jeu (extraites via api.dofusdb.fr) ou patch notes.
- 🟢 **Recoupé** : au moins 2 guides indépendants concordent.
- 🟡 **Incertain** : sources contradictoires ou une seule source → à vérifier en jeu.

Données des arbres : [donnees/arbres_croisements_3.7.json](../src/donnees/arbres_croisements_3.7.json)

---

## 1. Les succès à obtenir ✅

Chaque succès de génération = **« Obtenir la naissance de toutes les montures de la génération N »**.
La génération 1 ne compte pas : elle s'obtient par capture (un succès de capture par famille).

| Famille | G1 (capture) | G2 | G3 | G4 | G5 | G6 | G7 | G8 | G9 | G10 | **Naissances à obtenir** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Dragodinde | 3 | 3 | 2 | 7 | 2 | 11 | 2 | 15 | 2 | 19 | **63** |
| Muldo | 5 | 10 | 2 | 11 | 2 | 15 | 2 | 19 | 4 | 50 | **115** |
| Volkorne | 4 | 6 | 4 | 22 | 2 | 17 | 1 | 10 | 4 | 50 | **116** |

Soit **294 couleurs à faire naître** + 12 captures + 1 000 naissances au total.
Les nombres ci-dessus sont ceux des objectifs officiels des succès (IDs 95-133, 1488-1497, 9013-9015, 1684-1694).
Les Dragodindes « à Plumes » et « en armure » sont des montures boutique : **non élevables, hors succès**.

## 2. Règles de reproduction (refonte 3.5) 🟢

- **Une monture ne se reproduit qu'une seule fois.** Après l'accouplement, les deux parents deviennent **stériles**.
- 1 accouplement = **1 bébé** (2 si un des parents a la capacité Reproducteur ; deux Reproducteurs ne donnent quand même qu'un bébé de plus).
- Naissance **instantanée**, bébé niveau 1, jauges à 0.
- Conditions : mâle + femelle, même famille, tous deux **féconds** (Endurance, Maturité, Amour à 20 000 chacun), dans l'étable.
- États : Fertile (jauges à remplir) → Féconde (prête) → Stérile (clonable). « Sénile » = anciennes montures d'avant la 3.5 (ni reproduction ni clonage).
- Plus de fatigue, plus de gestation, plus de collisions génétiques (Muldo/Volkorne).

## 3. Génération cible et probabilités 🟢 (taux Optimakina ✅)

**Génération cible** = la génération la plus haute atteignable par le couple, en tenant compte de l'arbre (parents + grands-parents).

```
P(cible) = min(100 %, 30 % + 0,15 % × (niveau ♂ + niveau ♀) + 20 % Optimakina + 20 % Almanax Takeza)
```

| Situation | P(cible) |
|---|---|
| 2 parents niv. 1, rien | 30,3 % |
| 2 parents niv. 100 | 60 % |
| 2 parents niv. 200 | 90 % |
| 2 parents niv. 200 + Optimakina | 100 % |
| Optimakina, niveaux cumulés ≥ 334 (ex. 167 + 167) | 100 % |
| Optimakina + Takeza, niveaux cumulés ≥ 200 | 100 % |

- ✅ L'Optimakina passe de +10 % à **+20 %** en 3.7 (patch notes). Beaucoup de guides affichent encore +10 % : ils sont obsolètes.
- 🟢 S'il existe plusieurs résultats possibles dans la génération cible (Muldo/Volkorne en génération impaire), la probabilité est répartie entre eux, au prorata de l'arbre.
- 🟢 **En cas d'échec**, le bébé prend une couleur de l'arbre (surtout celles des parents). Les parents pèsent plus que les grands-parents, et une couleur présente plusieurs fois a plus de chances.
- 🟡 La pondération exacte de l'échec n'est publiée nulle part. **L'interface de génétique du jeu affiche les probabilités exactes** : c'est la référence.
- Les Dragodindes ont toujours **une seule recette** par couleur. Les Muldos et Volkornes de génération impaire en ont **plusieurs**.

## 4. Makinas (3.7) ✅

Une seule par accouplement, de la même famille, de génération ≥ génération cible.

| Makina | Effet 3.7 |
|---|---|
| Optimakina | +20 % de chances d'obtenir la génération cible |
| Animakina | **choisit le sexe** du bébé (avant la 3.7 : capacité aléatoire) |
| Kromakina | capacité Caméléone (100 %) |

Capacités tirées à la naissance **sans makina** (3.7) : Reproducteur 3 %, Sage 6 %, Amoureuse 8 %, Endurante 8 %. La capacité Précoce a été supprimée. Les capacités ne sont pas héritées et disparaissent au clonage.

## 5. Clonage et extraction 🟢

- **Clonage** : 2 montures **stériles** de **même famille et même génération** → 1 monture **fertile**. Elle garde le sexe, l'arbre et (depuis la 3.7) la sérénité. Jauges remises à 0, capacité perdue. Si les deux couleurs diffèrent, la couleur du clone est tirée à **50/50**.
- **Extraction** : détruit la monture → ressources (Neurone / Ambre de muldo / Corne de volkorne). Quantité = génération. G1 non extractible.

> **Conséquence clé pour le pilotage** : un accouplement consomme 2 fertiles et rend 1 bébé + 2 stériles. Si les 2 stériles sont de même génération, le clonage rend 1 fertile → **la population fertile est conservée**. Les seules vraies sources de montures sont la **capture** (filets multiplicateurs) et la capacité **Reproducteur**.
> Deux parents de générations différentes ne se clonent pas ensemble : il faut les apparier avec d'autres stériles de leur génération.

## 6. Jauges d'enclos (3.7) 🟢

- Capacités doublées en 3.7 : paliers **T1 0-80 000 / T2 → 140 000 / T3 → 180 000 / T4 → 200 000**.
- Toutes les 10 s, chaque monture de l'enclos gagne 10 / 20 / 30 / 40 selon le palier. Consommation identique avec 1 ou 10 montures → **toujours remplir l'enclos (10 places)**.
- 2 jauges actives maximum. Sérénité : Endurance (-5 000 à -1), Maturité (-2 000 à +2 000), Amour (+1 à +5 000).
- 6 enclos de 10 places (débloqués aux niveaux d'éleveur 1/40/80/120/160/200). Étable : **500 places** (3.7).
- XP : uniquement via la Mangeoire, niveau max 200.

## 7. Génétons 🟢

Gagnés seulement si le bébé dépasse **la plus haute génération présente dans l'arbre des deux parents**. Valeurs 3.7 (doublées) par parent : G1 2, G2 4, G3 8, G4 16, G5 30, G6 60, G7 120, G8 240, G9 500. Les deux parents s'additionnent.

---

## 8. Audit du fichier « Suivi elevage.xlsx » (généré par Gemini)

Le fichier ne couvre que les Dragodindes. Il contient 54 lignes (dont 1 doublon et 2 montures inventées) pour 66 couleurs réelles. **15 couleurs manquent et 35 lignes ont une génération fausse** (vérifié par script contre les données officielles).

### Erreurs de données (Dragodindes)

| Ligne Excel | Ce que dit le fichier | Réalité (jeu) |
|---|---|---|
| Dorée | G2, recette Rousse × Amande | **G1 sauvage** (capture) |
| Amande et Dorée, Dorée et Rousse | G3 | **G2** |
| Ébène | G4, Amande-Rousse × Amande-Dorée | **G3**, Amande-Dorée × Dorée-Rousse |
| Indigo | G4, Amande-Rousse × Dorée-Rousse | **G3**, Amande-Dorée × Amande-Rousse |
| Ébène et Indigo | G5 | **G4** (Ébène × Indigo) |
| Pourpre | G6, Ébène-Indigo × Rousse | **G5**, Amande-Rousse × Ébène-Indigo |
| Orchidée | G6, Ébène-Indigo × Amande | **G5**, Dorée-Rousse × Ébène-Indigo |
| Amande-Ébène, Indigo-Rousse, Dorée-Ébène, Dorée-Indigo, Ébène-Rousse | G7 | **G4** |
| Indigo et Ébène (doublon) | G8 | même monture qu'« Ébène et Indigo », G4 |
| Ivoire | Pourpre-Orchidée × Dorée | G7, **Indigo-Pourpre × Orchidée-Pourpre** |
| Turquoise | Pourpre-Orchidée × Ébène-Indigo | G7, **Ébène-Orchidée × Orchidée-Pourpre** |
| Ivoire et Turquoise | G7 | **G8** |
| Émeraude | G8, Ivoire-Turquoise × Amande-Rousse | **G9**, Ivoire-Turquoise × Ivoire-Pourpre |
| Prune | G8, Ivoire-Turquoise × Dorée-Rousse | **G9**, Ivoire-Turquoise × Turquoise-Orchidée |
| Bicolores Émeraude-X / Prune-X | G9 | **G10** |
| Émeraude et Prune | G8 | **G10** |
| Armure, Plume | G10 | montures boutique, hors succès |
| *(absentes)* | — | Amande-Indigo (G4) et 14 bicolores G8 (Ivoire-X, Turquoise-X sauf Ivoire-Turquoise) |

### Erreurs de logique
- La colonne « Besoins nets » (L) est **vide** : la formule de directive vaut donc toujours « PRÊT », quel que soit le stock.
- Le statut « garder / recycler » est figé dans la formule (`IF(TRUE…)` / `IF(FALSE…)`) au lieu d'être calculé.
- Les quotas fixes (3/3, 2/2) ne tiennent compte ni des niveaux, ni de la probabilité de réussite, ni du sexe, ni de la fécondité.
- Aucune notion de généalogie, alors que la génération cible dépend des parents **et des grands-parents**.
- Des incohérences de saisie : bicolores G6 Pourpre/Orchidée cochés « OUI » alors que Pourpre et Orchidée sont à « NON ».
- Le conseil « reproduisez-les en pur » est hérité de l'ancien système. Depuis la 3.5, un X × X donne un X, sans gain net de population.

---

## Sources
- Données officielles du jeu : [api.dofusdb.fr](https://api.dofusdb.fr) (achievements, achievement-objectives, items types 331/332/333)
- [Guide de l'éleveur, édition 2026 — Dofus pour les noobs](https://www.dofuspourlesnoobs.com/guide-de-l-eleveur.html)
- [Mise à jour 3.7 — Dofus pour les noobs](https://www.dofuspourlesnoobs.com/mise-a-jour-307.html)
- [Les Muldos — Dofus pour les noobs](https://www.dofuspourlesnoobs.com/les-muldos.html)
- [Guide refonte de l'élevage — dofuselevage.fr](https://dofuselevage.fr/guide)
- [dragodinde.fr — guides et arbres DD / Muldo / Volkorne](https://dragodinde.fr/guides/volkornes)
- [dafous.app — outil élevage](https://dafous.app/elevage)
- [DofusDB — croisements Volkorne](https://dofusdb.fr/fr/tools/breeding/crossing/volk)
- [Patch notes 3.7 — jeuxend](https://www.jeuxend.com/blog/dofus-3-7-patch-notes-changements)
