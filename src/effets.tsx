// Effets visuels : nombres qui défilent, confettis, lucioles de fond, bandeau de succès.
// Tous se coupent avec l'option « Animations » (classe .sans-animation sur la racine) ou le
// réglage système « réduire les animations ».
import { useEffect, useRef, useState } from "react";

const reduit = () => typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || !!document.querySelector(".sans-animation"));

/** Valeur qui défile jusqu'à `cible` (démarre à 0 au premier affichage). */
export function useCompteur(cible: number, duree = 700) {
  const [v, setV] = useState(reduit() ? cible : 0);
  const depart = useRef(v);
  useEffect(() => {
    if (reduit()) {
      setV(cible);
      return;
    }
    const de = depart.current;
    const t0 = performance.now();
    let id = 0;
    const pas = (t: number) => {
      const k = Math.min(1, (t - t0) / duree);
      const x = de + (cible - de) * (1 - Math.pow(1 - k, 3));
      depart.current = x;
      setV(x);
      if (k < 1) id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [cible, duree]);
  return v;
}

export const Nombre = ({ valeur }: { valeur: number }) => <>{Math.round(useCompteur(valeur))}</>;

const TEINTES_CONFETTI = ["var(--color-accent-clair)", "var(--color-accent)", "var(--color-accent-2)", "#4ade80", "#f1f5f9", "#f472b6"];

/** Pluie de confettis dorés, rejouée à chaque changement de `declencheur` (> 0). */
export function Confettis({ declencheur }: { declencheur: number }) {
  const [actif, setActif] = useState(0);
  useEffect(() => {
    if (!declencheur || reduit()) return;
    setActif(declencheur);
    const t = window.setTimeout(() => setActif(0), 2600);
    return () => window.clearTimeout(t);
  }, [declencheur]);
  if (!actif) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {Array.from({ length: 70 }, (_, i) => (
        <span
          key={`${actif}-${i}`}
          className="confetti"
          style={{
            left: `${Math.random() * 100}%`,
            background: TEINTES_CONFETTI[i % TEINTES_CONFETTI.length],
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${1.6 + Math.random() * 0.9}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
            width: `${5 + Math.random() * 5}px`,
            height: `${8 + Math.random() * 6}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Bandeau temporaire en haut de l'écran (succès obtenu, nouvelle couleur). */
export function Bandeau({ message, fermer }: { message: string | null; fermer: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(fermer, 4500);
    return () => window.clearTimeout(t);
  }, [message, fermer]);
  if (!message) return null;
  return (
    <div className="bandeau fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl border border-accent/60 bg-bg-card/95 px-6 py-3 text-center shadow-[0_10px_40px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] backdrop-blur" role="status">
      <div className="text-lg font-bold text-accent">{message}</div>
    </div>
  );
}

/** Lucioles dorées qui flottent lentement derrière le contenu. */
export function Lucioles() {
  const [points] = useState(() =>
    Array.from({ length: 55 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      taille: 2 + Math.random() * 3.5,
      duree: 14 + Math.random() * 16,
      delai: -Math.random() * 30,
    })),
  );
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {points.map((p, i) => (
        <span
          key={i}
          className="luciole"
          style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.taille, height: p.taille, animationDuration: `${p.duree}s, ${3 + (i % 4)}s`, animationDelay: `${p.delai}s, ${p.delai}s` }}
        />
      ))}
    </div>
  );
}
