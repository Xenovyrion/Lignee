import type { ReactNode } from "react";
import { couleur, couleurs } from "../../moteur/donnees";
import type { Etat, Famille, Monture, Sexe } from "../../moteur/types";
import { champ, ETATS } from "../../ui";
import { compter, estFiltreVide, filtreVide, type Filtre } from "./filtres";

interface Props {
  famille: Famille;
  montures: Monture[]; // toutes les montures de la famille (pour les compteurs)
  reservees: Set<string>;
  filtre: Filtre;
  setFiltre: (f: Filtre) => void;
}

const basculer = <T,>(liste: T[], v: T) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

const Section = ({ titre, children }: { titre: string; children: ReactNode }) => (
  <div className="border-t border-border py-3">
    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{titre}</div>
    {children}
  </div>
);

const Puce = ({ actif, onClick, children, n }: { actif: boolean; onClick: () => void; children: ReactNode; n?: number }) => (
  <button
    onClick={onClick}
    className={`rounded-md border px-2 py-0.5 text-xs ${actif ? "border-accent bg-accent-dim text-accent" : "border-border-light text-text-secondary hover:bg-bg-hover"}`}
  >
    {children}
    {n !== undefined && <span className="ml-1 text-text-muted">{n}</span>}
  </button>
);

export function PanneauFiltres({ famille, montures, reservees, filtre: f, setFiltre }: Props) {
  const maj = (champs: Partial<Filtre>) => setFiltre({ ...f, ...champs });
  const parGen = compter(montures, (m) => couleur(famille, m.couleur).generation);
  const parSexe = compter(montures, (m) => m.sexe);
  const parEtat = compter(montures, (m) => m.etat);
  const parCouleur = compter(montures, (m) => m.couleur);
  const nbReservees = montures.filter((m) => reservees.has(m.id)).length;

  return (
    <aside className="sticky top-4 flex max-h-[calc(100vh-2rem)] w-64 shrink-0 flex-col overflow-y-auto rounded-xl border border-border bg-bg-card p-3">
      <div className="flex items-center justify-between pb-2">
        <span className="font-semibold">Filtres</span>
        {!estFiltreVide(f) && (
          <button className="text-xs text-accent hover:underline" onClick={() => setFiltre(filtreVide())}>
            Tout effacer
          </button>
        )}
      </div>
      <input className={`${champ} mb-1 w-full`} placeholder="Rechercher (ex. « eb ind »)" value={f.texte} onChange={(e) => maj({ texte: e.target.value })} />

      <Section titre="Génération">
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((g) => (
            <Puce key={g} actif={f.generations.includes(g)} onClick={() => maj({ generations: basculer(f.generations, g) })} n={parGen.get(g) ?? 0}>
              G{g}
            </Puce>
          ))}
        </div>
      </Section>

      <Section titre="Sexe">
        <div className="flex gap-1">
          {(["M", "F"] as Sexe[]).map((s) => (
            <Puce key={s} actif={f.sexes.includes(s)} onClick={() => maj({ sexes: basculer(f.sexes, s) })} n={parSexe.get(s) ?? 0}>
              {s === "M" ? "♂ Mâle" : "♀ Femelle"}
            </Puce>
          ))}
        </div>
      </Section>

      <Section titre="État">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(ETATS) as Etat[]).map((e) => (
            <Puce key={e} actif={f.etats.includes(e)} onClick={() => maj({ etats: basculer(f.etats, e) })} n={parEtat.get(e) ?? 0}>
              {ETATS[e]}
            </Puce>
          ))}
        </div>
      </Section>

      <Section titre="Niveau">
        <div className="flex items-center gap-2 text-sm">
          <input type="number" min={1} max={200} className={`${champ} w-16`} value={f.niveauMin} onChange={(e) => maj({ niveauMin: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })} />
          à
          <input type="number" min={1} max={200} className={`${champ} w-16`} value={f.niveauMax} onChange={(e) => maj({ niveauMax: Math.max(1, Math.min(200, Number(e.target.value) || 200)) })} />
        </div>
      </Section>

      <Section titre="Plan d'élevage">
        <div className="flex flex-wrap gap-1">
          <Puce actif={f.plan === "reservees"} onClick={() => maj({ plan: f.plan === "reservees" ? "toutes" : "reservees" })} n={nbReservees}>
            Utilisées
          </Puce>
          <Puce actif={f.plan === "libres"} onClick={() => maj({ plan: f.plan === "libres" ? "toutes" : "libres" })} n={montures.length - nbReservees}>
            Libres
          </Puce>
        </div>
      </Section>

      <Section titre="Couleur">
        <div className="flex flex-col gap-0.5">
          {couleurs(famille)
            .filter((c) => parCouleur.has(c.id) || f.couleurs.includes(c.id))
            .map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-bg-hover">
                <input type="checkbox" className="accent-accent" checked={f.couleurs.includes(c.id)} onChange={() => maj({ couleurs: basculer(f.couleurs, c.id) })} />
                <span className="flex-1 truncate">{c.nom}</span>
                <span className="text-xs text-text-muted">{parCouleur.get(c.id) ?? 0}</span>
              </label>
            ))}
          {parCouleur.size === 0 && <span className="text-xs text-text-muted">Aucune monture</span>}
        </div>
      </Section>
    </aside>
  );
}
