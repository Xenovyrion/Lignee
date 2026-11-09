// Icônes au trait, dans un même style (24 × 24, trait arrondi, couleur du texte courant).
import type { ReactNode } from "react";

const Icone = ({ taille = 22, children }: { taille?: number; children: ReactNode }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);

type P = { taille?: number };

/** Naissance : œuf fêlé. */
export const IconeNaissance = (p: P) => (
  <Icone {...p}>
    <path d="M12 3c3.6 0 6.5 5.2 6.5 9.6A6.5 6.5 0 0 1 12 19.5a6.5 6.5 0 0 1-6.5-6.9C5.5 8.2 8.4 3 12 3Z" />
    <path d="m8.6 11.5 1.9 1.6 1.7-2 1.8 2 1.6-1.4" />
  </Icone>
);

/** Clonage : deux silhouettes qui se superposent. */
export const IconeClonage = (p: P) => (
  <Icone {...p}>
    <circle cx="9" cy="10" r="5" />
    <circle cx="15" cy="14" r="5" />
    <path d="M19.5 3.5v3M18 5h3" />
  </Icone>
);

/** Préparer : sablier. */
export const IconePreparer = (p: P) => (
  <Icone {...p}>
    <path d="M6.5 3h11M6.5 21h11" />
    <path d="M7.5 3c0 4.5 4.5 5.5 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 5.5-4.5 9s4.5 4.5 4.5 9" />
    <path d="M9.5 18.5h5" />
  </Icone>
);

/** Capture : filet. */
export const IconeCapture = (p: P) => (
  <Icone {...p}>
    <path d="M4 5c2.5 4 13.5 4 16 0" />
    <path d="M4 5c0 7 3.5 12 8 14 4.5-2 8-7 8-14" />
    <path d="M8 7.3 10 17M16 7.3 14 17M5.2 11.5h13.6M7 15.5h10" />
  </Icone>
);

/** Blocage : panneau d'interdiction. */
export const IconeBlocage = (p: P) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m5.6 5.6 12.8 12.8" />
  </Icone>
);

/** Prochaines actions : cible. */
export const IconeActions = (p: P) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
  </Icone>
);

/** Étable : grange. */
export const IconeEtable = (p: P) => (
  <Icone {...p}>
    <path d="M3 10.5 12 4l9 6.5V20H3Z" />
    <path d="M9 20v-6h6v6M9 14l6 6M15 14l-6 6" />
  </Icone>
);

/** Arbre généalogique. */
export const IconeArbre = (p: P) => (
  <Icone {...p}>
    <rect x="3" y="3" width="6" height="5" rx="1.5" />
    <rect x="15" y="3" width="6" height="5" rx="1.5" />
    <rect x="9" y="16" width="6" height="5" rx="1.5" />
    <path d="M6 8v3.5h12V8M12 11.5V16" />
  </Icone>
);

/** Succès : trophée. */
export const IconeSucces = (p: P) => (
  <Icone {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M9.5 17h5" />
  </Icone>
);

/** Paramètres : engrenage. */
export const IconeParametres = (p: P) => (
  <Icone {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    <circle cx="12" cy="12" r="6.5" />
  </Icone>
);
