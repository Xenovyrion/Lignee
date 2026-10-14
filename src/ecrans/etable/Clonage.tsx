import { useState } from "react";
import { cloner } from "../../moteur/actions";
import { nomCouleur } from "../../moteur/donnees";
import type { PaireClonage } from "../../moteur/planificateur";
import type { Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, champ, sexeSymbole } from "../../ui";
import { ImageMonture } from "../arbre/commun";

/** Paire de stériles à cloner : on indique la couleur et le sexe constatés en jeu, puis on valide. */
export function ClonagePropose({ paire, setS }: { paire: PaireClonage; setS: (f: (s: Sauvegarde) => Sauvegarde) => void }) {
  const [resultat, setResultat] = useState(paire.a.couleur);
  const [sexe, setSexe] = useState<Sexe>(paire.a.sexe);
  const f = paire.a.famille;
  const valider = () => {
    try {
      setS((s) => cloner(s, paire.a.id, paire.b.id, { couleur: resultat, sexe }));
    } catch (e) {
      alert((e as Error).message);
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-secondary p-2 text-sm">
      <span className="flex flex-1 items-center gap-1.5">
        <ImageMonture famille={f} id={paire.a.couleur} taille={26} />
        <span className="text-xs text-text-secondary">
          {sexeSymbole(paire.a.sexe)} {paire.a.niveau}
        </span>
        <span className="text-text-muted">+</span>
        <ImageMonture famille={f} id={paire.b.couleur} taille={26} />
        <span className="text-xs text-text-secondary">
          {sexeSymbole(paire.b.sexe)} {paire.b.niveau}
        </span>
        <span className={`ml-1 rounded px-1.5 text-xs ${paire.memeCouleur ? "bg-status-ok/15 text-status-ok" : "bg-bg-hover text-text-muted"}`}>
          {paire.memeCouleur ? "résultat certain" : "couleur 50/50"}
        </span>
      </span>
      <select className={champ} value={resultat} onChange={(e) => setResultat(e.target.value)} disabled={paire.memeCouleur} title="Couleur obtenue en jeu">
        {[...new Set([paire.a.couleur, paire.b.couleur])].map((c) => (
          <option key={c} value={c}>
            {nomCouleur(f, c)}
          </option>
        ))}
      </select>
      <select className={champ} value={sexe} onChange={(e) => setSexe(e.target.value as Sexe)} title="Sexe du clone">
        <option value="F">♀</option>
        <option value="M">♂</option>
      </select>
      <Bouton discret onClick={valider}>
        Cloné
      </Bouton>
    </li>
  );
}
