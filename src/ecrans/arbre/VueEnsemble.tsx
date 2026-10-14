import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { couleur, couleurs } from "../../moteur/donnees";
import { CASE, dispositionArbre, lignee } from "../../moteur/genealogie";
import type { Famille } from "../../moteur/types";
import { anneau, COULEURS, teinte, type Statut } from "./commun";

interface Props {
  famille: Famille;
  statut: (id: string) => Statut;
  /** Liens de parenté mis en lumière au survol (1 = parents et enfants directs). */
  profondeur: number;
  survol: string | null;
  setSurvol: (id: string | null) => void;
  choisir: (id: string) => void;
}

const R = 25; // rayon d'un médaillon
const MARGE = 70;

/** Courbe verticale d'un parent (en bas) vers un enfant (au-dessus). */
const branche = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const m = (a.y + b.y) / 2;
  return `M${a.x},${a.y} C${a.x},${m} ${b.x},${m} ${b.x},${b.y}`;
};

/**
 * Vue d'ensemble : l'arbre de la famille pousse vers le haut (générations 1 = racines en bas).
 * Au survol, la lignée s'allume jusqu'à la profondeur choisie. Molette = zoom, glisser = déplacer.
 */
export function VueEnsemble({ famille, statut, profondeur, survol, setSurvol, choisir }: Props) {
  // Forme adaptée à l'écran : on essaie plusieurs largeurs de bouquets et on garde la disposition
  // dont les proportions sont les plus proches de celles de la zone d'affichage.
  const cadre = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(1.4);
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e.contentRect.height > 0 && setRatio(Math.round((e.contentRect.width / e.contentRect.height) * 10) / 10));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const d = useMemo(() => {
    const ecart = (x: ReturnType<typeof dispositionArbre>) => Math.abs(Math.log((x.largeur + 2 * MARGE) / (x.hauteur + 2 * MARGE) / ratio));
    return [2, 3, 4, 5, 6].map((c) => dispositionArbre(famille, c)).reduce((a, b) => (ecart(b) < ecart(a) ? b : a));
  }, [famille, ratio]);
  const [vue, setVue] = useState({ k: 1, x: 0, y: 0 });
  const glisse = useRef<{ x: number; y: number; bouge: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  // Branches : principales (le squelette de l'arbre) et secondaires (seconds parents, tracées au survol).
  const branches = useMemo(
    () =>
      couleurs(famille).flatMap((c) =>
        [...new Set(c.recettes.flat())].map((p) => ({
          de: p,
          vers: c.id,
          principale: d.principal.get(c.id) === p,
          // Tronc : la branche mène à une couleur qui porte elle-même des descendants.
          tronc: [...d.principal.values()].includes(c.id),
          chemin: branche(d.positions.get(p)!, d.positions.get(c.id)!),
        })),
      ),
    [famille, d],
  );

  const mise = useMemo(() => (survol ? { ...lignee(famille, survol, profondeur), centre: survol } : null), [famille, survol, profondeur]);
  // Zoom au survol : +25 % pour la couleur survolée, puis de moins en moins avec la distance de parenté.
  const grossissement = (id: string) => {
    const d = mise?.distance.get(id);
    return d === undefined ? 1 : [1.25, 1.15, 1.08][d] ?? 1.04;
  };
  const dansLignee = (id: string) => !mise || id === mise.centre || mise.ancetres.has(id) || mise.descendants.has(id);
  const active = (de: string, vers: string) =>
    !!mise && ((mise.ancetres.has(de) && (mise.ancetres.has(vers) || vers === mise.centre)) || ((de === mise.centre || mise.descendants.has(de)) && mise.descendants.has(vers)));

  // Coordonnées écran → coordonnées du dessin (avant zoom).
  const point = (clientX: number, clientY: number) => {
    const p = svg.current!.createSVGPoint();
    p.x = clientX;
    p.y = clientY;
    return p.matrixTransform(svg.current!.getScreenCTM()!.inverse());
  };
  const molette = (e: WheelEvent) => {
    const p = point(e.clientX, e.clientY);
    const k = Math.min(5, Math.max(0.6, vue.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    setVue({ k, x: p.x - ((p.x - vue.x) * k) / vue.k, y: p.y - ((p.y - vue.y) * k) / vue.k });
  };
  const deplacement = (e: PointerEvent) => {
    const g = glisse.current;
    if (!g) return;
    if (!g.bouge && Math.abs(e.clientX - g.x) + Math.abs(e.clientY - g.y) < 4) return;
    const a = point(g.x, g.y);
    const b = point(e.clientX, e.clientY);
    setVue((v) => ({ ...v, x: v.x + b.x - a.x, y: v.y + b.y - a.y }));
    glisse.current = { x: e.clientX, y: e.clientY, bouge: true };
  };

  const statutSurvol = survol ? couleur(famille, survol) : null;
  return (
    <div ref={cadre} className="relative h-full w-full">
      <svg
        ref={svg}
        viewBox={`${-MARGE} ${-MARGE} ${d.largeur + 2 * MARGE} ${d.hauteur + 2 * MARGE}`}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onWheel={molette}
        onPointerDown={(e) => (glisse.current = { x: e.clientX, y: e.clientY, bouge: false })}
        onPointerMove={deplacement}
        onPointerUp={() => setTimeout(() => (glisse.current = null))}
        onPointerLeave={() => (glisse.current = null)}
      >
        <defs>
          <clipPath id="medaillon">
            <circle r={R - 2} />
          </clipPath>
          <linearGradient id="sol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(120,85,40,0.0)" />
            <stop offset="100%" stopColor="rgba(120,85,40,0.22)" />
          </linearGradient>
        </defs>
        <g transform={`translate(${vue.x} ${vue.y}) scale(${vue.k})`}>
          {/* Sol sous les racines et repères de générations */}
          <rect x={-MARGE * 4} y={d.hauteur - CASE} width={d.largeur + MARGE * 8} height={CASE + MARGE} fill="url(#sol)" />
          {d.niveaux.map(({ generation, y }) => (
            <g key={generation}>
              <line x1={-MARGE} x2={d.largeur + MARGE} y1={y} y2={y} stroke="rgba(255,255,255,0.035)" />
              <text x={-MARGE + 6} y={y + 4} className="fill-text-muted text-[22px] font-semibold">
                G{generation}
              </text>
            </g>
          ))}
          {/* Branches principales, puis branches mises en lumière par-dessus */}
          {branches
            .filter((b) => b.principale)
            .map((b) => (
              <path
                key={`p-${b.de}-${b.vers}`}
                d={b.chemin}
                fill="none"
                stroke={b.tronc ? "#8a6a2c" : "rgba(212,160,23,0.38)"}
                strokeWidth={b.tronc ? 6 : 1.6}
                strokeLinecap="round"
                opacity={mise ? 0.18 : 1}
              />
            ))}
          {mise &&
            branches
              .filter((b) => active(b.de, b.vers))
              .map((b) => (
                <path
                  key={`a-${b.de}-${b.vers}`}
                  d={b.chemin}
                  fill="none"
                  stroke={mise.ancetres.has(b.de) ? "#d4a017" : "#60a5fa"}
                  strokeWidth={2.5}
                  strokeDasharray={b.principale ? undefined : "6 4"}
                />
              ))}
          {/* Les couleurs mises en lumière sont dessinées en dernier pour passer au premier plan. */}
          {[...couleurs(famille)]
            .sort((a, b) => Number(!!mise && dansLignee(a.id)) - Number(!!mise && dansLignee(b.id)) || Number(a.id === survol) - Number(b.id === survol))
            .map((c) => {
            const p = d.positions.get(c.id)!;
            const st = statut(c.id);
            const aObtenir = !st.obtenue && st.males + st.femelles === 0;
            return (
              <g
                key={c.id}
                transform={`translate(${p.x} ${p.y})`}
                className="cursor-pointer"
                opacity={dansLignee(c.id) ? 1 : 0.15}
                onPointerEnter={() => setSurvol(c.id)}
                onPointerLeave={() => setSurvol(null)}
                onClick={() => !glisse.current?.bouge && choisir(c.id)}
              >
                <g style={{ transform: `scale(${grossissement(c.id)})`, transition: "transform 160ms ease-out" }}>
                {anneau(st) && <circle r={R + 5} fill="none" stroke={anneau(st)!} strokeWidth={3} opacity={0.9} />}
                <circle
                  r={R}
                  fill="#161b24"
                  stroke={c.id === survol ? "#d4a017" : teinte(st)}
                  strokeWidth={c.id === survol ? 3.5 : 2.5}
                  strokeDasharray={st.obtenue || c.id === survol ? undefined : "5 4"}
                />
                {c.image && (
                  <image
                    href={c.image}
                    x={-R + 2}
                    y={-R + 2}
                    width={2 * R - 4}
                    height={2 * R - 4}
                    clipPath="url(#medaillon)"
                    style={aObtenir ? { filter: "grayscale(1)", opacity: 0.55 } : undefined}
                  />
                )}
                {(st.plan === "pret" || st.plan === "preparer") && (
                  <text x={R - 2} y={-R + 8} textAnchor="middle" fontSize={20} fill={COULEURS.prochaine} stroke="#0b0d12" strokeWidth={3} paintOrder="stroke" className="pointer-events-none">
                    {st.plan === "pret" ? "★" : "☆"}
                  </text>
                )}
                {(
                  [
                    [st.males, COULEURS.males, -R + 4],
                    [st.femelles, COULEURS.femelles, R - 4],
                  ] as const
                ).map(([n, fond, x]) =>
                  n > 0 ? (
                    <g key={x} transform={`translate(${x} ${R - 4})`} className="pointer-events-none">
                      <circle r={9} fill={fond} stroke="#0b0d12" strokeWidth={2} />
                      <text y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
                        {n}
                      </text>
                    </g>
                  ) : null,
                )}
                {/* Nom affiché sous les couleurs de la lignée mise en lumière */}
                {mise && dansLignee(c.id) && (
                  <text y={R + 14} textAnchor="middle" fontSize={12} fill="#e2e8f0" stroke="#0b0d12" strokeWidth={3} paintOrder="stroke" className="pointer-events-none">
                    {c.nom}
                  </text>
                )}
                </g>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="absolute bottom-3 left-3 flex gap-1">
        {(
          [
            ["+", () => setVue((v) => ({ ...v, k: Math.min(5, v.k * 1.25) }))],
            ["−", () => setVue((v) => ({ ...v, k: Math.max(0.6, v.k / 1.25) }))],
            ["⟲", () => setVue({ k: 1, x: 0, y: 0 })],
          ] as const
        ).map(([t, f]) => (
          <button key={t} onClick={f} className="h-8 w-8 rounded-md border border-border-light bg-bg-card text-text-secondary hover:bg-bg-hover">
            {t}
          </button>
        ))}
      </div>
      {statutSurvol && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-bg-card/90 px-3 py-1.5 text-sm">
          <b>{statutSurvol.nom}</b> <span className="text-text-muted">G{statutSurvol.generation}</span>
          <span className="ml-2 text-xs text-accent">● ancêtres</span> <span className="text-xs text-status-info">● descendants</span>
          <span className="ml-2 text-xs text-text-muted">- - - second parent</span>
        </div>
      )}
    </div>
  );
}
