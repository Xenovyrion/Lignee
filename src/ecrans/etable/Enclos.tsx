import { useMemo } from "react";
import { conseiller } from "../../moteur/conseils";
import { couleur, NOMS_FAMILLE, nomCouleur } from "../../moteur/donnees";
import { CAPACITE_ENCLOS, nombreEnclos, prochainPalierEnclos } from "../../moteur/etable";
import type { Plan } from "../../moteur/planificateur";
import type { Famille, Monture, Sauvegarde } from "../../moteur/types";
import { BadgeEtat, Bouton, champ, sexeSymbole } from "../../ui";
import { ImageMonture } from "../arbre/commun";

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
  plan: Plan;
}

/**
 * Suivi des enclos : quelles montures remplissent leurs jauges, remplissage automatique avec les
 * montures à préparer, et fin de session (toutes fécondes, enclos vidé) en un clic.
 */
export function Enclos({ famille, s, setS, plan }: Props) {
  const nb = nombreEnclos(s.options.niveauEleveur);
  const palier = prochainPalierEnclos(s.options.niveauEleveur);
  const parEnclos = (k: number) => s.montures.filter((m) => m.enclos === k);

  // Montures à préparer pour le plan (non fécondes), dans l'ordre des priorités, pas encore en enclos.
  const aPreparer = useMemo(() => {
    const c = conseiller(plan, { takeza: s.options.takeza });
    const l: Monture[] = [];
    for (const a of c.ordre) for (const m of a.aPreparer) if (!l.some((x) => x.id === m.id)) l.push(m);
    return l;
  }, [plan, s.options.takeza]);
  const enAttente = aPreparer.filter((m) => !s.montures.find((x) => x.id === m.id)?.enclos);

  const placer = (ids: string[], k: number | undefined) => {
    const set = new Set(ids);
    setS((s) => ({ ...s, montures: s.montures.map((m) => (set.has(m.id) ? { ...m, enclos: k } : m)) }));
  };
  const remplirAuto = () => {
    const places: [string, number][] = [];
    let i = 0;
    for (let k = 1; k <= nb && i < enAttente.length; k++) {
      const libres = CAPACITE_ENCLOS - parEnclos(k).length;
      for (let j = 0; j < libres && i < enAttente.length; j++) places.push([enAttente[i++].id, k]);
    }
    const carte = new Map(places);
    setS((s) => ({ ...s, montures: s.montures.map((m) => (carte.has(m.id) ? { ...m, enclos: carte.get(m.id) } : m)) }));
  };
  const terminer = (k: number) => {
    if (!confirm(`Session terminée : passer les montures de l'enclos ${k} en « Féconde » et vider l'enclos ?`)) return;
    setS((s) => ({ ...s, montures: s.montures.map((m) => (m.enclos === k ? { ...m, enclos: undefined, etat: m.etat === "sterile" ? m.etat : "feconde" } : m)) }));
  };

  const candidats = (k: number) =>
    s.montures
      .filter((m) => m.famille === famille && m.etat !== "sterile" && !m.enclos)
      .sort((a, b) => Number(aPreparer.some((x) => x.id === b.id)) - Number(aPreparer.some((x) => x.id === a.id)) || couleur(famille, a.couleur).generation - couleur(famille, b.couleur).generation)
      .map((m) => (
        <option key={`${k}-${m.id}`} value={m.id}>
          {aPreparer.some((x) => x.id === m.id) ? "★ " : ""}
          {nomCouleur(m.famille, m.couleur)} {sexeSymbole(m.sexe)} niv. {m.niveau}
        </option>
      ));

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm">
        <span>
          <b>{nb}</b> enclos de {CAPACITE_ENCLOS} places <span className="text-text-muted">(métier Éleveur niveau {s.options.niveauEleveur}</span>
          <span className="text-text-muted">{palier ? ` · prochain enclos au niveau ${palier})` : ")"}</span>
        </span>
        <span className="flex-1" />
        <span className="text-text-secondary">
          {enAttente.length} monture{enAttente.length > 1 ? "s" : ""} à préparer hors enclos
        </span>
        <Bouton disabled={!enAttente.length} onClick={remplirAuto} title="Place dans les places libres les montures à préparer, dans l'ordre des priorités du plan">
          Remplir automatiquement
        </Bouton>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: nb }, (_, i) => i + 1).map((k) => {
          const l = parEnclos(k);
          return (
            <section key={k} className="rounded-xl border border-border bg-bg-secondary p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">Enclos {k}</h3>
                <span className={`text-sm ${l.length >= CAPACITE_ENCLOS ? "text-status-warn" : "text-text-secondary"}`}>
                  {l.length}/{CAPACITE_ENCLOS}
                </span>
              </div>
              <ul className="flex flex-col gap-1">
                {l.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <ImageMonture famille={m.famille} id={m.couleur} taille={26} />
                    <span className="min-w-0 flex-1 truncate">
                      {nomCouleur(m.famille, m.couleur)}
                      {m.famille !== famille && <span className="text-xs text-text-muted"> ({NOMS_FAMILLE[m.famille]})</span>}
                    </span>
                    <span className={m.sexe === "M" ? "text-sky-400" : "text-pink-400"}>{sexeSymbole(m.sexe)}</span>
                    <span className="w-12 text-right text-xs text-text-muted">niv. {m.niveau}</span>
                    <BadgeEtat etat={m.etat} />
                    <button className="px-1 text-text-muted hover:text-status-err" title="Retirer de l'enclos" onClick={() => placer([m.id], undefined)}>
                      ✕
                    </button>
                  </li>
                ))}
                {Array.from({ length: Math.max(0, CAPACITE_ENCLOS - l.length) }, (_, j) => (
                  <li key={`vide-${j}`} className="h-[30px] rounded-md border border-dashed border-border" />
                )).slice(0, 3)}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {l.length < CAPACITE_ENCLOS && (
                  <select className={`${champ} min-w-0 flex-1 text-xs`} value="" onChange={(e) => e.target.value && placer([e.target.value], k)}>
                    <option value="">+ Placer une monture…</option>
                    {candidats(k)}
                  </select>
                )}
                <Bouton discret disabled={!l.length} onClick={() => terminer(k)} title="Toutes les montures de l'enclos passent en « Féconde » et l'enclos est vidé">
                  Session terminée
                </Bouton>
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-text-muted">
        Règle la sérénité avec le Baffeur/Caresseur, puis remplis Endurance (Foudroyeur), Maturité (Abreuvoir) et Amour (Dragofesse) jusqu'à 20 000. ★ : monture à préparer pour le plan.
        Le nombre d'enclos se règle avec le niveau du métier Éleveur dans les Paramètres.
      </p>
    </div>
  );
}
