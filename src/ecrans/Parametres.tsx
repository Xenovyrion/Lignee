import type { ReactNode } from "react";
import { appliquerNiveauUnique, nombreEnclos, prochainPalierEnclos } from "../moteur/etable";
import type { Options, Sauvegarde } from "../moteur/types";
import { Carte, champ } from "../ui";

interface Props {
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

const Ligne = ({ titre, aide, children }: { titre: string; aide: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-6 border-t border-border py-3 first:border-t-0 first:pt-0">
    <div>
      <div className="text-sm font-medium">{titre}</div>
      <div className="text-xs text-text-muted">{aide}</div>
    </div>
    {children}
  </div>
);

export function Parametres({ s, setS }: Props) {
  const o = s.options;
  const maj = (champs: Partial<Options>) => setS((s) => ({ ...s, options: { ...s.options, ...champs } }));
  return (
    <div className="flex flex-col gap-4">
      <Carte titre="Général">
        <Ligne titre="Langue" aide="D'autres langues seront proposées plus tard.">
          <select className={champ} value={o.langue} onChange={(e) => maj({ langue: e.target.value as Options["langue"] })}>
            <option value="fr">Français</option>
          </select>
        </Ligne>
      </Carte>
      <Carte titre="Métier">
        <Ligne
          titre="Niveau du métier Éleveur"
          aide={`Détermine le nombre d'enclos : ${nombreEnclos(o.niveauEleveur)} actuellement${prochainPalierEnclos(o.niveauEleveur) ? `, un de plus au niveau ${prochainPalierEnclos(o.niveauEleveur)}` : " (maximum)"}.`}
        >
          <input
            type="number"
            min={1}
            max={200}
            className={`${champ} w-24`}
            value={o.niveauEleveur}
            onChange={(e) => maj({ niveauEleveur: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
          />
        </Ligne>
      </Carte>
      <Carte titre="Étable">
        <Ligne
          titre="Mode de suivi"
          aide={
            o.modeSuivi === "simple"
              ? "Simple : tu saisis des nombres par couleur, sexe et état (fertile, féconde, stérile), avec un seul niveau pour toutes tes montures."
              : "Détaillé : chaque monture a son niveau, son enclos et sa fiche ; vue Liste et suivi des enclos."
          }
        >
          <div className="flex rounded-lg border border-border-light p-0.5 text-sm">
            {(
              [
                ["simple", "Simple"],
                ["detaille", "Détaillé"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setS((s) => ({ ...(v === "simple" ? appliquerNiveauUnique(s, s.options.niveauParDefaut) : s), options: { ...s.options, modeSuivi: v } }))}
                className={`rounded-md px-3 py-1 ${o.modeSuivi === v ? "bg-accent-dim text-accent" : "text-text-secondary"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </Ligne>
        <Ligne
          titre={o.modeSuivi === "simple" ? "Niveau de tes montures" : "Niveau par défaut"}
          aide={
            o.modeSuivi === "simple"
              ? "Niveau de tes montures au moment des accouplements : il s'applique à toutes et sert à calculer les probabilités (167 + Optimakina = 100 %)."
              : "Niveau proposé pour les nouvelles montures, et appliqué par le bouton « Mettre au niveau » de l'étable."
          }
        >
          <input
            type="number"
            min={1}
            max={200}
            className={`${champ} w-24`}
            value={o.niveauParDefaut}
            onChange={(e) => {
              const n = Math.max(1, Math.min(200, Number(e.target.value) || 1));
              setS((s) => ({ ...(s.options.modeSuivi === "simple" ? appliquerNiveauUnique(s, n) : s), options: { ...s.options, niveauParDefaut: n } }));
            }}
          />
        </Ligne>
        {o.modeSuivi === "detaille" && (
          <Ligne titre="Afficher le nom des montures" aide="Ajoute une colonne « Nom » modifiable dans l'étable.">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.afficherNom} onChange={(e) => maj({ afficherNom: e.target.checked })} />
          </Ligne>
        )}
      </Carte>
      <Carte titre="Accouplements">
        <Ligne titre="Bonus Almanax Takeza actif" aide="+20 % de chances d'obtenir la génération cible, les jours où l'Almanax le propose.">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.takeza} onChange={(e) => maj({ takeza: e.target.checked })} />
        </Ligne>
      </Carte>
    </div>
  );
}
