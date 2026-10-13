import { useState } from "react";
import { nouvelId } from "../moteur/actions";
import { couleur, nomCouleur } from "../moteur/donnees";
import type { Etat, Famille, Monture, Sauvegarde, Sexe } from "../moteur/types";
import { Bouton, Carte, ChoixCouleur, champ, sexeSymbole } from "../ui";

const ETATS: Record<Etat, string> = { fertile: "Fertile", feconde: "Féconde", sterile: "Stérile" };

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

export function Etable({ famille, s, setS }: Props) {
  const [filtreEtat, setFiltreEtat] = useState<Etat | "">("");
  const [filtreCouleur, setFiltreCouleur] = useState("");
  const montures = s.montures
    .filter((m) => m.famille === famille && (!filtreEtat || m.etat === filtreEtat) && (!filtreCouleur || m.couleur === filtreCouleur))
    .sort((a, b) => couleur(famille, a.couleur).generation - couleur(famille, b.couleur).generation || a.couleur.localeCompare(b.couleur) || b.niveau - a.niveau);

  const modifier = (id: string, champs: Partial<Monture>) =>
    setS((s) => ({ ...s, montures: s.montures.map((m) => (m.id === id ? { ...m, ...champs } : m)) }));
  const supprimer = (id: string) => {
    if (confirm("Supprimer cette monture de l'étable ?")) setS((s) => ({ ...s, montures: s.montures.filter((m) => m.id !== id) }));
  };
  const total = s.montures.length;

  return (
    <div className="flex flex-col gap-4">
      <AjoutMonture famille={famille} setS={setS} />
      <Carte
        titre={`Étable — ${montures.length} affichée(s), ${total}/500 au total`}
        droite={
          <div className="flex gap-2">
            <ChoixCouleur famille={famille} vide="Toutes les couleurs" value={filtreCouleur} onChange={(e) => setFiltreCouleur(e.target.value)} />
            <select className={champ} value={filtreEtat} onChange={(e) => setFiltreEtat(e.target.value as Etat | "")}>
              <option value="">Tous les états</option>
              {Object.entries(ETATS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {montures.length === 0 ? (
          <p className="text-sm text-text-muted">Aucune monture. Ajoute tes montures ci-dessus (avec la couleur de leurs parents, visible dans l'arbre en jeu).</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-text-muted">
              <tr>
                <th className="py-1">G</th>
                <th>Couleur</th>
                <th>Sexe</th>
                <th>Niveau</th>
                <th>État</th>
                <th>Parents</th>
                <th>Nom</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {montures.map((m) => (
                <tr key={m.id} className="border-t border-border hover:bg-bg-hover">
                  <td className="py-1 text-text-muted">{couleur(famille, m.couleur).generation}</td>
                  <td>{nomCouleur(famille, m.couleur)}</td>
                  <td>{sexeSymbole(m.sexe)}</td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      className={`${champ} w-20 py-0.5`}
                      value={m.niveau}
                      onChange={(e) => modifier(m.id, { niveau: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
                    />
                  </td>
                  <td>
                    <select className={`${champ} py-0.5`} value={m.etat} onChange={(e) => modifier(m.id, { etat: e.target.value as Etat })}>
                      {Object.entries(ETATS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-text-secondary">{m.parents ? m.parents.map((p) => nomCouleur(famille, p)).join(" × ") : m.origine === "capture" ? "capturée" : "—"}</td>
                  <td>
                    <input className={`${champ} w-28 py-0.5`} value={m.nom ?? ""} onChange={(e) => modifier(m.id, { nom: e.target.value || undefined })} />
                  </td>
                  <td className="text-right">
                    <button className="text-text-muted hover:text-status-err" title="Supprimer" onClick={() => supprimer(m.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Carte>
    </div>
  );
}

function AjoutMonture({ famille, setS }: Pick<Props, "famille" | "setS">) {
  const [c, setC] = useState("");
  const [sexe, setSexe] = useState<Sexe>("F");
  const [niveau, setNiveau] = useState(1);
  const [etat, setEtat] = useState<Etat>("fertile");
  const [pere, setPere] = useState("");
  const [mere, setMere] = useState("");
  const [quantite, setQuantite] = useState(1);

  const capture = c !== "" && couleur(famille, c).generation === 1;
  const ajouter = () => {
    const nouvelles: Monture[] = Array.from({ length: quantite }, () => ({
      id: nouvelId(),
      famille,
      couleur: c,
      sexe,
      niveau,
      etat,
      parents: pere && mere ? [pere, mere] : undefined,
      origine: capture && !pere ? "capture" : "saisie",
      creeLe: new Date().toISOString(),
    }));
    setS((s) => ({ ...s, montures: [...s.montures, ...nouvelles] }));
    setQuantite(1);
  };

  return (
    <Carte titre="Ajouter des montures">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          Couleur
          <ChoixCouleur famille={famille} vide="— choisir —" value={c} onChange={(e) => setC(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          Sexe
          <select className={champ} value={sexe} onChange={(e) => setSexe(e.target.value as Sexe)}>
            <option value="F">♀ Femelle</option>
            <option value="M">♂ Mâle</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Niveau
          <input type="number" min={1} max={200} className={`${champ} w-20`} value={niveau} onChange={(e) => setNiveau(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} />
        </label>
        <label className="flex flex-col gap-1">
          État
          <select className={champ} value={etat} onChange={(e) => setEtat(e.target.value as Etat)}>
            {Object.entries(ETATS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {!capture && (
          <>
            <label className="flex flex-col gap-1">
              Couleur du père
              <ChoixCouleur famille={famille} vide="inconnue" value={pere} onChange={(e) => setPere(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              Couleur de la mère
              <ChoixCouleur famille={famille} vide="inconnue" value={mere} onChange={(e) => setMere(e.target.value)} />
            </label>
          </>
        )}
        <label className="flex flex-col gap-1">
          Quantité
          <input type="number" min={1} max={50} className={`${champ} w-16`} value={quantite} onChange={(e) => setQuantite(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
        </label>
        <Bouton disabled={!c} onClick={ajouter}>
          Ajouter
        </Bouton>
      </div>
    </Carte>
  );
}
