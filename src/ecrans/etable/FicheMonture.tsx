import { useState } from "react";
import { cloner } from "../../moteur/actions";
import { conseiller } from "../../moteur/conseils";
import { couleur, nomCouleur } from "../../moteur/donnees";
import { nombreEnclos, RESSOURCE_EXTRACTION, ressourcesExtraction, roleDansLePlan } from "../../moteur/etable";
import type { Plan } from "../../moteur/planificateur";
import { clonables } from "../../moteur/regles";
import type { Capacite, Etat, Monture, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, ChoixCouleur, champ, ETATS, sexeSymbole } from "../../ui";
import { Etoile, ImageMonture } from "../arbre/commun";

const CAPACITES: Record<Capacite, string> = {
  reproducteur: "Reproducteur (2 bébés)",
  sage: "Sage (XP ×2)",
  amoureuse: "Amoureuse (Amour ×2)",
  endurante: "Endurante (Endurance ×2)",
  cameleone: "Caméléone",
};

interface Props {
  monture: Monture;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
  plan: Plan;
  fermer: () => void;
}

const Champ = ({ libelle, children }: { libelle: string; children: React.ReactNode }) => (
  <label className="flex items-center justify-between gap-3 text-sm">
    <span className="text-text-secondary">{libelle}</span>
    {children}
  </label>
);

