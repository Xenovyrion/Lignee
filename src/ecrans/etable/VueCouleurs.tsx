import { couleurs } from "../../moteur/donnees";
import type { Famille, Monture, Sexe } from "../../moteur/types";

interface Props {
  famille: Famille;
  montures: Monture[]; // déjà filtrées
  ajouter: (couleur: string, sexe: Sexe) => void;
  retirer: (couleur: string, sexe: Sexe) => void;
  ouvrirCouleur: (couleur: string) => void;
}

/** Une ligne par couleur : lecture rapide du stock et ajout en un clic. */
export function VueCouleurs({ famille, montures, ajouter, retirer, ouvrirCouleur }: Props) {
  const lignes = couleurs(famille)
    .map((c) => {
      const l = montures.filter((m) => m.couleur === c.id);
      const actives = l.filter((m) => m.etat !== "sterile");
      return {
        c,
        total: l.length,
        males: actives.filter((m) => m.sexe === "M").length,
        femelles: actives.filter((m) => m.sexe === "F").length,
        fecondes: actives.filter((m) => m.etat === "feconde").length,
        steriles: l.length - actives.length,
        niveauMax: l.reduce((a, m) => Math.max(a, m.niveau), 0),
      };
    })
    .filter((x) => x.total > 0);

  if (lignes.length === 0) return <p className="p-4 text-sm text-text-muted">Aucune monture ne correspond aux filtres.</p>;

  const Bouton = ({ c, s, signe, actif = true }: { c: string; s: Sexe; signe: "+" | "−"; actif?: boolean }) => (
    <button
      disabled={!actif}
      title={`${signe === "+" ? "Ajouter" : "Retirer la dernière ajoutée :"} ${s === "M" ? "un mâle" : "une femelle"}`}
      onClick={(e) => {
        e.stopPropagation();
        (signe === "+" ? ajouter : retirer)(c, s);
      }}
      className={`w-7 rounded border border-border-light text-xs hover:bg-bg-hover disabled:opacity-25 ${s === "M" ? "text-sky-400" : "text-pink-400"}`}
    >
      {signe}
      {s === "M" ? "♂" : "♀"}
    </button>
  );

  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-bg-card text-left text-xs uppercase text-text-muted">
        <tr>
          <th className="px-3 py-2">G</th>
          <th>Couleur</th>
          <th className="text-center text-sky-400">♂ dispo</th>
          <th className="text-center text-pink-400">♀ dispo</th>
          <th className="text-center">dont fécondes</th>
          <th className="text-center">Stériles</th>
          <th className="text-center">Niv. max</th>
          <th className="pr-3 text-right">Ajouter / retirer</th>
        </tr>
      </thead>
      <tbody>
        {lignes.map(({ c, males, femelles, fecondes, steriles, niveauMax }) => (
          <tr key={c.id} onClick={() => ouvrirCouleur(c.id)} className="cursor-pointer border-t border-border hover:bg-bg-hover" title="Voir le détail de cette couleur">
            <td className="px-3 py-1.5 text-text-muted">{c.generation}</td>
            <td className="font-medium">{c.nom}</td>
            <td className={`text-center ${males ? "" : "text-status-warn"}`}>{males}</td>
            <td className={`text-center ${femelles ? "" : "text-status-warn"}`}>{femelles}</td>
            <td className="text-center text-status-ok">{fecondes || ""}</td>
            <td className="text-center text-text-muted">{steriles || ""}</td>
            <td className="text-center text-text-secondary">{niveauMax}</td>
            <td className="pr-3 text-right">
              <span className="inline-flex gap-1">
                <Bouton c={c.id} s="M" signe="−" actif={males > 0} />
                <Bouton c={c.id} s="M" signe="+" />
                <span className="w-2" />
                <Bouton c={c.id} s="F" signe="−" actif={femelles > 0} />
                <Bouton c={c.id} s="F" signe="+" />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
