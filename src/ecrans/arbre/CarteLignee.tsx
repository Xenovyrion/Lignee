// Carte des lignées : une colonne par génération, déplaçable (glisser) et zoomable (molette).
// Aucun lien par défaut ; au survol, parents et enfants directs ; au clic, toute la lignée.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as PE } from "react";
import { couleur, nomCouleur } from "../../moteur/donnees";
import { dispositionCarte, enfantsDe, lignee } from "../../moteur/genealogie";
import type { Famille } from "../../moteur/types";
import { COULEURS, Etoile, ImageMonture, type Statut } from "./commun";

export type FiltreCarte = "tout" | "plan" | "manquantes";

const COL = 190; // écart entre deux générations
const SOUS = 92; // écart entre deux sous-colonnes d'une même génération
const LIGNE = 92; // écart vertical entre deux couleurs
const NOEUD = 62;
const MARGE = 70;
const BLEU = "#60a5fa";

interface Props {
  famille: Famille;
  statut: (id: string) => Statut;
  selection: string | null;
  setSelection: (id: string | null) => void;
  survol: string | null;
  setSurvol: (id: string | null) => void;
  filtre: FiltreCarte;
  /** Couleurs utilisées par le plan (filtre « Mon plan »). */
  dansPlan: Set<string>;
}

