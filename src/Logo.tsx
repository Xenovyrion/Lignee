/**
 * Logo de Lignée : un œuf (clin d'œil aux Dofus) en dégradé doré, avec une lignée gravée
 * (deux parents qui donnent un enfant). Même dessin que icone.svg, l'icône de l'application.
 */
export const Logo = ({ taille = 48 }: { taille?: number }) => (
  <svg width={taille} height={taille} viewBox="0 0 1024 1024" aria-label="Lignée" className="shrink-0 drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)]">
    <defs>
      <linearGradient id="logo-fond" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#2a2f45" />
        <stop offset="1" stopColor="#0d0f17" />
      </linearGradient>
      <linearGradient id="logo-oeuf" x1="0.2" y1="0" x2="0.8" y2="1">
        <stop offset="0" stopColor="#fff1b8" />
        <stop offset="0.35" stopColor="#facc15" />
        <stop offset="0.7" stopColor="#f59e0b" />
        <stop offset="1" stopColor="#c2410c" />
      </linearGradient>
      <radialGradient id="logo-halo" cx="0.5" cy="0.55" r="0.5">
        <stop offset="0" stopColor="#facc15" stopOpacity="0.45" />
        <stop offset="1" stopColor="#facc15" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="logo-bord" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fde68a" stopOpacity="0.7" />
        <stop offset="1" stopColor="#7c3aed" stopOpacity="0.5" />
      </linearGradient>
    </defs>
    <rect x="16" y="16" width="992" height="992" rx="230" fill="url(#logo-fond)" stroke="url(#logo-bord)" strokeWidth="20" />
    <circle cx="512" cy="560" r="420" fill="url(#logo-halo)" />
    <path d="M512 150 C700 150 795 420 795 590 C795 770 670 880 512 880 C354 880 229 770 229 590 C229 420 324 150 512 150 Z" fill="url(#logo-oeuf)" />
    <ellipse cx="420" cy="330" rx="70" ry="120" fill="#fff" opacity="0.35" transform="rotate(-25 420 330)" />
    <g stroke="#2a1606" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.9">
      <path d="M402 480 C402 590 512 560 512 660 M622 480 C622 590 512 560 512 660" />
    </g>
    <g fill="#2a1606" opacity="0.9">
      <circle cx="402" cy="440" r="56" fill="#38bdf8" stroke="#2a1606" strokeWidth="22" />
      <circle cx="622" cy="440" r="56" fill="#f472b6" stroke="#2a1606" strokeWidth="22" />
      <circle cx="512" cy="712" r="62" />
    </g>
    <g fill="#fff">
      <circle cx="790" cy="250" r="16" opacity="0.9" />
      <circle cx="240" cy="780" r="10" opacity="0.6" />
      <circle cx="830" cy="700" r="9" opacity="0.5" />
    </g>
  </svg>
);
