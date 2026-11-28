// Visite guidée, en chapitres : une bulle par étape, qui met en lumière un élément de l'écran (sélecteur CSS)
// en changeant d'onglet si besoin. Certaines étapes demandent d'agir (« À toi ») et avancent d'elles-mêmes une
// fois l'action faite. Les chapitres Étable et Tableau de bord tournent sur une étable de démonstration.
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "../Logo";
import type { Sauvegarde } from "../moteur/types";
import { Bouton } from "../ui";

export type OngletTuto = "actions" | "etable" | "enclos" | "arbre" | "succes" | "guide" | "parametres";
export type Chapitre = "decouverte" | "etable" | "tableau" | "enclos" | "arbre" | "quotidien";

interface EtapeTuto {
  titre: string;
  texte: string;
  /** Élément mis en lumière (sélecteur CSS) ; absent ou introuvable : bulle centrée. */
  cible?: string;
  onglet?: OngletTuto;
  /** Étape interactive : consigne affichée, et condition qui la valide (étable au début de l'étape, étable actuelle). */
  action?: { consigne: string; fait: (debut: Sauvegarde, s: Sauvegarde) => boolean };
}

interface DefChapitre {
  titre: string;
  resume: string;
  duree: string;
  /** Utilise l'étable de démonstration. */
  demo: boolean;
  etapes: EtapeTuto[];
}

const compter = (s: Sauvegarde, couleur: string, sexe: "M" | "F" | null, etat: string) =>
  s.montures.filter((m) => m.famille === "dragodinde" && m.couleur === couleur && (!sexe || m.sexe === sexe) && m.etat === etat).length;
const existe = (sel: string) => () => !!document.querySelector(sel);
const ROUSSE = '[data-couleur="rousse"]';
const NAISSANCE = '#actions li[data-type="naissance"]';

