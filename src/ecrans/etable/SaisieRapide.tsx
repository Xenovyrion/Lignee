import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { nouvelId } from "../../moteur/actions";
import { couleur, couleurs } from "../../moteur/donnees";
import type { Etat, Famille, Monture } from "../../moteur/types";
import { Bouton, champ, ETATS } from "../../ui";
import { trouverCouleur } from "./filtres";

interface Ligne {
  cle: string;
  texte: string;
  males: number;
  femelles: number;
  niveau: number;
  etat: Etat;
}

interface Props {
  famille: Famille;
  niveauDefaut: number;
  /** Mode simple : niveau unique, pas de colonne Niveau. */
  sansNiveau?: boolean;
  ajouter: (montures: Monture[]) => void;
  fermer: () => void;
}

/** Saisie en lot au clavier : couleur (suggestions), nombre de ♂ et de ♀, niveau, état. Entrée = ligne suivante. */
export function SaisieRapide({ famille, niveauDefaut, sansNiveau, ajouter, fermer }: Props) {
  const nouvelleLigne = (modele?: Ligne): Ligne => ({
    cle: nouvelId(),
    texte: "",
    males: 0,
    femelles: 0,
    niveau: modele?.niveau ?? niveauDefaut,
    etat: modele?.etat ?? "fertile",
  });
  const [lignes, setLignes] = useState<Ligne[]>(() => [nouvelleLigne()]);
  const champsCouleur = useRef(new Map<string, HTMLInputElement>());
  // Ligne dont le champ couleur doit prendre le focus, une fois affichée.
  const [aFocaliser, setAFocaliser] = useState<string | null>(null);
  useEffect(() => {
    if (!aFocaliser) return;
    champsCouleur.current.get(aFocaliser)?.focus();
    setAFocaliser(null);
  }, [aFocaliser, lignes]);

  const maj = (cle: string, champs: Partial<Ligne>) => setLignes((l) => l.map((x) => (x.cle === cle ? { ...x, ...champs } : x)));
  const resolues = lignes.map((l) => ({ ...l, couleur: trouverCouleur(famille, l.texte) }));
  const valides = resolues.filter((l) => l.couleur && l.males + l.femelles > 0);
  const total = valides.reduce((a, l) => a + l.males + l.femelles, 0);
  const erreurs = resolues.filter((l) => l.texte.trim() && !l.couleur).length;

  const ligneSuivante = (cle: string) => {
    const i = lignes.findIndex((l) => l.cle === cle);
    if (i < lignes.length - 1) {
      setAFocaliser(lignes[i + 1].cle);
      return;
    }
    const n = nouvelleLigne(lignes[i]);
    setLignes((l) => [...l, n]);
    setAFocaliser(n.cle);
  };

  const toutAjouter = () => {
    const maintenant = new Date().toISOString();
    const nouvelles: Monture[] = valides.flatMap((l) =>
      (["M", "F"] as const).flatMap((sexe) =>
        Array.from({ length: sexe === "M" ? l.males : l.femelles }, () => ({
          id: nouvelId(),
          famille,
          couleur: l.couleur!,
          sexe,
          niveau: sansNiveau ? niveauDefaut : l.niveau,
          etat: l.etat,
          origine: couleur(famille, l.couleur!).generation === 1 ? ("capture" as const) : ("saisie" as const),
          creeLe: maintenant,
        })),
      ),
    );
    ajouter(nouvelles);
    const n = nouvelleLigne();
    setLignes([n]);
    setAFocaliser(n.cle);
  };

  const clavier = (e: KeyboardEvent, cle: string) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (e.ctrlKey) {
      if (total > 0 && erreurs === 0) toutAjouter();
    } else ligneSuivante(cle);
  };

  const nombre = (v: string) => Math.max(0, Math.min(99, Number(v) || 0));
  const listeId = `couleurs-${famille}`;

  return (
    <div className="rounded-xl border border-accent/40 bg-bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Ajouter des montures</h2>
          <p className="text-xs text-text-muted">
            Tape quelques lettres de la couleur (ex. « eb ind »), puis les quantités. <kbd className="text-text-secondary">Entrée</kbd> : ligne suivante ·{" "}
            <kbd className="text-text-secondary">Ctrl + Entrée</kbd> : tout ajouter.
          </p>
        </div>
        <button className="text-text-muted hover:text-text-primary" onClick={fermer} title="Fermer">
          ✕
        </button>
      </div>
      <datalist id={listeId}>
        {couleurs(famille).map((c) => (
          <option key={c.id} value={`${c.nom} (G${c.generation})`} />
        ))}
      </datalist>
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-text-muted">
          <tr>
            <th className="pb-1">Couleur</th>
            <th className="text-sky-400">♂</th>
            <th className="text-pink-400">♀</th>
            {!sansNiveau && <th>Niveau</th>}
            <th>État</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {resolues.map((l, i) => (
            <tr key={l.cle}>
              <td className="py-1 pr-2">
                <input
                  ref={(el) => {
                    if (el) champsCouleur.current.set(l.cle, el);
                    else champsCouleur.current.delete(l.cle);
                  }}
                  autoFocus={i === 0}
                  list={listeId}
                  className={`${champ} w-full ${l.texte.trim() && !l.couleur ? "border-status-err" : ""}`}
                  placeholder="Couleur…"
                  value={l.texte}
                  onChange={(e) => maj(l.cle, { texte: e.target.value })}
                  onKeyDown={(e) => clavier(e, l.cle)}
                />
                <div className="h-4 text-xs">
                  {l.couleur ? (
                    <span className="text-status-ok">
                      ✓ {couleur(famille, l.couleur).nom} (G{couleur(famille, l.couleur).generation})
                    </span>
                  ) : l.texte.trim() ? (
                    <span className="text-status-err">Couleur introuvable ou ambiguë</span>
                  ) : null}
                </div>
              </td>
              {(["males", "femelles"] as const).map((k) => (
                <td key={k} className="pr-2 align-top">
                  <input
                    type="number"
                    min={0}
                    max={99}
                    className={`${champ} w-16`}
                    value={l[k] || ""}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => maj(l.cle, { [k]: nombre(e.target.value) })}
                    onKeyDown={(e) => clavier(e, l.cle)}
                  />
                </td>
              ))}
              {!sansNiveau && <td className="pr-2 align-top">
                <input
                  type="number"
                  min={1}
                  max={200}
                  className={`${champ} w-20`}
                  value={l.niveau}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => maj(l.cle, { niveau: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
                  onKeyDown={(e) => clavier(e, l.cle)}
                />
              </td>}
              <td className="pr-2 align-top">
                <select className={champ} value={l.etat} onChange={(e) => maj(l.cle, { etat: e.target.value as Etat })} onKeyDown={(e) => clavier(e, l.cle)}>
                  {Object.entries(ETATS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </td>
              <td className="align-top">
                {lignes.length > 1 && (
                  <button className="px-1 pt-1.5 text-text-muted hover:text-status-err" title="Retirer la ligne" onClick={() => setLignes((x) => x.filter((y) => y.cle !== l.cle))}>
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-3">
        <Bouton discret onClick={() => ligneSuivante(lignes[lignes.length - 1].cle)}>
          + Ligne
        </Bouton>
        <span className="flex-1 text-sm text-text-secondary">
          {total} monture{total > 1 ? "s" : ""} à ajouter
          {erreurs > 0 && <span className="ml-2 text-status-err">· {erreurs} couleur(s) à corriger</span>}
        </span>
        <Bouton disabled={total === 0 || erreurs > 0} onClick={toutAjouter}>
          Ajouter {total > 0 ? total : ""} à l'étable
        </Bouton>
      </div>
    </div>
  );
}
