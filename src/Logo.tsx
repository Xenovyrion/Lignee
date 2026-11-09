/** Logo de Lignée (même dessin que l'icône de l'application, icone.svg). */
export const Logo = ({ taille = 48 }: { taille?: number }) => (
  <svg width={taille} height={taille} viewBox="0 0 1024 1024" aria-label="Lignée" className="shrink-0 drop-shadow-[0_0_12px_rgba(212,160,23,0.35)]">
    <rect width="1024" height="1024" rx="200" fill="#161b24" stroke="rgba(212,160,23,0.35)" strokeWidth="16" />
    <g stroke="#d4a017" strokeWidth="56" fill="none" strokeLinecap="round">
      <path d="M512 300 V470 M300 470 H724 M300 470 V600 M724 470 V600" />
    </g>
    <g fill="#d4a017">
      <circle cx="512" cy="250" r="90" />
      <circle cx="300" cy="680" r="90" />
      <circle cx="724" cy="680" r="90" />
    </g>
  </svg>
);