export const CHAPITRES: Record<Chapitre, DefChapitre> = {
  decouverte: {
    titre: "Découverte",
    resume: "Les écrans de Lignée et les boutons du haut, dans l'ordre.",
    duree: "2 min",
    demo: false,
    etapes: [
      {
        titre: "Bienvenue dans Lignée",
        texte:
          "Lignée calcule quoi accoupler, quoi capturer et quoi cloner, dans quel ordre, pour obtenir tous les succès de génération des Dragodindes, Muldos et Volkornes. Ce premier chapitre fait le tour de l'écran, de haut en bas ; les suivants t'apprennent à t'en servir.",
      },
      {
        titre: "Choisis ta famille",
        texte: "Bascule ici entre Dragodindes, Muldos et Volkornes. Chaque famille a son étable, son plan et ses succès. La barre indique les couleurs déjà obtenues.",
        cible: '[data-tuto="familles"]',
        onglet: "actions",
      },
      {
        titre: "Annuler",
        texte: "Chaque modification affiche une notification avec « Annuler ». Ce bouton défait aussi les dernières modifications de la session, une par une.",
        cible: '[data-tuto="annuler"]',
        onglet: "actions",
      },
      {
        titre: "Mode compagnon",
        texte: "Une petite fenêtre gardée au premier plan, à placer à côté du jeu : les mêmes actions en version compacte, pour enregistrer sans quitter Dofus des yeux.",
        cible: '[data-tuto="compagnon"]',
        onglet: "actions",
      },
      {
        titre: "Les bandeaux",
        texte:
          "Juste en dessous peuvent apparaître des bandeaux : 🌙 le bonus d'Almanax d'élevage du jour ou du lendemain (appliqué automatiquement), et la mise à jour disponible. Chacun se ferme avec ✕.",
        onglet: "actions",
      },
      {
        titre: "Les écrans",
        texte:
          "Tableau de bord : ce qu'il faut faire maintenant. Étable : tes montures. Enclos : les minuteurs de tes enclos. Arbre : toutes les couleurs et leurs parents. Succès : les couleurs obtenues. Guide : les règles du jeu. Paramètres : réglages et sauvegardes. On les parcourt dans l'ordre.",
        cible: '[data-tuto="onglets"]',
        onglet: "actions",
      },
      {
        titre: "Le tableau de bord",
        texte:
          "Ton plan du jour : les actions à faire en jeu, numérotées dans l'ordre, avec la makina à utiliser et la chance de réussite. Tu enregistres chaque résultat et le plan se recalcule. Le chapitre « Suivre le tableau de bord » le détaille.",
        cible: '[data-tuto="ecran"]',
        onglet: "actions",
      },
      {
        titre: "L'étable",
        texte:
          "Tout part de là : pour chaque couleur, tu indiques combien de mâles et de femelles tu possèdes, et leur état. Plus l'étable est juste, plus le plan est juste. Le chapitre « Gérer l'étable » te montre comment.",
        cible: '[data-tuto="ecran"]',
        onglet: "etable",
      },
      {
        titre: "Les enclos",
        texte:
          "Pour chaque enclos, active les jauges que tu as mises en jeu et règle leur remplissage : Lignée calcule l'heure où tes montures sont prêtes et te prévient (Windows, et Discord si tu l'as configuré). Le chapitre « Enclos et notifications » le détaille.",
        cible: '[data-tuto="ecran"]',
        onglet: "enclos",
      },
      {
        titre: "L'arbre des couleurs",
        texte: "Toutes les couleurs par génération, avec leurs parents. Clique sur une couleur pour voir comment l'obtenir depuis ton étable.",
        cible: '[data-tuto="ecran"]',
        onglet: "arbre",
      },
      {
        titre: "Les succès",
        texte:
          "Coche ici les couleurs que tu as déjà fait naître avant d'utiliser Lignée : le plan ne les visera plus. Ensuite, elles se cochent toutes seules à chaque naissance enregistrée. En haut, le bilan de ta chance compare tes naissances réussies aux chances prévues, au total puis par makina et par niveau des parents.",
        cible: '[data-tuto="ecran"]',
        onglet: "succes",
      },
      {
        titre: "Le guide de l'éleveur",
        texte: "Nouveau dans l'élevage ? Le Guide explique les règles du jeu (capture, enclos, sérénité, génération cible, clonage, niveaux) et les conseils pour finir les succès.",
        cible: '[data-tuto="ecran"]',
        onglet: "guide",
      },
      {
        titre: "Les paramètres",
        texte: "Apparence, métier, étable, minuteurs, sauvegardes, mises à jour… Le chapitre « Les paramètres » les passe tous en revue.",
        cible: '[data-tuto="ecran"]',
        onglet: "parametres",
      },
      {
        titre: "Recherche rapide",
        texte: "Ctrl+K (ou « Rechercher ») trouve tout de suite une couleur, un onglet, un réglage ou une commande : tape quelques lettres, puis Entrée.",
        cible: '[data-tuto="recherche"]',
        onglet: "actions",
      },
      {
        titre: "Calendrier de l'Almanax",
        texte:
          "Quand un bonus d'élevage arrive dans les 45 prochains jours (+20 % de génération cible, jauge d'enclos doublée, capacité des bébés), le bouton « 🌙 Almanax » apparaît ici et les liste. Sinon, il reste caché.",
        cible: '[data-tuto="almanax"]',
        onglet: "actions",
      },
      {
        titre: "Besoin d'aide plus tard ?",
        texte: "Le bouton « ? Aide » relance le chapitre qui correspond à l'écran affiché. Tous les chapitres sont aussi dans les Paramètres.",
        cible: '[data-tuto="aide"]',
        onglet: "actions",
      },
    ],
  },

  etable: {
    titre: "Gérer l'étable",
    resume: "Filtrer, choisir la vue, saisir ses montures, les passer en féconde et lire les étiquettes.",
    duree: "2 min",
    demo: true,
    etapes: [
      {
        titre: "Une étable d'exemple",
        texte:
          "Pour ce chapitre, Lignée affiche une petite étable de Dragodindes d'exemple : tu peux tout essayer sans risque. Ta vraie étable n'est pas touchée et revient à la fin de la visite.",
        onglet: "etable",
      },
      {
        titre: "Filtres détaillés",
        texte: "Recherche par nom, et filtres par génération, sexe, état, usage dans le plan ou couleur. Ils se combinent avec les raccourcis.",
        cible: '[data-tuto="filtres"]',
        onglet: "etable",
      },
      {
        titre: "Les vues",
        texte:
          "« Par couleur » : une carte par couleur (on y vient juste après). « Stériles » : les paires à cloner. En suivi détaillé (Paramètres → Étable), « Liste » montre chaque monture : clique-la pour ouvrir sa fiche (niveau, nom, capacités, clonage), ou coches-en plusieurs pour changer leur état ou leur niveau d'un coup.",
        cible: '[data-tuto="vues"]',
        onglet: "etable",
      },
      {
        titre: "Remplissage de l'étable",
        texte: "Combien de places sont prises sur les 500 de l'étable du jeu, par famille. Le texte passe en orange quand tu approches de la limite.",
        cible: '[data-tuto="remplissage"]',
        onglet: "etable",
      },
      {
        titre: "Plusieurs montures d'un coup",
        texte: "Après une grosse capture ou pour ta première saisie, « Ajouter des montures » permet d'entrer plusieurs couleurs, sexes et quantités en une fois.",
        cible: '[data-tuto="ajouter"]',
        onglet: "etable",
      },
      {
        titre: "Filtres en un clic",
        texte:
          "« Utiles au plan » : ce que le plan va utiliser. « À préparer » : à mettre en enclos. « Libres » : ce qui reste, en réserve ou à recycler. « À vendre » : couleurs déjà obtenues qui ne servent plus à rien. Le chiffre indique combien de montures sont concernées.",
        cible: '[data-tuto="raccourcis"]',
        onglet: "etable",
      },
      {
        titre: "Une carte par couleur",
        texte:
          "Chaque couleur possédée a sa carte, rangée par génération. Les pastilles donnent le nombre de mâles (bleu) et de femelles (rose) utilisables, sans compter les stériles. Le liseré du haut est orange s'il en manque pour le plan.",
        cible: ROUSSE,
        onglet: "etable",
      },
      {
        titre: "Ce que le plan en fait",
        texte:
          "« pour le plan » : montures que le plan va utiliser. « libres » : non utilisées (à garder si la couleur n'est pas encore obtenue). « à capturer maintenant » : captures demandées aujourd'hui par le tableau de bord, et le total prévu. « à faire naître », « en surplus », « à vendre » complètent le tableau.",
        cible: `${ROUSSE} [data-tuto="etiquettes"]`,
        onglet: "etable",
      },
      {
        titre: "Trois états",
        texte:
          "Fertile : jauges à remplir en enclos avant de pouvoir s'accoupler. Féconde : prête à s'accoupler. Stérile : s'est déjà reproduite, elle ne sert plus qu'au clonage. Une ligne pour les mâles ♂, une pour les femelles ♀.",
        cible: `${ROUSSE} [data-tuto="grille"]`,
        onglet: "etable",
      },
      {
        titre: "Ajoute une monture",
        texte: "Les boutons − et + retirent ou ajoutent une monture. Tu peux aussi cliquer sur le nombre et le taper directement, pratique pour une grosse saisie.",
        cible: `${ROUSSE} [data-tuto="grille"]`,
        onglet: "etable",
        action: {
          consigne: "Ajoute une femelle Rousse fertile : clique sur + dans la colonne Fertile, ligne ♀.",
          fait: (d, s) => compter(s, "rousse", "F", "fertile") > compter(d, "rousse", "F", "fertile"),
        },
      },
      {
        titre: "Jauges remplies : féconde",
        texte:
          "Quand une fertile a fini ses jauges en enclos (sérénité, endurance, maturité, amour), elle devient féconde dans le jeu. La flèche → fait le même passage dans Lignée, sans tout retaper.",
        cible: `${ROUSSE} [data-tuto="rendre-feconde"]`,
        onglet: "etable",
        action: {
          consigne: "Clique sur la flèche → pour passer une Rousse en Féconde.",
          fait: (d, s) => compter(s, "rousse", null, "feconde") > compter(d, "rousse", null, "feconde"),
        },
      },
      {
        titre: "Et les stériles ?",
        texte:
          "Tu n'as presque jamais à les saisir : quand tu enregistres un accouplement sur le tableau de bord, les parents passent en stérile tout seuls, et les clonages les retirent. Ne les vends pas : deux stériles de la même génération donnent une monture fertile au clonage.",
        cible: `${ROUSSE} [data-tuto="grille"]`,
        onglet: "etable",
      },
    ],
  },

  tableau: {
    titre: "Suivre le tableau de bord",
    resume: "Lire le plan, faire les actions dans l'ordre et enregistrer les résultats.",
    duree: "2 min",
    demo: true,
    etapes: [
      {
        titre: "Le plan du jour",
        texte:
          "Le tableau de bord transforme ton étable en liste d'actions à faire en jeu. Ici aussi, on travaille sur l'étable d'exemple : enregistre ce que tu veux, ta vraie étable n'est pas touchée.",
        onglet: "actions",
      },
      {
        titre: "Ta progression",
        texte:
          "En haut : le pourcentage de couleurs obtenues, l'avancement de chaque génération (G2 à G10, celle en cours en surbrillance) et ce qu'il reste dans le plan (naissances, clonages, captures, séances). Une vue compacte, une ligne par action, se choisit dans Paramètres → Apparence.",
        cible: '[data-tuto="progression"]',
        onglet: "actions",
      },
      {
        titre: "Le prochain objectif",
        texte:
          "La prochaine couleur à obtenir pour avancer dans les succès, et ce qu'il reste à faire naître pour compléter sa génération. Si tu as choisi un objectif prioritaire dans l'Arbre (🎯), il s'affiche juste au-dessus et ses naissances passent en tête des actions.",
        cible: '[data-tuto="objectif"]',
        onglet: "actions",
      },
      {
        titre: "Les tuiles",
        texte: "Le résumé de la séance : accouplements prêts, clonages possibles, montures à préparer, captures à faire et blocages. Clique sur une tuile pour sauter à la première action de ce type.",
        cible: '[data-tuto="tuiles"]',
        onglet: "actions",
      },
      {
        titre: "Les actions, dans l'ordre",
        texte:
          "Fais les actions dans l'ordre des numéros : naissances, clonages, jauges à remplir, captures. Les cartes hachurées « Pas encore faisable » attendent une étape précédente (par exemple des jauges à remplir).",
        cible: "#actions",
        onglet: "actions",
      },
      {
        titre: "Une carte d'accouplement",
        texte:
          "Le père ♂ et la mère ♀ à accoupler, et la couleur visée. « ×1 » : combien de fois faire cet accouplement. L'étiquette dit pourquoi : nouvelle couleur pour un succès, ou parent pour la suite. « viser des mâles » : le sexe dont le plan a besoin.",
        cible: NAISSANCE,
        onglet: "actions",
      },
      {
        titre: "La chance de réussite",
        texte:
          "Probabilité d'obtenir la couleur visée, avec la makina conseillée (Optimakina : +20 % de chance, Animakina : sexe choisi). Quand le sexe compte, la chance avec l'autre makina est indiquée dessous. Survole l'anneau pour la raison du choix et les niveaux à atteindre pour 100 %.",
        cible: `${NAISSANCE} [data-tuto="chance"]`,
        onglet: "actions",
      },
      {
        titre: "Enregistre le résultat",
        texte: "Une fois l'accouplement fait en jeu, enregistre-le ici, même s'il a raté : c'est ce qui fait avancer le plan.",
        cible: `${NAISSANCE} [data-tuto="enregistrer"]`,
        onglet: "actions",
        action: { consigne: "Clique sur « Valider naissance ».", fait: existe('[data-tuto="form-naissance"]') },
      },
      {
        titre: "Le formulaire",
        texte:
          "Indique combien d'accouplements tu as faits, la makina utilisée et le sexe de chaque bébé obtenu : rien n'est pré-rempli, pour ne jamais enregistrer un sexe deviné. Raté ? « Croisement raté » remplace le bébé visé par la couleur obtenue. Coche « Reproducteur » si un parent a cette capacité : un accouplement peut alors donner 2 bébés.",
        cible: '[data-tuto="form-naissance"]',
        onglet: "actions",
        action: { consigne: "Indique le sexe du bébé (+ sur ♂ ou ♀), puis clique « Valider ».", fait: (d, s) => s.journal.length > d.journal.length },
      },
      {
        titre: "Le plan s'est recalculé",
        texte:
          "Le bébé est dans l'étable, les parents sont passés en stérile, la couleur est cochée dans les Succès et les actions ont été renumérotées. Une erreur de saisie ? La notification propose « Annuler ».",
        cible: "#actions",
        onglet: "actions",
      },
      {
        titre: "Cloner les stériles",
        texte:
          "Deux stériles de la même génération donnent une monture fertile au clonage, qui garde le sexe et l'arbre de la première. Fais-le en jeu, puis « Valider clonage » sur la carte.",
        cible: '#actions li[data-type="clonage"]',
        onglet: "actions",
      },
      {
        titre: "Préparer les montures",
        texte:
          "Les montures fertiles dont le plan a besoin : mets-les en enclos pour remplir Endurance, Maturité et Amour (10 montures par enclos). Quand elles sont fécondes en jeu, clique sur le sexe concerné ou « Toutes prêtes ». Tu as monté toutes tes fertiles, même celles hors plan ? « Tout passer en Féconde ». En bas de la liste, les actions « ⏩ En avance » préparent les séances suivantes (jauges, captures déjà sûres) : fais-les en même temps pour gagner du temps. La « Priorité du plan » (Paramètres) règle l'équilibre entre vitesse et nombre d'actions. S'il y a plus de montures à préparer que de places, le haut de la liste indique combien de remplissages d'enclos il faudra.",
        cible: '#actions li[data-type="preparer"]',
        onglet: "actions",
      },
      {
        titre: "Capturer",
        texte:
          "Les montures sauvages à capturer, avec le nombre de mâles et de femelles conseillé. Après ta capture, « Valider capture » les ajoute à l'étable en une fois (nombres pré-remplis, ajustables).",
        cible: '#actions li[data-type="capture"]',
        onglet: "actions",
      },
      {
        titre: "Au clavier",
        texte: "↑ et ↓ (ou J et K) choisissent une action, Entrée ouvre son formulaire, Ctrl + Entrée le valide, Échap le ferme. Après une validation, l'action suivante prend sa place : enchaîne sans la souris. Partout : Ctrl + 1 à 7 ouvrent les onglets, Ctrl + Z annule la dernière modification.",
        cible: '[data-tuto="clavier"]',
        onglet: "actions",
      },
      {
        titre: "Et ensuite",
        texte: "Les séances suivantes, si tout réussit : chacune utilise les bébés de la précédente. La prévision se recalcule après chaque naissance.",
        cible: "#ensuite",
        onglet: "actions",
      },
    ],
  },

  enclos: {
    titre: "Enclos et notifications",
    resume: "Régler les jauges d'un enclos, lire l'heure de fin, être prévenu sur Windows ou Discord.",
    duree: "2 min",
    demo: false,
    etapes: [
      {
        titre: "Un minuteur par enclos",
        texte:
          "Ici, tu reproduis ce que tu as mis dans chaque enclos en jeu, et Lignée te dit quand les montures sont prêtes. Le nombre d'enclos suit ton niveau d'Éleveur (Paramètres). Les caractéristiques des montures sont supposées partir de 0, et leur nombre ne change pas la durée.",
        cible: '[data-tuto="ecran"]',
        onglet: "enclos",
      },
      {
        titre: "Les jauges, comme en jeu",
        texte:
          "Dans l'ordre du jeu : Baffeur (sérénité −) et Caresseur (sérénité +), puis Endurance, Maturité, Amour, et la Mangeoire (XP). Deux jauges actives au plus, et Baffeur et Caresseur ne vont pas ensemble. Une jauge inactive est grisée et marquée « off ».",
        cible: '[data-tuto="enclos-jauges"]',
        onglet: "enclos",
      },
      {
        titre: "Active une jauge",
        texte: "Un clic sur la barre l'active et la remplit jusqu'au cran visé. Le rond sous la barre l'active ou la désactive.",
        cible: '[data-tuto="enclos-jauges"]',
        onglet: "enclos",
        action: { consigne: "Clique la barre de l'Amour (rouge) du premier enclos.", fait: existe('[data-tuto="enclos-resultat"]') },
      },
      {
        titre: "Régler le remplissage",
        texte:
          "Mode simple : la barre a 8 crans (T1 ½, T1 plein… T4 plein). Clique un cran pour remplir jusque-là, reclique le cran du haut pour descendre d'un cran, ou utilise la molette. Mode avancé : glisse la barre ou tape la valeur exacte lue en jeu.",
        cible: '[data-tuto="enclos-jauges"]',
        onglet: "enclos",
      },
      {
        titre: "Réglages et sérénité de départ",
        texte:
          "À droite, le récapitulatif : remplissage de chaque jauge, montures, niveau visé pour la Mangeoire. La sérénité de départ se règle toute seule d'après les jauges (Amour : positive, Endurance : négative, Maturité : neutre) ; change-la si tes montures sont ailleurs.",
        cible: '[data-tuto="enclos-reglages"]',
        onglet: "enclos",
      },
      {
        titre: "L'heure de fin et les alertes",
        texte:
          "L'heure où l'enclos sera prêt, puis les alertes prévues : jauge vide avant la fin, sérénité qui sort de la zone, caractéristique qui ne progresse pas, chacune avec quoi faire. Avec une jauge de sérénité active, l'heure est une estimation. Si l'Almanax double bientôt une de tes jauges, une ligne 🌙 te dit s'il vaut mieux attendre pour lancer.",
        cible: '[data-tuto="enclos-resultat"]',
        onglet: "enclos",
      },
      {
        titre: "Lancer le minuteur",
        texte:
          "Lance le minuteur au moment où tu remplis l'enclos en jeu : les barres se vident en direct. « ↻ Même réglage » relance tout de suite avec les mêmes jauges (pratique quand un enclos est fini), « Modifier » repart de maintenant avec de nouveaux réglages, « Arrêter » annule. Les alertes arrivent même si tu rouvres Lignée plus tard.",
        cible: '[data-tuto="enclos-actions"]',
        onglet: "enclos",
      },
      {
        titre: "Être prévenu",
        texte:
          "Dans les Paramètres : saisie simple ou avancée, notifications Windows (Lignée ouverte), et Discord via le relais de ta guilde, même Lignée fermée, avec une mention pour toi seul. Pas encore de relais ? « Copier ma demande » prépare le message à envoyer à celui qui le gère. Le relais peut aussi te rappeler la veille les bonus d'Almanax d'élevage.",
        cible: '[data-tuto="minuteurs"]',
        onglet: "parametres",
      },
    ],
  },

  arbre: {
    titre: "L'arbre des couleurs",
    resume: "Trouver une couleur ou un bonus, la viser en priorité, voir ses caractéristiques et le chemin pour l'obtenir.",
    duree: "2 min",
    demo: true,
    etapes: [
      {
        titre: "Trouver une couleur",
        texte: "Tape une partie du nom : la liste propose les couleurs de la famille, Entrée sélectionne la première et centre la carte dessus.",
        cible: '[data-tuto="arbre-recherche"]',
        onglet: "arbre",
      },
      {
        titre: "Chercher par bonus",
        texte: "Choisis un bonus (PM, Vitalité, Esquive PA…) : seules les couleurs qui le donnent restent visibles, avec leur valeur au-dessus. Pratique pour choisir une monture de combat.",
        cible: '[data-tuto="arbre-bonus"]',
        onglet: "arbre",
      },
      {
        titre: "Filtrer la carte",
        texte: "« Tout » montre chaque couleur ; « Mon plan » seulement celles à faire naître et leurs parents ; « Manquantes » celles jamais obtenues. Les autres sont estompées.",
        cible: '[data-tuto="arbre-filtres"]',
        onglet: "arbre",
      },
      {
        titre: "La carte des lignées",
        texte:
          "Une colonne par génération. Glisse pour te déplacer, molette pour zoomer, boutons + − ⤢ en haut à gauche, mini-carte en bas à droite. Au survol : parents et enfants directs. La pastille sous une couleur donne ton stock (♂ · ♀).",
        cible: '[data-tuto="arbre-carte"]',
        onglet: "arbre",
        action: { consigne: "Clique une couleur sur la carte.", fait: existe('[data-tuto="arbre-carac"]') },
      },
      {
        titre: "La légende",
        texte: "Obtenue (✓), prochaine étape avec son numéro du tableau de bord, à produire pour la suite (tirets orange), jamais obtenue (tirets gris). Liens dorés : d'où elle vient ; bleus : ce qu'elle débloque. Repliable.",
        cible: '[data-tuto="arbre-legende"]',
        onglet: "arbre",
      },
      {
        titre: "Viser en priorité",
        texte:
          "« 🎯 Viser en priorité » fait passer cette couleur avant tout le reste : le plan prend le chemin le plus court vers elle, et une fois née, elle est gardée (jamais utilisée comme parent). Le tableau de bord l'affiche en tête ; une fois obtenue, il te félicite et propose d'en choisir une autre. « Retirer » rend la main aux succès.",
        cible: '[data-tuto="viser"]',
        onglet: "arbre",
      },
      {
        titre: "Le détail d'une couleur",
        texte:
          "De haut en bas : génération, naissance obtenue ou non et stock ; ses caractéristiques au niveau maximum ; « Comment l'obtenir », les étapes de ton plan avec leur séance (clic : la sélectionner) ; les parents possibles ; ce qu'elle débloque. Les longues listes se déplient.",
        cible: '[data-tuto="arbre-detail"]',
        onglet: "arbre",
      },
    ],
  },

  quotidien: {
    titre: "Les paramètres",
    resume: "Chaque réglage de Lignée, dans l'ordre de la page.",
    duree: "3 min",
    demo: false,
    etapes: [
      {
        titre: "Général",
        texte: "La langue de Lignée : le français pour l'instant, d'autres langues viendront plus tard.",
        cible: '[data-tuto="general"]',
        onglet: "parametres",
      },
      {
        titre: "Apparence",
        texte:
          "Thèmes (Doré, Iop, Sadida…) avec leur fond, image de fond (galerie officielle, ta propre image ou aucune), visibilité et flou de l'image, opacité des panneaux, animations (cartes, compteurs, confettis), lucioles en fond d'écran, et vue du tableau de bord : détaillée, ou compacte avec une ligne par action.",
        cible: '[data-tuto="apparence"]',
        onglet: "parametres",
      },
      {
        titre: "Métier",
        texte: "Ton niveau d'Éleveur : il donne le nombre d'enclos affichés dans l'onglet Enclos (un de plus aux paliers du jeu), et le plan en tient compte : avec peu de places, il évite de demander plus de montures à préparer que tes enclos n'en contiennent.",
        cible: '[data-tuto="metier"]',
        onglet: "parametres",
      },
      {
        titre: "Étable",
        texte:
          "Mode de suivi : Simple (des nombres par couleur, sexe et état, un seul niveau pour toutes) ou Détaillé (une fiche et un niveau par monture, qui affinent les chances). Niveau de tes montures, ou niveau par défaut des nouvelles. En détaillé, tu peux aussi afficher le nom des montures.",
        cible: '[data-tuto="reglages-etable"]',
        onglet: "parametres",
      },
      {
        titre: "Accouplements",
        texte:
          "La makina conseillée par défaut : Automatique, toujours Optimakina ou toujours Animakina (modifiable à chaque saisie). En Automatique, le seuil de l'Animakina fixe la chance de génération cible en dessous de laquelle on préfère l'Optimakina, même si le sexe compte. Les bonus d'Almanax d'élevage sont appliqués automatiquement le jour venu, rien à régler.",
        cible: '[data-tuto="accouplements"]',
        onglet: "parametres",
      },
      {
        titre: "Minuteurs d'enclos",
        texte:
          "Saisie des jauges simple (par crans) ou avancée (valeur exacte), notifications Windows (Lignée ouverte), notifications Discord via le relais de ta guilde (même Lignée fermée, avec une mention pour toi seul) et rappel des bonus d'Almanax la veille à 20 h. Pas encore de relais ? « Copier ma demande » prépare le message pour celui qui le gère.",
        cible: '[data-tuto="minuteurs"]',
        onglet: "parametres",
      },
      {
        titre: "Visite guidée",
        texte: "Tous les chapitres de cette visite, à relancer quand tu veux, ensemble ou un par un.",
        cible: '[data-tuto="visite"]',
        onglet: "parametres",
      },
      {
        titre: "Sauvegardes",
        texte:
          "Lignée enregistre toute seule. Exporter / Importer : ton élevage dans un fichier, pour un autre ordinateur. Copies automatiques : restaurables en un clic. Sauvegarde cloud : une copie dans OneDrive ou Google Drive (dossier « Lignée »), avec la liste des copies et « Restaurer ».",
        cible: '[data-tuto="sauvegardes"]',
        onglet: "parametres",
      },
      {
        titre: "Mises à jour",
        texte: "Lignée vérifie au démarrage si une nouvelle version existe et propose de l'installer. Les nouveautés de chaque version sont consultables ici.",
        cible: '[data-tuto="mises-a-jour"]',
        onglet: "parametres",
      },
      {
        titre: "Journal de diagnostic",
        texte: "Si quelque chose semble faux, « Exporter le diagnostic » crée un fichier (journal, sauvegarde, résumé du plan) à transmettre pour comprendre ce qui s'est passé.",
        cible: '[data-tuto="diagnostic"]',
        onglet: "parametres",
      },
      {
        titre: "À propos",
        texte: "Lignée est un outil de fan, sans lien avec Ankama : certaines illustrations restent leur propriété. On y trouve aussi la licence et le lien vers le code public.",
        cible: '[data-tuto="a-propos"]',
        onglet: "parametres",
      },
    ],
  },
};

