import { useMemo, useState } from "react";
import { nouvelId } from "../../moteur/actions";
import { couleur } from "../../moteur/donnees";
import { planifier } from "../../moteur/planificateur";
import type { Etat, Famille, Monture, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, champ, ETATS } from "../../ui";
import { filtrer, filtreVide, trier, type Filtre, type Tri } from "./filtres";
import { ListeMontures } from "./ListeMontures";
import { PanneauFiltres } from "./PanneauFiltres";
import { SaisieRapide } from "./SaisieRapide";
import { VueCouleurs } from "./VueCouleurs";

const CAPACITE_ETABLE = 500;

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

export function Etable({ famille, s, setS }: Props) {
  const [filtre, setFiltre] = useState<Filtre>(filtreVide);
  const [tri, setTri] = useState<Tri>({ cle: "generation", sens: 1 });
  const [vue, setVue] = useState<"couleurs" | "liste">("couleurs");
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [saisie, setSaisie] = useState(false);

  const reservees = useMemo(() => planifier(famille, s.montures, s.obtenues[famille]).reservees, [famille, s.montures, s.obtenues]);
  const deLaFamille = useMemo(() => s.montures.filter((m) => m.famille === famille), [s.montures, famille]);
  const affichees = useMemo(() => trier(filtrer(deLaFamille, famille, filtre, reservees), famille, tri), [deLaFamille, famille, filtre, reservees, tri]);
  const choisies = affichees.filter((m) => selection.has(m.id));
  const cibles = choisies.length ? choisies : affichees; // actions groupées : sélection, sinon tout l'affichage
  const niveauDefaut = s.options.niveauParDefaut;

  const ajouterMontures = (nouvelles: Monture[]) => setS((s) => ({ ...s, montures: [...s.montures, ...nouvelles] }));
  const ajouterUne = (c: string, sexe: Sexe) =>
    ajouterMontures([
      {
        id: nouvelId(),
        famille,
        couleur: c,
        sexe,
        niveau: niveauDefaut,
        etat: "fertile",
        origine: couleur(famille, c).generation === 1 ? "capture" : "saisie",
        creeLe: new Date().toISOString(),
      },
    ]);
  /** Retire la monture disponible (non stérile) de cette couleur et de ce sexe la plus récemment ajoutée. */
  const retirerUne = (c: string, sexe: Sexe) =>
    setS((s) => {
      const candidates = s.montures.filter((m) => m.famille === famille && m.couleur === c && m.sexe === sexe && m.etat !== "sterile");
      if (!candidates.length) return s;
      const derniere = candidates.reduce((a, b) => (b.creeLe >= a.creeLe ? b : a));
      return { ...s, montures: s.montures.filter((m) => m.id !== derniere.id) };
    });
  const modifier = (id: string, champs: Partial<Monture>) => setS((s) => ({ ...s, montures: s.montures.map((m) => (m.id === id ? { ...m, ...champs } : m)) }));
  const modifierGroupe = (champs: Partial<Monture>) => {
    const ids = new Set(cibles.map((m) => m.id));
    setS((s) => ({ ...s, montures: s.montures.map((m) => (ids.has(m.id) ? { ...m, ...champs } : m)) }));
  };
  const supprimerSelection = () => {
    if (!confirm(`Supprimer définitivement ${choisies.length} monture(s) de l'étable ?`)) return;
    const ids = new Set(choisies.map((m) => m.id));
    setS((s) => ({ ...s, montures: s.montures.filter((m) => !ids.has(m.id)) }));
    setSelection(new Set());
  };
  const portee = choisies.length ? `aux ${choisies.length} sélectionnée(s)` : `aux ${affichees.length} affichée(s)`;

  return (
    <div className="flex items-start gap-4">
      <PanneauFiltres famille={famille} montures={deLaFamille} reservees={reservees} filtre={filtre} setFiltre={setFiltre} />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border-light p-0.5 text-sm">
            {(["couleurs", "liste"] as const).map((v) => (
              <button key={v} onClick={() => setVue(v)} className={`rounded-md px-3 py-1 ${vue === v ? "bg-bg-hover text-text-primary" : "text-text-secondary"}`}>
                {v === "couleurs" ? "Par couleur" : "Liste"}
              </button>
            ))}
          </div>
          <span className="text-sm text-text-secondary">
            {affichees.length} / {deLaFamille.length} affichée(s) ·{" "}
            <span className={s.montures.length > CAPACITE_ETABLE * 0.9 ? "text-status-warn" : ""}>
              étable {s.montures.length}/{CAPACITE_ETABLE}
            </span>
          </span>
          <span className="flex-1" />
          {!saisie && <Bouton onClick={() => setSaisie(true)}>+ Ajouter des montures</Bouton>}
        </div>

        {saisie && <SaisieRapide famille={famille} niveauDefaut={niveauDefaut} ajouter={ajouterMontures} fermer={() => setSaisie(false)} />}

        {vue === "liste" && affichees.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm">
            <span className="text-text-secondary">Appliquer {portee} :</span>
            <select className={champ} value="" onChange={(e) => e.target.value && modifierGroupe({ etat: e.target.value as Etat })}>
              <option value="">État…</option>
              {Object.entries(ETATS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <Bouton discret onClick={() => modifierGroupe({ niveau: niveauDefaut })} title="Niveau par défaut, réglable dans les Paramètres">
              Niveau {niveauDefaut}
            </Bouton>
            {choisies.length > 0 && (
              <>
                <Bouton discret className="hover:text-status-err" onClick={supprimerSelection}>
                  Supprimer
                </Bouton>
                <button className="text-xs text-text-muted hover:underline" onClick={() => setSelection(new Set())}>
                  Désélectionner
                </button>
              </>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
          {vue === "couleurs" ? (
            <VueCouleurs
              famille={famille}
              montures={affichees}
              ajouter={ajouterUne}
              retirer={retirerUne}
              ouvrirCouleur={(c) => {
                setFiltre({ ...filtre, couleurs: [c] });
                setVue("liste");
              }}
            />
          ) : (
            <ListeMontures
              famille={famille}
              montures={affichees}
              reservees={reservees}
              afficherNom={s.options.afficherNom}
              tri={tri}
              setTri={setTri}
              selection={selection}
              setSelection={setSelection}
              modifier={modifier}
            />
          )}
        </div>
      </div>
    </div>
  );
}
