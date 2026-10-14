import { useMemo } from "react";
import { couleur } from "../../moteur/donnees";
import { arbreAncetres, arbreDescendants, type Noeud } from "../../moteur/genealogie";
import type { Famille } from "../../moteur/types";
import { ImageMonture, teinte, type Statut } from "./commun";

export type Sens = "ancetres" | "descendants";

interface Props {
  famille: Famille;
  racine: string;
  sens: Sens;
  zoom: number;
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
    () => (sens === "ancetres" ? arbreAncetres(famille, racine, choix, profondeur) : arbreDescendants(famille, racine, profondeur)),
    [famille, racine, sens, choix, profondeur],
  );

  const Carte = ({ n, estRacine }: { n: Noeud; estRacine?: boolean }) => {
    const c = couleur(famille, n.couleur);
    const st = statut(n.couleur);
    const changerRecette = (delta: number) => setChoix({ ...choix, [c.id]: ((n.recette ?? 0) + delta + (n.nbRecettes ?? 1)) % (n.nbRecettes ?? 1) });
    return (
      <div
        onPointerEnter={() => setSurvol(n.couleur)}
        onPointerLeave={() => setSurvol(null)}
        onClick={() => !estRacine && recentrer(n.couleur)}
        title={estRacine ? undefined : n.dejaVu ? "Déjà détaillée ailleurs dans l'arbre : cliquer pour la centrer" : "Centrer l'arbre sur cette couleur"}
        style={{ borderColor: teinte(st) }}
        className={`relative flex w-32 flex-col items-center rounded-xl border-2 bg-bg-card px-2 pb-2 pt-1 text-center transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/40 ${
          estRacine ? "w-40 ring-2 ring-accent/60" : "cursor-pointer"
        } ${n.dejaVu ? "border-dashed opacity-60" : ""}`}
      >
        <span className="absolute left-1.5 top-1 text-[10px] text-text-muted">G{c.generation}</span>
        {st.obtenue && c.generation > 1 && <span className="absolute right-1.5 top-0.5 text-xs text-status-ok">✓</span>}
        <ImageMonture famille={famille} id={c.id} taille={estRacine ? 80 : 56} />
        <div className="text-xs font-medium leading-tight">{c.nom}</div>
        {st.males + st.femelles > 0 && (
          <div className="mt-0.5 text-[11px]">
            <span className="text-sky-400">{st.males}♂</span> <span className="text-pink-400">{st.femelles}♀</span>
          </div>
        )}
        {n.dejaVu && <div className="text-[10px] text-text-muted">↺ voir plus haut</div>}
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
      </div>
    );
  };

  const Branche = ({ n, estRacine }: { n: Noeud; estRacine?: boolean }) => (
    <li>
      <Carte n={n} estRacine={estRacine} />
      {n.enfants.length > 0 && (
        <ul>
          {n.enfants.map((e, i) => (
            <Branche key={`${e.couleur}-${i}`} n={e} />
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <div className="h-full overflow-auto p-6">
      <div className="arbre inline-block min-w-full" style={{ zoom }}>
        <ul>
          <Branche n={arbre} estRacine />
        </ul>
      </div>
    </div>
  );
}