const ORDRE: Chapitre[] = ["decouverte", "etable", "tableau", "enclos", "arbre", "quotidien"];

/** Chapitre qui correspond à l'écran affiché (bouton « ? Aide »). */
export const chapitreDeLOnglet = (o: OngletTuto): Chapitre =>
  o === "etable" ? "etable" : o === "actions" ? "tableau" : o === "enclos" ? "enclos" : o === "arbre" ? "arbre" : o === "parametres" ? "quotidien" : "decouverte";

/** Position de l'élément ciblé, suivie en continu (défilement, redimensionnement, contenu qui change). */
function useRect(cible?: string) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    if (!cible) {
      setRect(null);
      return;
    }
    let id = 0;
    let premier = true;
    const suivre = () => {
      const el = document.querySelector(cible);
      if (el && premier) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
        premier = false;
      }
      const r = el?.getBoundingClientRect() ?? null;
      setRect((ancien) => (ancien && r && ancien.x === r.x && ancien.y === r.y && ancien.width === r.width && ancien.height === r.height ? ancien : r));
      id = requestAnimationFrame(suivre);
    };
    id = requestAnimationFrame(suivre);
    return () => cancelAnimationFrame(id);
  }, [cible]);
  return rect;
}

const LARGEUR = 380;
const MARGE = 10;