/** Fiche détaillée d'une monture : tout modifier, voir son rôle dans le plan, cloner ou retirer. */
export function FicheMonture({ monture: m, s, setS, plan, fermer }: Props) {
  const f = m.famille;
  const c = couleur(f, m.couleur);
  const modifier = (champs: Partial<Monture>) => setS((s) => ({ ...s, montures: s.montures.map((x) => (x.id === m.id ? { ...x, ...champs } : x)) }));
  const roles = roleDansLePlan(plan, m.id);
  const ordre = conseiller(plan, { takeza: s.options.takeza }).ordre;
  const nbEnclos = nombreEnclos(s.options.niveauEleveur);
  const ressources = ressourcesExtraction(m);

  // Clonage : partenaires stériles de même génération.
  const partenaires = s.montures.filter((x) => clonables(m, x));
  const [partenaireId, setPartenaireId] = useState("");
  const partenaire = partenaires.find((x) => x.id === partenaireId);
  const [couleurClone, setCouleurClone] = useState(m.couleur);
  const [sexeClone, setSexeClone] = useState<Sexe>(m.sexe);
  const cloner2 = () => {
    if (!partenaire) return;
    try {
      setS((s) => cloner(s, m.id, partenaire.id, { couleur: couleurClone, sexe: sexeClone }));
      fermer();
    } catch (e) {
      alert((e as Error).message);
    }
  };
  const retirer = () => {
    const quoi = ressources ? `Extraire cette monture (rend ${ressources} ${RESSOURCE_EXTRACTION[f]}${ressources > 1 ? "s" : ""}) ?` : "Retirer cette monture de l'étable ?";
    if (!confirm(quoi)) return;
    setS((s) => ({ ...s, montures: s.montures.filter((x) => x.id !== m.id) }));
    fermer();
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40" onClick={fermer}>
      <aside className="flex h-full w-[400px] max-w-full flex-col gap-4 overflow-y-auto border-l border-border-light bg-bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <span className="text-xs uppercase tracking-wide text-text-muted">Fiche monture</span>
          <button className="text-text-muted hover:text-text-primary" onClick={fermer} title="Fermer">
            ✕
          </button>
        </div>

        <div className="flex flex-col items-center text-center">
          <ImageMonture famille={f} id={m.couleur} taille={112} />
          <div className="text-lg font-semibold">
            {c.nom} <span className={m.sexe === "M" ? "text-sky-400" : "text-pink-400"}>{sexeSymbole(m.sexe)}</span>
          </div>
          <div className="text-sm text-text-muted">
            Génération {c.generation} · {m.origine === "capture" ? "capturée" : m.origine === "naissance" ? "née dans l'outil" : m.origine === "clonage" ? "clone" : "saisie"}
          </div>
        </div>

        {/* Rôle dans le plan */}
        <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase text-text-muted">Dans le plan d'élevage</div>
          {m.etat === "sterile" ? (
            <p className="text-text-secondary">Stérile : à cloner avec une autre stérile de même génération, ou à extraire.</p>
          ) : roles.length ? (
            roles.map(({ indice, e }) => {
              const a = ordre.find((x) => x.e.couleur === e.couleur && (x.pere.id === m.id || x.mere.id === m.id));
              return (
                <div key={indice} className="flex items-center gap-2">
                  {a && <Etoile rang={a.rang} pret={!a.aPreparer.length} taille={22} />}
                  <ImageMonture famille={f} id={e.couleur} taille={32} />
                  <span>
                    Parent de <b>{nomCouleur(f, e.couleur)}</b> <span className="text-text-muted">G{e.generation}</span>
                    <span className="block text-xs text-text-muted">
                      {a ? (a.aPreparer.length ? "à faire maintenant · jauges à remplir" : "à faire maintenant · prête") : `étape ${indice + 1} du plan`}
                      {e.pour === "succes" ? " · nouvelle couleur" : ""}
                    </span>
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-text-secondary">Libre : le plan ne l'utilise pas (réserve, vente ou recyclage).</p>
          )}
        </div>

        {/* Caractéristiques */}
        <div className="flex flex-col gap-2">
          <Champ libelle="Couleur">
            <ChoixCouleur famille={f} value={m.couleur} onChange={(e) => modifier({ couleur: e.target.value })} className="w-48" />
          </Champ>
          <Champ libelle="Sexe">
            <select className={champ} value={m.sexe} onChange={(e) => modifier({ sexe: e.target.value as Sexe })}>
              <option value="M">♂ Mâle</option>
              <option value="F">♀ Femelle</option>
            </select>
          </Champ>
          <Champ libelle="Niveau">
            <input
              type="number"
              min={1}
              max={200}
              className={`${champ} w-24`}
              value={m.niveau}
              onChange={(e) => modifier({ niveau: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
            />
          </Champ>
          <Champ libelle="État">
            <select className={champ} value={m.etat} onChange={(e) => modifier({ etat: e.target.value as Etat, enclos: e.target.value === "sterile" ? undefined : m.enclos })}>
              {Object.entries(ETATS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Champ>
          <Champ libelle="Enclos">
            <select className={champ} value={m.enclos ?? ""} onChange={(e) => modifier({ enclos: e.target.value ? Number(e.target.value) : undefined })} disabled={m.etat === "sterile"}>
              <option value="">Aucun</option>
              {Array.from({ length: nbEnclos }, (_, i) => i + 1).map((k) => (
                <option key={k} value={k}>
                  Enclos {k}
                </option>
              ))}
            </select>
          </Champ>
          <Champ libelle="Capacité">
            <select className={champ} value={m.capacite ?? ""} onChange={(e) => modifier({ capacite: (e.target.value || undefined) as Capacite | undefined })}>
              <option value="">Aucune</option>
              {Object.entries(CAPACITES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Champ>
          <Champ libelle="Nom">
            <input className={`${champ} w-48`} value={m.nom ?? ""} placeholder="—" onChange={(e) => modifier({ nom: e.target.value || undefined })} />
          </Champ>
          <Champ libelle="Père">
            <ChoixCouleur famille={f} vide="inconnu" value={m.parents?.[0] ?? ""} onChange={(e) => modifier({ parents: e.target.value ? [e.target.value, m.parents?.[1] ?? e.target.value] : undefined })} className="w-48" />
          </Champ>
          <Champ libelle="Mère">
            <ChoixCouleur
              famille={f}
              vide="inconnue"
              value={m.parents?.[1] ?? ""}
              onChange={(e) => modifier({ parents: e.target.value ? [m.parents?.[0] ?? e.target.value, e.target.value] : undefined })}
              className="w-48"
            />
          </Champ>
        </div>

        {/* Clonage */}
        {m.etat === "sterile" && (
          <div className="rounded-lg border border-border bg-bg-secondary p-3 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase text-text-muted">Cloner avec une autre stérile G{c.generation}</div>
            {partenaires.length ? (
              <div className="flex flex-col gap-2">
                <select className={champ} value={partenaireId} onChange={(e) => setPartenaireId(e.target.value)}>
                  <option value="">— choisir —</option>
                  {partenaires.map((x) => (
                    <option key={x.id} value={x.id}>
                      {nomCouleur(f, x.couleur)} {sexeSymbole(x.sexe)} niv. {x.niveau}
                    </option>
                  ))}
                </select>
                {partenaire && (
                  <div className="flex flex-wrap items-center gap-2">
                    Résultat :
                    <select className={champ} value={couleurClone} onChange={(e) => setCouleurClone(e.target.value)}>
                      {[...new Set([m.couleur, partenaire.couleur])].map((x) => (
                        <option key={x} value={x}>
                          {nomCouleur(f, x)}
                        </option>
                      ))}
                    </select>
                    <select className={champ} value={sexeClone} onChange={(e) => setSexeClone(e.target.value as Sexe)}>
                      <option value="F">♀</option>
                      <option value="M">♂</option>
                    </select>
                    <Bouton onClick={cloner2}>Cloné</Bouton>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-text-muted">Aucune autre stérile de génération {c.generation} pour l'instant.</p>
            )}
          </div>
        )}

        <div className="mt-auto flex justify-end">
          <Bouton discret className="hover:text-status-err" onClick={retirer}>
            {ressources ? `Extraire (${ressources} ${RESSOURCE_EXTRACTION[f]}${ressources > 1 ? "s" : ""})` : "Retirer de l'étable"}
          </Bouton>
        </div>
      </aside>
    </div>
  );
}