export function CarteLignee({ famille, statut, selection, setSelection, survol, setSurvol, filtre, dansPlan }: Props) {
  // ---------- Disposition (coordonnées du « monde ») ----------
  const { pos, colonnes, centres, largeur, hauteur, etroites } = useMemo(() => {
    const colonnes = dispositionCarte(famille);
    // Les générations très remplies sont réparties en sous-colonnes (en quinconce) pour que la carte
    // reste large plutôt que haute : bien plus lisible sur un écran large.
    const maxLignes = Math.max(8, Math.ceil(Math.max(...colonnes.map((c) => c.length)) / 2));
    const pos = new Map<string, { x: number; y: number }>();
    const centres: number[] = [];
    const etroites = new Set<string>();
    let x = MARGE;
    colonnes.forEach((col) => {
      const k = Math.ceil(col.length / maxLignes);
      const lignes = Math.ceil(col.length / k);
      col.forEach((id, j) => {
        pos.set(id, { x: x + (j % k) * SOUS, y: MARGE + 30 + (Math.floor(j / k) + (maxLignes - lignes) / 2 + (j % k) * (k > 1 ? 0.5 : 0)) * LIGNE });
        if (k > 1) etroites.add(id);
      });
      centres.push(x + ((k - 1) * SOUS) / 2);
      x += (k - 1) * SOUS + COL;
    });
    return { pos, colonnes, centres, etroites, largeur: x - COL + MARGE, hauteur: MARGE * 2 + 30 + maxLignes * LIGNE };
  }, [famille]);

  // ---------- Vue : déplacement et zoom ----------
  const cadre = useRef<HTMLDivElement>(null);
  const [vue, setVue] = useState({ x: 0, y: 0, k: 1 });
  const [taille, setTaille] = useState({ l: 800, h: 600 });
  const ajuster = useCallback(() => {
    const el = cadre.current;
    if (!el) return;
    const l = el.clientWidth;
    const h = el.clientHeight;
    const k = Math.min(l / largeur, h / hauteur, 1.15);
    setVue({ k, x: (l - largeur * k) / 2, y: (h - hauteur * k) / 2 });
  }, [largeur, hauteur]);
  useLayoutEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setTaille({ l: el.clientWidth, h: el.clientHeight }));
    obs.observe(el);
    ajuster();
    return () => obs.disconnect();
  }, [ajuster]);

  // Zoom à la molette autour du curseur.
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const roue = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      setVue((v) => {
        const k = Math.min(2.5, Math.max(0.25, v.k * Math.exp(-e.deltaY * 0.0015)));
        return { k, x: px - ((px - v.x) * k) / v.k, y: py - ((py - v.y) * k) / v.k };
      });
    };
    el.addEventListener("wheel", roue, { passive: false });
    return () => el.removeEventListener("wheel", roue);
  }, []);

  const zoomer = (facteur: number) =>
    setVue((v) => {
      const k = Math.min(2.5, Math.max(0.25, v.k * facteur));
      const cx = taille.l / 2;
      const cy = taille.h / 2;
      return { k, x: cx - ((cx - v.x) * k) / v.k, y: cy - ((cy - v.y) * k) / v.k };
    });

  // Glisser pour déplacer ; un clic sans mouvement dans le vide désélectionne.
  const glisse = useRef<{ x: number; y: number; vx: number; vy: number; bouge: boolean } | null>(null);
  const appui = (e: PE<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-noeud],[data-commande]")) return;
    glisse.current = { x: e.clientX, y: e.clientY, vx: vue.x, vy: vue.y, bouge: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const deplacer = (e: PE<HTMLDivElement>) => {
    const g = glisse.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) g.bouge = true;
    if (g.bouge) setVue((v) => ({ ...v, x: g.vx + dx, y: g.vy + dy }));
  };
  const relacher = () => {
    if (glisse.current && !glisse.current.bouge) setSelection(null);
    glisse.current = null;
  };

  // Échap : désélectionner.
  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === "Escape" && setSelection(null);
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [setSelection]);

  // Centre la vue sur la couleur sélectionnée si elle est hors champ.
  useEffect(() => {
    if (!selection) return;
    const p = pos.get(selection);
    if (!p) return;
    setVue((v) => {
      const sx = v.x + p.x * v.k;
      const sy = v.y + p.y * v.k;
      if (sx > 60 && sx < taille.l - 60 && sy > 60 && sy < taille.h - 60) return v;
      return { ...v, x: taille.l / 2 - p.x * v.k, y: taille.h / 2 - p.y * v.k };
    });
  }, [selection, pos, taille]);

  // ---------- Mise en évidence et liens ----------
  const { allumes, liens } = useMemo(() => {
    const allumes = new Set<string>();
    const liens: { de: string; vers: string; ancetre: boolean }[] = [];
    const parents = (id: string) => [...new Set(couleur(famille, id).recettes.flat())];
    if (selection) {
      const l = lignee(famille, selection);
      allumes.add(selection);
      l.ancetres.forEach((x) => allumes.add(x));
      l.descendants.forEach((x) => allumes.add(x));
      // Liens du côté des ancêtres : chaque couleur vers ses parents qui font partie de la lignée.
      for (const n of [selection, ...l.ancetres]) for (const p of parents(n)) if (l.ancetres.has(p)) liens.push({ de: p, vers: n, ancetre: true });
      for (const n of l.descendants) for (const p of parents(n)) if (p === selection || l.descendants.has(p)) liens.push({ de: p, vers: n, ancetre: false });
    } else if (survol) {
      allumes.add(survol);
      for (const p of parents(survol)) {
        allumes.add(p);
        liens.push({ de: p, vers: survol, ancetre: true });
      }
      for (const e of enfantsDe(famille, survol)) {
        allumes.add(e);
        liens.push({ de: survol, vers: e, ancetre: false });
      }
    }
    return { allumes, liens };
  }, [famille, selection, survol]);

  const focus = selection ?? survol;
  const filtreGarde = (id: string) => {
    const st = statut(id);
    if (filtre === "plan") return dansPlan.has(id);
    if (filtre === "manquantes") return !st.obtenue;
    return true;
  };
  const opacite = (id: string) => {
    if (focus) return allumes.has(id) ? 1 : 0.18;
    return filtreGarde(id) ? 1 : 0.14;
  };
  const avecNoms = vue.k >= 0.75;

  const courbe = (de: string, vers: string) => {
    const a = pos.get(de)!;
    const b = pos.get(vers)!;
    const x1 = a.x + NOEUD / 2;
    const x2 = b.x - NOEUD / 2;
    const dx = Math.max(40, (x2 - x1) / 2);
    return `M${x1},${a.y} C${x1 + dx},${a.y} ${x2 - dx},${b.y} ${x2},${b.y}`;
  };

  return (
    <div
      ref={cadre}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      style={{ cursor: glisse.current?.bouge ? "grabbing" : "grab" }}
      onPointerDown={appui}
      onPointerMove={deplacer}
      onPointerUp={relacher}
      onPointerLeave={() => (glisse.current = null)}
    >
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${vue.x}px, ${vue.y}px) scale(${vue.k})`, width: largeur, height: hauteur }}>
        {/* En-têtes de colonnes */}
        {colonnes.map((col, i) => (
          <div key={i} className="absolute -translate-x-1/2 text-center" style={{ left: centres[i], top: MARGE - 40 }}>
            <div className="text-sm font-bold text-accent">G{couleur(famille, col[0]).generation}</div>
            <div className="text-[10px] text-text-muted">
              {col.filter((id) => statut(id).obtenue).length}/{col.length}
            </div>
          </div>
        ))}

        {/* Liens (seulement autour du survol ou de la sélection) */}
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={largeur} height={hauteur}>
          {liens.map((l, i) => (
            <path
              key={i}
              d={courbe(l.de, l.vers)}
              fill="none"
              strokeWidth={selection ? 2.4 : 2}
              strokeLinecap="round"
              style={{ stroke: l.ancetre ? "var(--color-accent)" : BLEU, opacity: 0.85, filter: `drop-shadow(0 0 4px ${l.ancetre ? "color-mix(in srgb, var(--color-accent) 60%, transparent)" : "rgba(96,165,250,0.6)"})` }}
            />
          ))}
        </svg>

        {/* Couleurs */}
        {[...pos].map(([id, p]) => {
          const st = statut(id);
          const choisi = id === selection;
          const nom = nomCouleur(famille, id);
          return (
            <div
              key={id}
              data-noeud
              className="absolute flex flex-col items-center transition-opacity duration-200"
              style={{ left: p.x - (etroites.has(id) ? SOUS : COL) / 2 + 4, top: p.y - NOEUD / 2, width: (etroites.has(id) ? SOUS : COL) - 8, opacity: opacite(id) }}
              onPointerEnter={() => setSurvol(id)}
              onPointerLeave={() => setSurvol(null)}
              onClick={() => setSelection(choisi ? null : id)}
              title={nom}
            >
              <div
                className={`relative flex cursor-pointer items-center justify-center rounded-full bg-bg-card transition duration-200 hover:scale-110 ${choisi ? "scale-110" : ""}`}
                style={{
                  width: NOEUD,
                  height: NOEUD,
                  border: `2px ${st.obtenue ? "solid" : "dashed"} ${choisi ? "var(--color-accent)" : st.obtenue ? COULEURS.contour : COULEURS.verrouillee}`,
                  boxShadow: choisi
                    ? "0 0 0 4px color-mix(in srgb, var(--color-accent) 35%, transparent), 0 0 24px color-mix(in srgb, var(--color-accent) 50%, transparent)"
                    : st.plan === "produire"
                      ? `0 0 0 3px ${COULEURS.produire}55`
                      : undefined,
                }}
              >
                <ImageMonture famille={famille} id={id} taille={46} className={st.obtenue || st.plan ? "" : "opacity-60 grayscale"} />
                {st.obtenue && couleur(famille, id).generation > 1 && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-black" style={{ background: COULEURS.obtenue }}>
                    ✓
                  </span>
                )}
                {st.rang && (
                  <span className="absolute -right-2 -top-2">
                    <Etoile rang={st.rang} pret={st.plan === "pret"} />
                  </span>
                )}
                {st.plan === "produire" && !st.rang && <span className="absolute -inset-1.5 rounded-full border-2 border-dashed" style={{ borderColor: COULEURS.produire }} />}
              </div>
              {(avecNoms || allumes.has(id)) && (
                <span className={`mt-1 max-w-full truncate rounded px-1 text-[11px] leading-4 ${choisi ? "bg-accent-dim font-semibold text-accent" : "text-text-secondary"}`}>{nom}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Commandes */}
      <div data-commande className="absolute left-3 top-3 flex flex-col gap-1">
        {[
          ["+", "Zoomer", () => zoomer(1.25)],
          ["−", "Dézoomer", () => zoomer(0.8)],
          ["⤢", "Tout afficher", ajuster],
        ].map(([t, titre, f]) => (
          <button
            key={t as string}
            title={titre as string}
            onClick={f as () => void}
            className="surface h-8 w-8 rounded-lg border border-border-light text-sm text-text-secondary hover:text-text-primary"
          >
            {t as string}
          </button>
        ))}
      </div>

      <MiniCarte pos={pos} largeur={largeur} hauteur={hauteur} vue={vue} taille={taille} statut={statut} selection={selection} allumes={allumes} centrer={(x, y) => setVue((v) => ({ ...v, x: taille.l / 2 - x * v.k, y: taille.h / 2 - y * v.k }))} />
    </div>
  );
}

/** Mini-carte : toutes les couleurs en points, le cadre visible, clic pour s'y rendre. */
function MiniCarte(p: {
  pos: Map<string, { x: number; y: number }>;
  largeur: number;
  hauteur: number;
  vue: { x: number; y: number; k: number };
  taille: { l: number; h: number };
  statut: (id: string) => Statut;
  selection: string | null;
  allumes: Set<string>;
  centrer: (x: number, y: number) => void;
}) {
  const L = 170;
  const m = L / p.largeur;
  const H = p.hauteur * m;
  const cadre = { x: -p.vue.x / p.vue.k, y: -p.vue.y / p.vue.k, l: p.taille.l / p.vue.k, h: p.taille.h / p.vue.k };
  return (
    <svg
      data-commande
      width={L}
      height={H}
      className="surface absolute bottom-3 right-3 cursor-pointer rounded-lg border border-border-light"
      onPointerDown={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        p.centrer((e.clientX - r.left) / m, (e.clientY - r.top) / m);
      }}
    >
      {[...p.pos].map(([id, q]) => {
        const st = p.statut(id);
        return (
          <circle
            key={id}
            cx={q.x * m}
            cy={q.y * m}
            r={id === p.selection ? 3.5 : 2}
            style={{ fill: id === p.selection ? "var(--color-accent)" : p.allumes.has(id) ? "var(--color-accent-clair)" : st.obtenue ? COULEURS.obtenue : "rgba(255,255,255,0.35)" }}
          />
        );
      })}
      <rect x={cadre.x * m} y={cadre.y * m} width={cadre.l * m} height={cadre.h * m} fill="none" strokeWidth={1.5} rx={2} style={{ stroke: "var(--color-accent)" }} />
    </svg>
  );
}
