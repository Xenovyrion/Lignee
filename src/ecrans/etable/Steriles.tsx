import { couleur, nomCouleur } from "../../moteur/donnees";
import { RESSOURCE_EXTRACTION, ressourcesExtraction } from "../../moteur/etable";
import { suggererClonages } from "../../moteur/planificateur";
import type { Famille, Monture, Sauvegarde } from "../../moteur/types";
import { sexeSymbole } from "../../ui";
import { ImageMonture } from "../arbre/commun";
import { ClonagePropose } from "./Clonage";

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
  ouvrirFiche: (id: string) => void;
}

/** Stériles regroupées par génération : clonages proposés (certains d'abord) et extraction. */
export function Steriles({ famille, s, setS, ouvrirFiche }: Props) {
  const steriles = s.montures.filter((m) => m.famille === famille && m.etat === "sterile");
  const paires = suggererClonages(steriles);
  const gens = [...new Set(steriles.map((m) => couleur(famille, m.couleur).generation))].sort((a, b) => a - b);
  const extraire = (m: Monture) => {
    const n = ressourcesExtraction(m);
    if (!confirm(`Extraire ${nomCouleur(famille, m.couleur)} ${sexeSymbole(m.sexe)} ? Rend ${n} ${RESSOURCE_EXTRACTION[famille]}${n > 1 ? "s" : ""}.`)) return;
    setS((s) => ({ ...s, montures: s.montures.filter((x) => x.id !== m.id) }));
  };

  if (!steriles.length) return <p className="p-4 text-sm text-text-muted">Aucune monture stérile dans cette famille.</p>;

  return (
    <div className="flex flex-col gap-4 p-3">
      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm">
        <span>
          <b>{steriles.length}</b> stérile{steriles.length > 1 ? "s" : ""}
        </span>
        <span>
          <b>{paires.length}</b> clonage{paires.length > 1 ? "s" : ""} possible{paires.length > 1 ? "s" : ""}
          <span className="text-text-muted"> ({paires.filter((p) => p.memeCouleur).length} au résultat certain)</span>
        </span>
        <span className="text-text-muted">Cloner deux stériles de même génération rend une monture fertile ; l'extraction rend une ressource par génération.</span>
      </div>

      {gens.map((g) => {
        const l = steriles.filter((m) => couleur(famille, m.couleur).generation === g);
        const pg = paires.filter((p) => couleur(famille, p.a.couleur).generation === g);
        return (
          <section key={g} className="rounded-xl border border-border bg-bg-secondary p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Génération {g}</h3>
              <span className="text-sm text-text-secondary">
                {l.length} stérile{l.length > 1 ? "s" : ""}
              </span>
            </div>
            {pg.length > 0 && (
              <ul className="mb-3 flex flex-col gap-2">
                {pg.map((p) => (
                  <ClonagePropose key={`${p.a.id}-${p.b.id}`} paire={p} setS={setS} />
                ))}
              </ul>
            )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-2">
              {l.map((m) => {
                const n = ressourcesExtraction(m);
                return (
                  <div key={m.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-2 py-1.5 text-sm">
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left hover:text-accent" onClick={() => ouvrirFiche(m.id)} title="Ouvrir la fiche">
                      <ImageMonture famille={famille} id={m.couleur} taille={30} />
                      <span className="min-w-0 flex-1 truncate">{nomCouleur(famille, m.couleur)}</span>
                      <span className={m.sexe === "M" ? "text-sky-400" : "text-pink-400"}>{sexeSymbole(m.sexe)}</span>
                    </button>
                    <button
                      disabled={!n}
                      onClick={() => extraire(m)}
                      title={n ? `Extraire : ${n} ${RESSOURCE_EXTRACTION[famille]}${n > 1 ? "s" : ""}` : "Les générations 1 ne s'extraient pas"}
                      className="rounded border border-border-light px-1.5 text-xs text-text-secondary hover:border-status-err hover:text-status-err disabled:opacity-30"
                    >
                      Extraire
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
