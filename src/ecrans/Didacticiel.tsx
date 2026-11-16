// Visite guidée : une bulle par étape, qui met en lumière un élément de l'écran (sélecteur CSS)
// en changeant d'onglet si besoin. Proposée à la première ouverture, relançable dans les Paramètres.
import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "../Logo";
import { Bouton } from "../ui";

export type OngletTuto = "actions" | "etable" | "arbre" | "succes" | "guide" | "parametres";

interface EtapeTuto {
  titre: string;
  texte: string;
  /** Élément mis en lumière (sélecteur CSS) ; absent : bulle centrée. */
  cible?: string;
  onglet?: OngletTuto;
}

const ETAPES: EtapeTuto[] = [
  {
    titre: "Bienvenue dans Lignée",
    texte:
      "Lignée calcule quoi accoupler, quoi capturer et quoi cloner, dans quel ordre, pour obtenir tous les succès de génération des Dragodindes, Muldos et Volkornes. Cette visite montre l'essentiel en une minute.",
  },
  {
    titre: "Choisis ta famille",
    texte: "Bascule ici entre Dragodindes, Muldos et Volkornes. La barre indique les couleurs déjà obtenues sur le total des succès.",
    cible: '[data-tuto="familles"]',
    onglet: "actions",
  },
  {
    titre: "1. Saisis ton étable",
    texte:
      "Commence par l'Étable : pour chaque couleur, indique combien de mâles et de femelles tu possèdes, et leur état (fertile, féconde, stérile). Plus l'étable est juste, plus le plan l'est.",
    cible: '[data-tuto="ecran"]',
    onglet: "etable",
  },
  {
    titre: "2. Coche tes succès",
    texte: "Dans Succès, coche les couleurs que tu as déjà fait naître avant d'utiliser Lignée. Ensuite, elles se cochent toutes seules à chaque naissance enregistrée.",
    cible: '[data-tuto="ecran"]',
    onglet: "succes",
  },
  {
    titre: "3. Suis le tableau de bord",
    texte: "Ces compteurs résument la séance en cours : accouplements prêts, clonages, montures à préparer en enclos, captures à faire. Clique sur une tuile pour aller à l'action.",
    cible: '[data-tuto="tuiles"]',
    onglet: "actions",
  },
  {
    titre: "Les prochaines étapes, dans l'ordre",
    texte:
      "Fais les actions dans l'ordre des numéros. Chaque carte dit combien de fois la faire, avec quelle makina, et la chance de réussite. Une fois faite en jeu, enregistre le résultat avec le bouton de la carte (même un échec) : le plan se recalcule tout seul.",
    cible: "#actions",
    onglet: "actions",
  },
  {
    titre: "Une erreur ? Annule",
    texte: "Chaque modification affiche une petite notification avec « Annuler ». Ce bouton défait aussi les dernières modifications de la session.",
    cible: '[data-tuto="annuler"]',
  },
  {
    titre: "Mode compagnon",
    texte: "Une petite fenêtre gardée au premier plan, à placer à côté du jeu : les mêmes actions en version compacte, pour enregistrer sans quitter Dofus des yeux.",
    cible: '[data-tuto="compagnon"]',
  },
  {
    titre: "L'arbre des couleurs",
    texte: "Toutes les couleurs par génération, avec leurs parents. Clique sur une couleur pour voir comment l'obtenir depuis ton étable.",
    cible: '[data-tuto="ecran"]',
    onglet: "arbre",
  },
  {
    titre: "Le guide de l'éleveur",
    texte:
      "Nouveau dans l'élevage ? Le Guide explique les bases du jeu (capture, enclos, sérénité, génération cible, clonage, niveaux) et donne les conseils pour finir les succès.",
    cible: '[data-tuto="ecran"]',
    onglet: "guide",
  },
  {
    titre: "Paramètres",
    texte: "Thèmes et fond d'écran, niveau par défaut des montures, almanax Takeza, sauvegardes (export, import, copies automatiques) et mises à jour. Tu peux aussi relancer cette visite d'ici.",
    cible: '[data-tuto="ecran"]',
    onglet: "parametres",
  },
  {
    titre: "À toi de jouer !",
    texte: "Commence par saisir ton étable, puis suis les étapes numérotées du tableau de bord. Bon élevage !",
    onglet: "etable",
  },
];

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

export function Didacticiel({ allerA, fermer }: { allerA: (o: OngletTuto) => void; fermer: () => void }) {
  const [i, setI] = useState(0);
  const etape = ETAPES[i];
  const derniere = i === ETAPES.length - 1;
  useEffect(() => {
    if (etape.onglet) allerA(etape.onglet);
  }, [etape, allerA]);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      if (e.key === "ArrowRight" || e.key === "Enter") (derniere ? fermer() : setI((k) => k + 1));
      if (e.key === "ArrowLeft") setI((k) => Math.max(0, k - 1));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [derniere, fermer]);
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
    if (zone.bottom + 230 < window.innerHeight) bulle = { left, top: zone.bottom + 12 };
    else if (zone.top > 250) bulle = { left, bottom: window.innerHeight - zone.top + 12 };
    else bulle = { right: 28, bottom: 28 };
  }

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Visite guidée">
      {zone ? (
        <div
          className="pointer-events-none fixed rounded-2xl border-2 border-accent transition-all duration-300"
          style={{ left: zone.left, top: zone.top, width: zone.right - zone.left, height: zone.bottom - zone.top, boxShadow: "0 0 0 9999px rgba(0,0,0,0.62), 0 0 24px var(--color-accent)" }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/62" />
      )}
      {/* Bloque les clics sur l'application pendant la visite. */}
      <div className="fixed inset-0" />
      <div key={i} className="apparition fixed flex flex-col gap-3 rounded-2xl border border-accent/60 bg-bg-card p-4 shadow-2xl" style={{ ...bulle, width: LARGEUR }}>
        <div className="flex items-center gap-3">
          {i === 0 && <Logo taille={40} anime />}
          <div className="min-w-0 flex-1">
            <div className="text-xs text-text-muted">
              Étape {i + 1} sur {ETAPES.length}
            </div>
            <h3 className="text-base font-bold text-accent">{etape.titre}</h3>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">{etape.texte}</p>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${(100 * (i + 1)) / ETAPES.length}%` }} />
        </div>
        <div className="flex items-center gap-2">
          {!derniere && (
            <button className="text-xs text-text-muted hover:text-text-primary" onClick={fermer}>
              Passer la visite
            </button>
          )}
          <span className="flex-1" />
          {i > 0 && (
            <Bouton discret onClick={() => setI(i - 1)}>
              Précédent
            </Bouton>
          )}
          <Bouton onClick={() => (derniere ? fermer() : setI(i + 1))}>{derniere ? "Terminer" : "Suivant"}</Bouton>
        </div>
      </div>
    </div>,
    document.body,
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
            Veux-tu une visite guidée de l'outil ? Elle prend une minute et montre comment saisir ton étable et suivre les étapes du plan.
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
