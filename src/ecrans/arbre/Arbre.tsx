import { useMemo, useState } from "react";
import { couleur, nomCouleur } from "../../moteur/donnees";
import { conseiller, type ActionAccouplement } from "../../moteur/conseils";
import { enfantsDe, lignee } from "../../moteur/genealogie";
import { planifier } from "../../moteur/planificateur";
import type { Famille, Sauvegarde } from "../../moteur/types";
import { ArbreCentre, type Sens } from "./ArbreCentre";
import { COULEURS, fabriquerStatut, ImageMonture, LegendeArbre, type RolePlan, type Statut } from "./commun";
import { VueEnsemble } from "./VueEnsemble";

interface Props {
  famille: Famille;
  s: Sauvegarde;
}

export function Arbre({ famille, s }: Props) {
  const [racine, setRacine] = useState<string | null>(null);
  const [historique, setHistorique] = useState<string[]>([]);
  const [sens, setSens] = useState<Sens>("ancetres");
  const [zoom, setZoom] = useState(1);
  const [choix, setChoix] = useState<Record<string, number>>({});
  const [survol, setSurvol] = useState<string | null>(null);
  // Profondeur affichée : par défaut, liens directs dans le soleil, arbre complet quand il est centré.
  const [profSoleil, setProfSoleil] = useState(1);
  const [profArbre, setProfArbre] = useState<Record<Sens, number>>({ ancetres: Infinity, descendants: 1 });
  const profondeur = racine ? profArbre[sens] : profSoleil;
  const setProfondeur = (p: number) => (racine ? setProfArbre((x) => ({ ...x, [sens]: p })) : setProfSoleil(p));
  // Le plan d'élevage colore l'arbre : prochaines naissances (★/☆) et couleurs à faire naître pour la suite.
  const { statut, prochaines } = useMemo(() => {
    const plan = planifier(famille, s.montures, s.obtenues[famille]);
    const c = conseiller(plan, { takeza: s.options.takeza });
    const roles = new Map<string, RolePlan>();
    for (const e of plan.etapes) if (e.pour === "intermediaire") roles.set(e.couleur, "produire");
    for (const a of c.aPreparer) roles.set(a.e.couleur, "preparer");
    for (const a of c.prets) roles.set(a.e.couleur, "pret");
    // Une ligne par couleur, les prêtes d'abord.
    const vues = new Set<string>();
    const prochaines = [...c.prets, ...c.aPreparer].filter((a) => !vues.has(a.e.couleur) && vues.add(a.e.couleur));
    return { statut: fabriquerStatut(famille, s.montures, s.obtenues[famille], roles), prochaines };
  }, [famille, s.montures, s.obtenues, s.options.takeza]);

  const centrer = (id: string) => {
    if (racine) setHistorique((h) => [...h, racine]);
    setRacine(id);
    setSurvol(null);
  };
  const retour = () => {
    setRacine(historique[historique.length - 1] ?? null);
    setHistorique((h) => h.slice(0, -1));
  };
  const detail = survol ?? racine;

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[560px] gap-4">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 text-sm">
          {racine ? (
            <>
              <button className="rounded-md px-2 py-1 text-text-secondary hover:bg-bg-hover" onClick={() => (setRacine(null), setHistorique([]))}>
                ☀ Vue d'ensemble
              </button>
              {historique.length > 0 && (
                <button className="rounded-md px-2 py-1 text-text-secondary hover:bg-bg-hover" onClick={retour}>
                  ← {nomCouleur(famille, historique[historique.length - 1])}
                </button>
              )}
              <span className="font-semibold">
                {nomCouleur(famille, racine)} <span className="text-text-muted">G{couleur(famille, racine).generation}</span>
              </span>
              <div className="ml-2 flex rounded-lg border border-border-light p-0.5">
                {(
                  [
                    ["ancetres", "▲ D'où elle vient"],
                    ["descendants", "▼ Ce qu'elle débloque"],
                  ] as const
                ).map(([v, l]) => (
                  <button key={v} onClick={() => setSens(v)} className={`rounded-md px-2.5 py-0.5 ${sens === v ? "bg-bg-hover text-text-primary" : "text-text-secondary"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <span className="flex-1" />
              <button className="h-7 w-7 rounded-md border border-border-light hover:bg-bg-hover" onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}>
                −
              </button>
              <span className="w-10 text-center text-xs text-text-muted">{Math.round(zoom * 100)} %</span>
              <button className="h-7 w-7 rounded-md border border-border-light hover:bg-bg-hover" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}>
                +
              </button>
            </>
          ) : (
            <>
              <span className="font-semibold">Vue d'ensemble</span>
              <span className="text-text-muted">— survole une couleur pour voir sa lignée, clique pour ouvrir son arbre</span>
            </>
          )}
          <span className="flex-1" />
          <div className="flex items-center gap-1 text-xs text-text-secondary" title="Nombre de générations de parenté affichées">
            Profondeur
            <div className="flex rounded-lg border border-border-light p-0.5">
              {[1, 2, 3, Infinity].map((p) => (
                <button key={p} onClick={() => setProfondeur(p)} className={`min-w-[2rem] rounded-md px-1.5 py-0.5 ${profondeur === p ? "bg-accent-dim text-accent" : "hover:bg-bg-hover"}`}>
                  {p === Infinity ? "Tout" : p}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1">
          {racine ? (
            <ArbreCentre
              famille={famille}
              racine={racine}
              sens={sens}
              zoom={zoom}
              profondeur={profondeur}
              choix={choix}
              setChoix={setChoix}
              statut={statut}
              setSurvol={setSurvol}
              recentrer={centrer}
            />
          ) : (
            <VueEnsemble famille={famille} statut={statut} profondeur={profondeur} survol={survol} setSurvol={setSurvol} choisir={centrer} />
          )}
        </div>
        <LegendeArbre />
      </div>

      <aside className="w-72 shrink-0 overflow-y-auto rounded-xl border border-border bg-bg-card p-4">
        {detail ? (
          <Detail famille={famille} id={detail} statut={statut(detail)} centrer={centrer} />
        ) : (
          <div className="flex flex-col gap-5">
            <Prochaines famille={famille} liste={prochaines} centrer={centrer} />
            <p className="text-xs text-text-muted">Survole une couleur pour voir ses recettes, ce qu'elle débloque et ton stock ; clique pour ouvrir son arbre.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function Detail({ famille, id, statut, centrer }: { famille: Famille; id: string; statut: Statut; centrer: (id: string) => void }) {
  const c = couleur(famille, id);
  const enfants = enfantsDe(famille, id);
  const l = lignee(famille, id);
  const Puce = ({ x }: { x: string }) => (
    <button onClick={() => centrer(x)} className="flex items-center gap-1 rounded-md border border-border-light px-1.5 py-0.5 text-xs hover:bg-bg-hover" title="Centrer l'arbre">
      <ImageMonture famille={famille} id={x} taille={20} />
      {nomCouleur(famille, x)}
    </button>
  );
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-col items-center text-center">
        <ImageMonture famille={famille} id={id} taille={112} />
        <div className="text-lg font-semibold">{c.nom}</div>
        <div className="text-text-muted">Génération {c.generation}</div>
        <div className="mt-1">
          {c.generation === 1 ? (
            <span className="text-text-secondary">Capturable (sauvage)</span>
          ) : statut.obtenue ? (
            <span className="text-status-ok">✓ Naissance obtenue</span>
          ) : (
            <span className="text-status-warn">Naissance à obtenir</span>
          )}
        </div>
        <div className="mt-1">
          En stock : <span className="text-sky-400">{statut.males} ♂</span> · <span className="text-pink-400">{statut.femelles} ♀</span>
        </div>
      </div>

      {c.recettes.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-text-muted">{c.recettes.length > 1 ? `${c.recettes.length} recettes` : "Recette"}</div>
          <div className="flex flex-col gap-1">
            {c.recettes.map(([a, b], i) => (
              <div key={i} className="flex flex-wrap items-center gap-1">
                <Puce x={a} /> <span className="text-text-muted">×</span> <Puce x={b} />
              </div>
            ))}
          </div>
        </div>
      )}

      {enfants.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-text-muted">Permet d'obtenir ({enfants.length})</div>
          <div className="flex flex-wrap gap-1">
            {enfants.map((x) => (
              <Puce key={x} x={x} />
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-text-muted">
        Lignée : {l.ancetres.size} ancêtre(s), {l.descendants.size} descendant(s) au total.
      </div>
    </div>
  );
}

function Prochaines({ famille, liste, centrer }: { famille: Famille; liste: ActionAccouplement[]; centrer: (id: string) => void }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase text-text-muted">Prochaines naissances ({liste.length})</div>
      {liste.length === 0 ? (
        <p className="text-xs text-text-muted">Aucune pour l'instant : voir les captures dans « Prochaines actions ».</p>
      ) : (
        <div className="flex flex-col gap-1">
          {liste.map((a) => (
            <button
              key={a.e.couleur}
              onClick={() => centrer(a.e.couleur)}
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm hover:bg-bg-hover"
              title="Ouvrir son arbre"
            >
              <span style={{ color: COULEURS.prochaine }}>{a.aPreparer.length ? "☆" : "★"}</span>
              <ImageMonture famille={famille} id={a.e.couleur} taille={24} />
              <span className="flex-1 truncate">{nomCouleur(famille, a.e.couleur)}</span>
              <span className="text-[11px] text-text-muted">G{a.e.generation}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
