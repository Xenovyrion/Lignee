import { useEffect, useState } from "react";
import { journaliser } from "../diagnostic";
import { bonusDu, dateParis, effet, impact, jourSuivant, rafraichirAlmanax, type JourAlmanax } from "../almanax";

const CLE_FERME = "lignee-almanax-ferme";

/**
 * Bonus d'Almanax du jour (heure de Paris), récupérés une fois par jour et suivis au passage de minuit.
 * Renvoie aussi le jour courant pour que les écrans se recalculent quand il change.
 */
export function useAlmanax() {
  const [jour, setJour] = useState(dateParis);
  const [, setVersion] = useState(0);
  useEffect(() => {
    const charger = () =>
      rafraichirAlmanax()
        .then((nouveau) => nouveau && setVersion((v) => v + 1))
        .catch((e) => journaliser("erreur", `Almanax : ${e instanceof Error ? e.message : String(e)}`));
    charger();
    const id = window.setInterval(() => {
      const d = dateParis();
      setJour((avant) => {
        if (avant !== d) charger();
        return d;
      });
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);
  const aujourdhui = bonusDu(jour);
  const demain = bonusDu(jourSuivant(jour)).filter((j) => Object.keys(effet(j)).length);
  return { jour, aujourdhui, demain, generation: aujourdhui.some((j) => effet(j).generation) };
}

const lireFerme = () => {
  try {
    return localStorage.getItem(CLE_FERME) ?? "";
  } catch {
    return "";
  }
};

/** Bandeau des bonus d'élevage du jour, et rappel de ceux de demain. Fermable jusqu'au lendemain. */
export function BandeauAlmanax({ jour, aujourdhui, demain }: { jour: string; aujourdhui: JourAlmanax[]; demain: JourAlmanax[] }) {
  const [ferme, setFerme] = useState(lireFerme);
  if ((!aujourdhui.length && !demain.length) || ferme === jour) return null;
  const fermer = () => {
    setFerme(jour);
    try {
      localStorage.setItem(CLE_FERME, jour);
    } catch {
      /* stockage indisponible */
    }
  };
  return (
    <div className="surface flex items-start gap-3 rounded-2xl border border-accent/50 px-4 py-3 shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_20%,transparent)]">
      <span className="text-xl">🌙</span>
      <div className="min-w-0 flex-1 text-sm">
        {aujourdhui.map((j) => (
          <div key={j.id + j.description}>
            <span className="font-semibold">Almanax du jour</span> <span className="text-accent">· {j.nom}</span> : {j.description}
            {impact(effet(j)) && <span className="block text-xs text-status-ok">✓ {impact(effet(j))}</span>}
          </div>
        ))}
        {demain.map((j) => (
          <div key={`demain-${j.id}`} className={`text-xs text-text-secondary ${aujourdhui.length ? "mt-1.5" : ""}`}>
            <b className="text-text-primary">Demain</b> : {j.description}
            {effet(j).generation && " Garde tes accouplements importants pour demain."}
          </div>
        ))}
      </div>
      <button onClick={fermer} title="Masquer jusqu'à demain" className="rounded-md px-2 text-text-muted hover:text-text-primary">
        ✕
      </button>
    </div>
  );
}
