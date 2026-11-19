import { useEffect, useState } from "react";
import { journaliser } from "../diagnostic";
import { bonusDu, dateParis, effet, impact, jourSuivant, prochainsBonus, rafraichirAlmanax, type JourAlmanax } from "../almanax";
import { synchroniserAlmanaxRelais } from "../relais";

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
        .then((nouveau) => {
          if (nouveau) setVersion((v) => v + 1);
          // Rappels Discord de la veille, reprogrammés à chaque ouverture et chaque jour.
          void synchroniserAlmanaxRelais();
        })
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
  const demain = bonusDu(jourSuivant(jour));
  return { jour, aujourdhui, demain, prochains: prochainsBonus(undefined, jour), generation: aujourdhui.some((j) => effet(j).generation) };
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

const PICTO = (j: JourAlmanax) => {
  const e = effet(j);
  return e.generation ? "🧬" : e.jauge ? "⏫" : "🐣";
};

/** Calendrier des prochains bonus d'élevage (45 jours, données gardées sur ce PC). */
export function CalendrierAlmanax({ jour, liste, fermer }: { jour: string; liste: JourAlmanax[]; fermer: () => void }) {
  const dans = (d: string) => {
    const n = Math.round((Date.parse(d) - Date.parse(jour)) / 86400_000);
    return n === 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} j`;
  };
  return (
    <div className="surface flex flex-col gap-2 rounded-2xl border border-accent/40 px-4 py-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">📅</span>
        <span className="flex-1 font-semibold">Prochains bonus d'élevage de l'Almanax</span>
        <button onClick={fermer} title="Fermer" className="rounded-md px-2 text-text-muted hover:text-text-primary">
          ✕
        </button>
      </div>
      <ul className="flex flex-col divide-y divide-border">
        {liste.map((j) => (
          <li key={j.date + j.id} className="flex items-start gap-3 py-1.5">
            <span className="w-32 shrink-0 text-xs text-text-secondary">
              <b className="text-text-primary">{new Date(`${j.date}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}</b>
              <br />
              {dans(j.date)}
            </span>
            <span className="text-base">{PICTO(j)}</span>
            <span className="min-w-0 flex-1">
              <span className="text-accent">{j.nom}</span> : {j.description}
              <span className="block text-xs text-status-ok">✓ {impact(effet(j))}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
