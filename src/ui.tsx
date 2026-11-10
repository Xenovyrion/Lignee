import type { ReactNode, SelectHTMLAttributes } from "react";
import { couleurs, nomCouleur } from "./moteur/donnees";
import type { Famille, Monture } from "./moteur/types";

export const Carte = ({ titre, children, droite }: { titre?: ReactNode; children: ReactNode; droite?: ReactNode }) => (
  <section className="rounded-xl border border-border bg-bg-card p-4">
    {(titre || droite) && (
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{titre}</h2>
        {droite}
      </div>
    )}
    {children}
  </section>
);

export const Bouton = ({ children, discret, ...p }: { discret?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    {...p}
    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-40 ${
      discret
        ? "border border-border-light text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        : "bg-linear-to-b from-accent-clair to-accent text-accent-texte shadow-[0_2px_10px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] hover:brightness-110"
    } ${p.className ?? ""}`}
  >
    {children}
  </button>
);

/** Sélecteur à segments (même style que le menu principal). */
export function Segments<T extends string | number>({
  valeur,
  options,
  onChange,
  petit,
}: {
  valeur: T;
  options: { valeur: T; libelle: ReactNode; icone?: ReactNode; titre?: string; badge?: ReactNode }[];
  onChange: (v: T) => void;
  petit?: boolean;
}) {
  return (
    <div className="flex rounded-xl border border-border bg-bg-secondary p-1">
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <button
            key={String(o.valeur)}
            title={o.titre}
            onClick={() => onChange(o.valeur)}
            className={`flex items-center gap-1.5 rounded-lg font-medium transition ${petit ? "px-2.5 py-0.5 text-xs" : "px-3 py-1.5 text-sm"} ${
              actif ? "bg-linear-to-b from-accent-clair to-accent text-accent-texte shadow-[0_2px_10px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            {o.icone}
            {o.libelle}
            {o.badge}
          </button>
        );
      })}
    </div>
  );
}

/** Titre de section avec filet dégradé (« Génération 3 ———— »). */
export const TitreSection = ({ children, droite }: { children: ReactNode; droite?: ReactNode }) => (
  <div className="mb-2 flex items-center gap-3">
    <span className="text-xs font-semibold uppercase tracking-wider text-accent">{children}</span>
    <span className="h-px flex-1 bg-linear-to-r from-accent/40 to-transparent" />
    {droite}
  </div>
);

export const champ = "rounded-md border border-border-light bg-bg-secondary px-2 py-1.5 text-sm outline-hidden focus:border-accent";

/** Liste déroulante des couleurs d'une famille, groupées par génération. */
export function ChoixCouleur({ famille, vide, ...p }: { famille: Famille; vide?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const gens = [...new Set(couleurs(famille).map((c) => c.generation))];
  return (
    <select {...p} className={`${champ} ${p.className ?? ""}`}>
      {vide !== undefined && <option value="">{vide}</option>}
      {gens.map((g) => (
        <optgroup key={g} label={`Génération ${g}`}>
          {couleurs(famille)
            .filter((c) => c.generation === g)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

export const sexeSymbole = (s: "M" | "F") => (s === "M" ? "♂" : "♀");

export function libelleMonture(m: Monture) {
  return `${nomCouleur(m.famille, m.couleur)} ${sexeSymbole(m.sexe)} niv. ${m.niveau}${m.nom ? ` « ${m.nom} »` : ""}`;
}

export const pourcent = (p: number) => `${Math.round(p * 1000) / 10} %`;

export const ETATS: Record<import("./moteur/types").Etat, string> = { fertile: "Fertile", feconde: "Féconde", sterile: "Stérile" };

export const BadgeSexe = ({ sexe }: { sexe: "M" | "F" }) => (
  <span className={`font-semibold ${sexe === "M" ? "text-sky-400" : "text-pink-400"}`}>{sexeSymbole(sexe)}</span>
);

export const BadgeEtat = ({ etat }: { etat: import("./moteur/types").Etat }) => (
  <span
    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
      etat === "feconde" ? "bg-status-ok/15 text-status-ok" : etat === "sterile" ? "bg-status-err/15 text-status-err" : "bg-status-info/15 text-status-info"
    }`}
  >
    {ETATS[etat]}
  </span>
);
