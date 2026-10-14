import { couleur, nomCouleur } from "../../moteur/donnees";
import type { Etat, Famille, Monture } from "../../moteur/types";
import { BadgeSexe, champ, ETATS } from "../../ui";
import { ImageMonture } from "../arbre/commun";
import type { CleTri, Tri } from "./filtres";

interface Props {
  famille: Famille;
  montures: Monture[]; // filtrées et triées
  reservees: Set<string>;
  afficherNom: boolean;
  tri: Tri;
  setTri: (t: Tri) => void;
  selection: Set<string>;
  setSelection: (s: Set<string>) => void;
  modifier: (id: string, champs: Partial<Monture>) => void;
  ouvrirFiche: (id: string) => void;
}

const COULEUR_ETAT: Record<Etat, string> = {
  feconde: "bg-status-ok/15 text-status-ok",
  fertile: "bg-status-info/15 text-status-info",
  sterile: "bg-status-err/15 text-status-err",
};

export function ListeMontures({ famille, montures, reservees, afficherNom, tri, setTri, selection, setSelection, modifier, ouvrirFiche }: Props) {
  if (montures.length === 0) return <p className="p-4 text-sm text-text-muted">Aucune monture ne correspond aux filtres.</p>;
  const toutes = montures.every((m) => selection.has(m.id));
  const basculer = (id: string) => {
    const s = new Set(selection);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelection(s);
  };
  const Entete = ({ cle, libelle }: { cle: CleTri; libelle: string }) => (
    <th className="cursor-pointer select-none hover:text-text-primary" onClick={() => setTri({ cle, sens: tri.cle === cle ? (tri.sens === 1 ? -1 : 1) : 1 })}>
      {libelle}
      {tri.cle === cle ? (tri.sens === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-bg-card text-left text-xs uppercase text-text-muted">
        <tr>
          <th className="w-8 px-3 py-2">
            <input type="checkbox" className="accent-accent" checked={toutes} onChange={() => setSelection(toutes ? new Set() : new Set(montures.map((m) => m.id)))} />
          </th>
          <Entete cle="generation" libelle="G" />
          <Entete cle="couleur" libelle="Couleur" />
          <Entete cle="sexe" libelle="Sexe" />
          <Entete cle="niveau" libelle="Niveau" />
          <Entete cle="etat" libelle="État" />
          <th>Parents</th>
          {afficherNom && <th>Nom</th>}
        </tr>
      </thead>
      <tbody>
        {montures.map((m) => (
          <tr key={m.id} className={`border-t border-border hover:bg-bg-hover ${selection.has(m.id) ? "bg-accent-dim" : ""}`}>
            <td className="px-3">
              <input type="checkbox" className="accent-accent" checked={selection.has(m.id)} onChange={() => basculer(m.id)} />
            </td>
            <td className="text-text-muted">{couleur(famille, m.couleur).generation}</td>
            <td className="font-medium">
              <button className="inline-flex items-center gap-2 py-0.5 text-left hover:text-accent" onClick={() => ouvrirFiche(m.id)} title="Ouvrir la fiche de la monture">
                <ImageMonture famille={famille} id={m.couleur} taille={28} />
                {nomCouleur(famille, m.couleur)}
              </button>
              {m.enclos && <span className="ml-2 rounded bg-bg-hover px-1.5 text-xs text-text-secondary">enclos {m.enclos}</span>}
              {reservees.has(m.id) && (
                <span className="ml-2 text-xs text-accent" title="Utilisée par le plan d'élevage">
                  ● plan
                </span>
              )}
            </td>
            <td>
              <BadgeSexe sexe={m.sexe} />
            </td>
            <td>
              <input
                type="number"
                min={1}
                max={200}
                className={`${champ} w-16 py-0.5`}
                value={m.niveau}
                onChange={(e) => modifier(m.id, { niveau: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
              />
            </td>
            <td>
              <select
                className={`cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium outline-none ${COULEUR_ETAT[m.etat]}`}
                value={m.etat}
                onChange={(e) => modifier(m.id, { etat: e.target.value as Etat })}
                title="Changer l'état"
              >
                {Object.entries(ETATS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-bg-secondary text-text-primary">
                    {v}
                  </option>
                ))}
              </select>
            </td>
            <td className="text-xs text-text-secondary">
              {m.parents ? m.parents.map((p) => nomCouleur(famille, p)).join(" × ") : m.origine === "capture" ? "capturée" : "—"}
            </td>
            {afficherNom && (
              <td>
                <input className={`${champ} w-28 py-0.5`} value={m.nom ?? ""} onChange={(e) => modifier(m.id, { nom: e.target.value || undefined })} />
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
