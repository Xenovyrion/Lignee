import { useMemo, useState } from "react";
import { nouvelId } from "../../moteur/actions";
import { couleur, FAMILLES, NOMS_FAMILLE } from "../../moteur/donnees";
import { ajusterStock, besoinsParCouleur, compterStock } from "../../moteur/etable";
import { planifier } from "../../moteur/planificateur";
import type { Etat, Famille, Monture, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, champ, ETATS } from "../../ui";
import { filtrer, filtreVide, trier, type Filtre, type Tri } from "./filtres";
import { ListeMontures } from "./ListeMontures";
import { PanneauFiltres } from "./PanneauFiltres";
import { SaisieRapide } from "./SaisieRapide";
import { Enclos } from "./Enclos";
import { FicheMonture } from "./FicheMonture";
import { Steriles } from "./Steriles";
import { VueCouleurs } from "./VueCouleurs";

const CAPACITE_ETABLE = 500;
const TEINTE_FAMILLE = { dragodinde: "#d4a017", muldo: "#14b8a6", volkorne: "#a78bfa" } as const;

/** Filtres rapides en un clic. */
const RACCOURCIS: { libelle: string; titre: string; filtre: Partial<Filtre> }[] = [
  { libelle: "Toutes", titre: "Retirer tous les filtres", filtre: {} },
  { libelle: "Utiles au plan", titre: "Montures que le plan d'élevage va utiliser", filtre: { plan: "reservees" } },
  { libelle: "À préparer", titre: "Utiles au plan mais pas encore fécondes : à mettre en enclos", filtre: { plan: "reservees", etats: ["fertile"] } },
  { libelle: "Fécondes", titre: "Prêtes à s'accoupler", filtre: { etats: ["feconde"] } },
  { libelle: "Libres", titre: "Non stériles et non utilisées par le plan : réserve, vente ou recyclage", filtre: { plan: "libres", etats: ["fertile", "feconde"] } },
  { libelle: "Stériles", titre: "À cloner ou à extraire", filtre: { etats: ["sterile"] } },
];

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

export function Etable({ famille, s, setS }: Props) {
  const [filtre, setFiltre] = useState<Filtre>(filtreVide);
  const [tri, setTri] = useState<Tri>({ cle: "generation", sens: 1 });
  const simple = s.options.modeSuivi === "simple";
  const [vueChoisie, setVue] = useState<"couleurs" | "liste" | "enclos" | "steriles">("couleurs");
  // En mode simple, pas de liste ni d'enclos : on revient à la vue par couleur.
  const vue = simple && (vueChoisie === "liste" || vueChoisie === "enclos") ? "couleurs" : vueChoisie;
  const [ficheId, setFicheId] = useState<string | null>(null);
  const fiche = s.montures.find((m) => m.id === ficheId);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [saisie, setSaisie] = useState(false);

  const plan = useMemo(() => planifier(famille, s.montures, s.obtenues[famille]), [famille, s.montures, s.obtenues]);
  const reservees = plan.reservees;
  const besoins = useMemo(() => besoinsParCouleur(famille, s.montures, plan), [famille, s.montures, plan]);
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
      {fiche && <FicheMonture monture={fiche} s={s} setS={setS} plan={plan} fermer={() => setFicheId(null)} />}
      {vue !== "enclos" && vue !== "steriles" && <PanneauFiltres famille={famille} montures={deLaFamille} reservees={reservees} filtre={filtre} setFiltre={setFiltre} sansNiveau={simple} />}

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border-light p-0.5 text-sm">
            {(
              [
                ["couleurs", "Par couleur"],
                ["liste", "Liste"],
                ["enclos", "Enclos"],
                ["steriles", "Stériles"],
              ] as const
            )
              .filter(([v]) => !simple || v === "couleurs" || v === "steriles")
              .map(([v, l]) => (
              <button key={v} onClick={() => setVue(v)} className={`rounded-md px-3 py-1 ${vue === v ? "bg-bg-hover text-text-primary" : "text-text-secondary"}`}>
                {l}
                {v === "enclos" && s.montures.some((m) => m.enclos) && <span className="ml-1 text-xs text-accent">{s.montures.filter((m) => m.enclos).length}</span>}
                {v === "steriles" && deLaFamille.some((m) => m.etat === "sterile") && (
                  <span className="ml-1 text-xs text-status-err">{deLaFamille.filter((m) => m.etat === "sterile").length}</span>
                )}
              </button>
            ))}
          </div>
          <span className="text-sm text-text-secondary">
            {affichees.length} / {deLaFamille.length} affichée(s)
          </span>
          {/* Remplissage de l'étable (500 places), par famille */}
          <div className="flex min-w-[220px] flex-col gap-1" title={FAMILLES.map((f) => `${NOMS_FAMILLE[f]}s : ${s.montures.filter((m) => m.famille === f).length}`).join(" · ")}>
            <div className="flex h-2 overflow-hidden rounded-full bg-bg-hover">
              {FAMILLES.map((f) => (
                <div key={f} style={{ width: `${(100 * s.montures.filter((m) => m.famille === f).length) / CAPACITE_ETABLE}%`, background: TEINTE_FAMILLE[f] }} />
              ))}
            </div>
            <span className={`text-xs ${s.montures.length > CAPACITE_ETABLE * 0.9 ? "text-status-warn" : "text-text-muted"}`}>
              Étable {s.montures.length}/{CAPACITE_ETABLE} ·{" "}
              {FAMILLES.map((f) => (
                <span key={f} className="mr-1.5">
                  <span style={{ color: TEINTE_FAMILLE[f] }}>●</span> {s.montures.filter((m) => m.famille === f).length}
                </span>
              ))}
            </span>
          </div>
          <span className="flex-1" />
          {!saisie && <Bouton onClick={() => setSaisie(true)}>+ Ajouter des montures</Bouton>}
        </div>

        {vue !== "enclos" && vue !== "steriles" && (
          <div className="flex flex-wrap gap-1.5">
            {RACCOURCIS.map((r) => {
              const f = { ...filtreVide(), ...r.filtre };
              const actif = JSON.stringify(f) === JSON.stringify(filtre);
              return (
                <button
                  key={r.libelle}
                  title={r.titre}
                  onClick={() => setFiltre(f)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${actif ? "border-accent bg-accent-dim text-accent" : "border-border-light text-text-secondary hover:bg-bg-hover"}`}
                >
                  {r.libelle}
                  <span className="ml-1.5 text-xs text-text-muted">{filtrer(deLaFamille, famille, f, reservees).length}</span>
                </button>
              );
            })}
          </div>
        )}

        {saisie && <SaisieRapide famille={famille} niveauDefaut={niveauDefaut} sansNiveau={simple} ajouter={ajouterMontures} fermer={() => setSaisie(false)} />}

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
          {vue === "steriles" ? (
            <Steriles famille={famille} s={s} setS={setS} ouvrirFiche={setFicheId} />
          ) : vue === "enclos" ? (
            <Enclos famille={famille} s={s} setS={setS} plan={plan} ouvrirFiche={setFicheId} />
          ) : vue === "couleurs" ? (
            <VueCouleurs
              besoins={besoins}
              famille={famille}
              montures={affichees}
              ajouter={ajouterUne}
              retirer={retirerUne}
              simple={simple ? { stock: (c, sexe, etat) => compterStock(s.montures, famille, c, sexe, etat), ajuster: (c, sexe, etat, delta) => setS((s) => ajusterStock(s, famille, c, sexe, etat, delta, niveauDefaut)) } : undefined}
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
              ouvrirFiche={setFicheId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
