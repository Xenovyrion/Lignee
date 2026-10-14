import type { ReactNode } from "react";
import { nombreEnclos, prochainPalierEnclos } from "../moteur/etable";
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
        <Ligne titre="Niveau par défaut" aide="Niveau proposé pour les nouvelles montures, et appliqué par le bouton « Mettre au niveau » de l'étable.">
          <input
            type="number"
            min={1}
            max={200}
            className={`${champ} w-24`}
            value={o.niveauParDefaut}
            onChange={(e) => maj({ niveauParDefaut: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
          />
        </Ligne>
        <Ligne titre="Afficher le nom des montures" aide="Ajoute une colonne « Nom » modifiable dans l'étable.">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.afficherNom} onChange={(e) => maj({ afficherNom: e.target.checked })} />
        </Ligne>
      </Carte>
      <Carte titre="Accouplements">
        <Ligne titre="Bonus Almanax Takeza actif" aide="+20 % de chances d'obtenir la génération cible, les jours où l'Almanax le propose.">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.takeza} onChange={(e) => maj({ takeza: e.target.checked })} />
        </Ligne>
      </Carte>
    </div>
  );
}
