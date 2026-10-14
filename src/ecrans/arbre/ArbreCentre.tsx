import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { couleur } from "../../moteur/donnees";
import { arbreAncetres, arbreDescendants, type Noeud } from "../../moteur/genealogie";
import type { Famille } from "../../moteur/types";
import { anneau, COULEURS, ImageMonture, teinte, type Statut } from "./commun";

export type Sens = "ancetres" | "descendants";

interface Props {
  famille: Famille;
  racine: string;
  sens: Sens;
  zoom: number;
  /** Profondeur dépliée par défaut ; chaque branche peut ensuite être dépliée ou repliée. */
  profondeur: number;
  choix: Record<string, number>;
  setChoix: (c: Record<string, number>) => void;
  statut: (id: string) => Statut;
  setSurvol: (id: string | null) => void;
  recentrer: (id: string) => void;
}

/** Arbre généalogique centré sur une couleur : ses ancêtres (jusqu'aux G1) ou ce qu'elle débloque. */
export function ArbreCentre({ famille, racine, sens, zoom, profondeur, choix, setChoix, statut, setSurvol, recentrer }: Props) {
  const arbre = useMemo(
    () => (sens === "ancetres" ? arbreAncetres(famille, racine, choix) : arbreDescendants(famille, racine)),
    [famille, racine, sens, choix],
  );
  // Branches dont l'état diffère de la profondeur par défaut (dépliées au-delà, ou repliées en deçà).
  const [basculees, setBasculees] = useState<Set<string>>(new Set());
  const [contexte, setContexte] = useState("");
  const cleContexte = `${famille}/${racine}/${sens}/${profondeur}`;
  if (contexte !== cleContexte) {
    setContexte(cleContexte);
    setBasculees(new Set());
  }
  const basculer = (cle: string) =>
    setBasculees((b) => {
      const n = new Set(b);
      if (n.has(cle)) n.delete(cle);
      else n.add(cle);
      return n;
    });

  // Centre la vue sur la couleur choisie à chaque changement d'arbre.
  const conteneur = useRef<HTMLDivElement>(null);
  const carteRacine = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const c = conteneur.current;
    const r = carteRacine.current;
    if (!c || !r) return;
    const bc = c.getBoundingClientRect();
    const br = r.getBoundingClientRect();
    c.scrollLeft += br.left + br.width / 2 - (bc.left + bc.width / 2);
    c.scrollTop = 0;
  }, [cleContexte, zoom]);

  const Carte = ({ n, cle, estRacine, ouvert }: { n: Noeud; cle: string; estRacine?: boolean; ouvert: boolean }) => {
    const c = couleur(famille, n.couleur);
    const st = statut(n.couleur);
    const aObtenir = !st.obtenue && st.males + st.femelles === 0;
    const changerRecette = (delta: number) => setChoix({ ...choix, [c.id]: ((n.recette ?? 0) + delta + (n.nbRecettes ?? 1)) % (n.nbRecettes ?? 1) });
    return (
      <div
        ref={estRacine ? carteRacine : undefined}
        onPointerEnter={() => setSurvol(n.couleur)}
        onPointerLeave={() => setSurvol(null)}
        onClick={() => !estRacine && recentrer(n.couleur)}
        title={estRacine ? undefined : "Centrer l'arbre sur cette couleur"}
        style={{ borderColor: teinte(st), borderStyle: st.obtenue ? "solid" : "dashed", boxShadow: anneau(st) ? `0 0 0 3px ${anneau(st)}` : undefined }}
        className={`relative flex flex-col items-center rounded-xl border-2 bg-bg-card px-2 pb-1.5 pt-1 text-center transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${
          estRacine ? "w-40 ring-2 ring-accent/60" : "w-32 cursor-pointer"
        } ${n.dejaVu ? "opacity-60" : ""}`}
      >
        <span className="absolute left-1.5 top-1 text-[10px] text-text-muted">G{c.generation}</span>
{(st.plan === "pret" || st.plan === "preparer") && (
          <span className="absolute right-1.5 top-0 text-base" style={{ color: COULEURS.prochaine }} title={st.plan === "pret" ? "Prochaine naissance : parents prêts" : "Prochaine naissance : parents à préparer"}>
            {st.plan === "pret" ? "★" : "☆"}
          </span>
        )}
        {st.obtenue && c.generation > 1 && !st.plan && <span className="absolute right-1.5 top-0.5 text-xs text-status-ok">✓</span>}
        <ImageMonture famille={famille} id={c.id} taille={estRacine ? 80 : 56} className={aObtenir ? "opacity-60 grayscale" : ""} />
        <div className="text-xs font-medium leading-tight">{c.nom}</div>
        {st.males + st.femelles > 0 && (
          <div className="mt-0.5 text-[11px]">
            <span className="text-sky-400">{st.males}♂</span> <span className="text-pink-400">{st.femelles}♀</span>
          </div>
        )}
        {n.dejaVu && <div className="text-[10px] text-text-muted">↺ détaillée ailleurs</div>}
        {sens === "ancetres" && !n.dejaVu && (n.nbRecettes ?? 0) > 1 && (
          <div className="mt-1 flex items-center gap-1 text-[10px] text-text-secondary" onClick={(e) => e.stopPropagation()}>
            <button className="rounded px-1 hover:bg-bg-hover" onClick={() => changerRecette(-1)}>
              ◀
            </button>
            recette {(n.recette ?? 0) + 1}/{n.nbRecettes}
            <button className="rounded px-1 hover:bg-bg-hover" onClick={() => changerRecette(1)}>
              ▶
            </button>
          </div>
        )}
        {!n.dejaVu && n.enfants.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              basculer(cle);
            }}
            className="mt-1 rounded-full border border-border-light px-2 text-[11px] text-text-secondary hover:border-accent hover:text-accent"
            title={ouvert ? "Replier cette branche" : sens === "ancetres" ? "Afficher ses parents" : "Afficher ce qu'elle débloque"}
          >
            {ouvert ? "▾" : "▸"} {n.enfants.length}
          </button>
        )}
      </div>
    );
  };

  const Branche = ({ n, cle, prof, estRacine }: { n: Noeud; cle: string; prof: number; estRacine?: boolean }) => {
    const ouvert = !n.dejaVu && n.enfants.length > 0 && (prof < profondeur) !== basculees.has(cle);
    return (
      <li>
        <Carte n={n} cle={cle} estRacine={estRacine} ouvert={ouvert} />
        {ouvert && (
          <ul>
            {n.enfants.map((e, i) => (
              <Branche key={`${e.couleur}-${i}`} n={e} cle={`${cle}/${i}`} prof={prof + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div ref={conteneur} className="h-full overflow-auto p-6">
      <div className="arbre inline-block min-w-full" style={{ zoom }}>
        <ul>
          <Branche n={arbre} cle="r" prof={0} estRacine />
        </ul>
      </div>
    </div>
  );
}