export function Didacticiel({
  chapitre,
  s,
  allerA,
  fermer,
  lancer,
}: {
  chapitre: Chapitre;
  /** Étable affichée (celle de démonstration pendant les chapitres qui l'utilisent). */
  s: Sauvegarde;
  allerA: (o: OngletTuto) => void;
  fermer: () => void;
  lancer: (c: Chapitre) => void;
}) {
  const def = CHAPITRES[chapitre];
  const etapes = def.etapes;
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [chapitre]);
  const etape = etapes[Math.min(i, etapes.length - 1)];
  const derniere = i >= etapes.length - 1;
  const suivantChapitre = ORDRE[ORDRE.indexOf(chapitre) + 1];

  // Étape interactive : état de l'étable au début de l'étape, puis vérification régulière.
  const debut = useRef(s);
  const sCourant = useRef(s);
  sCourant.current = s;
  const [fait, setFait] = useState(false);
  useEffect(() => {
    debut.current = sCourant.current;
    setFait(false);
    if (!etape.action) return;
    const verifier = window.setInterval(() => {
      if (etape.action!.fait(debut.current, sCourant.current)) {
        setFait(true);
        window.clearInterval(verifier);
      }
    }, 200);
    return () => window.clearInterval(verifier);
  }, [etape]);
  const bloque = !!etape.action && !fait;
  // Action réussie : on passe tout seul à l'étape suivante.
  useEffect(() => {
    if (!fait || derniere) return;
    const t = window.setTimeout(() => setI((k) => k + 1), 900);
    return () => window.clearTimeout(t);
  }, [fait, derniere]);

  useEffect(() => {
    if (etape.onglet) allerA(etape.onglet);
  }, [etape, allerA]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "Escape") fermer();
      if ((e.key === "ArrowRight" || e.key === "Enter") && !bloque && !derniere) setI((k) => k + 1);
      if (e.key === "ArrowLeft") setI((k) => Math.max(0, k - 1));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [derniere, bloque, fermer]);
  const rect = useRect(etape.cible);

  // Zone éclairée, rognée à la fenêtre (un écran entier dépasse souvent la hauteur visible).
  const zone = rect && {
    left: Math.max(4, rect.left - MARGE),
    top: Math.max(4, rect.top - MARGE),
    right: Math.min(window.innerWidth - 4, rect.right + MARGE),
    bottom: Math.min(window.innerHeight - 4, rect.bottom + MARGE),
  };
  // Bulle sous la zone, sinon au-dessus, sinon en bas à droite de l'écran (grande zone).
  let bulle: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (zone) {
    const left = Math.min(Math.max(16, zone.left), window.innerWidth - LARGEUR - 16);
    if (zone.bottom + 280 < window.innerHeight) bulle = { left, top: zone.bottom + 12 };
    else if (zone.top > 300) bulle = { left, bottom: window.innerHeight - zone.top + 12 };
    else bulle = { right: 28, bottom: 28 };
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]" role="dialog" aria-label={`Visite guidée : ${def.titre}`}>
      {zone ? (
        <div
          className="fixed rounded-2xl border-2 border-accent transition-all duration-300"
          style={{ left: zone.left, top: zone.top, width: zone.right - zone.left, height: zone.bottom - zone.top, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62), 0 0 24px var(--color-accent)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/62" />
      )}
      {/* Bloque les clics sur l'application, sauf aux étapes où il faut agir. */}
      {!etape.action && <div className="pointer-events-auto fixed inset-0" />}
      <div
        key={`${chapitre}-${i}`}
        className="apparition pointer-events-auto fixed flex flex-col gap-3 rounded-2xl border border-accent/60 bg-bg-primary p-4 shadow-2xl"
        style={{ ...bulle, width: LARGEUR }}
      >
        <div className="flex items-center gap-3">
          {i === 0 && <Logo taille={40} anime />}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-text-muted">
              {def.titre} · étape {i + 1} sur {etapes.length}
            </div>
            <h3 className="text-base font-bold text-accent">{etape.titre}</h3>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{etape.texte}</p>
        {etape.action && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${fait ? "border-status-ok/50 bg-status-ok/10 text-status-ok" : "border-accent/50 bg-accent-dim text-accent"}`}
          >
            {fait ? "✓ Bien joué !" : `👉 À toi : ${etape.action.consigne}`}
          </div>
        )}
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(100 * (i + 1)) / etapes.length}%` }} />
        </div>
        {derniere && suivantChapitre ? (
          <div className="flex flex-col gap-2">
            <Bouton disabled={bloque} onClick={() => lancer(suivantChapitre)}>
              Chapitre suivant : {CHAPITRES[suivantChapitre].titre} →
            </Bouton>
            <div className="flex items-center gap-2">
              {i > 0 && (
                <Bouton discret onClick={() => setI(i - 1)}>
                  Précédent
                </Bouton>
              )}
              <span className="flex-1" />
              <Bouton discret onClick={fermer}>
                Terminer
              </Bouton>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {!derniere && (
              <button className="text-xs text-text-muted hover:text-text-primary" onClick={fermer}>
                Quitter la visite
              </button>
            )}
            {bloque && (
              <button className="text-xs text-text-muted underline-offset-2 hover:text-text-primary hover:underline" onClick={() => setI(i + 1)}>
                Passer
              </button>
            )}
            <span className="flex-1" />
            {i > 0 && (
              <Bouton discret onClick={() => setI(i - 1)}>
                Précédent
              </Bouton>
            )}
            <Bouton disabled={bloque} onClick={() => (derniere ? fermer() : setI(i + 1))}>
              {derniere ? "Terminer" : "Suivant"}
            </Bouton>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Liste des chapitres, chacun lançable séparément (Paramètres, Guide). */
export function ChoixChapitres({ lancer }: { lancer: (c: Chapitre) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ORDRE.map((c, k) => (
        <button
          key={c}
          onClick={() => lancer(c)}
          className="flex items-start gap-3 rounded-xl border border-border bg-bg-secondary p-3 text-left transition hover:border-accent/60 hover:bg-bg-hover"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-dim text-sm font-bold text-accent">{k + 1}</span>
          <span className="min-w-0">
            <span className="flex items-baseline gap-2">
              <span className="font-semibold">{CHAPITRES[c].titre}</span>
              <span className="text-xs text-text-muted">{CHAPITRES[c].duree}</span>
            </span>
            <span className="block text-xs text-text-secondary">{CHAPITRES[c].resume}</span>
            {CHAPITRES[c].demo && <span className="mt-1 block text-[11px] text-accent">Avec une étable d'exemple</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Proposition affichée à la première ouverture. */
export function ProposerDidacticiel({ commencer, plusTard, refuser }: { commencer: () => void; plusTard: () => void; refuser: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
      <div className="apparition flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-accent/60 bg-bg-card p-6 text-center shadow-2xl">
        <Logo taille={72} anime />
        <div>
          <h2 className="text-xl font-bold">Bienvenue dans Lignée !</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Veux-tu une visite guidée ? Six chapitres courts (≈ 13 minutes en tout) : le tour des écrans, comment gérer ton étable et suivre le tableau de bord en
            t'exerçant sur une étable d'exemple, puis les minuteurs d'enclos, l'arbre des couleurs et tous les réglages.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Bouton onClick={commencer}>Commencer la visite</Bouton>
          <Bouton discret onClick={plusTard}>
            Plus tard
          </Bouton>
        </div>
        <button className="text-xs text-text-muted hover:text-text-primary" onClick={refuser}>
          Non merci, je connais déjà (visite disponible dans les Paramètres)
        </button>
      </div>
    </div>,
    document.body,
  );
}
