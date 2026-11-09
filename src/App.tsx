import { useState } from "react";
import { TableauDeBord } from "./ecrans/tableau/TableauDeBord";
import { Arbre } from "./ecrans/arbre/Arbre";
import { Etable } from "./ecrans/etable/Etable";
import { Parametres } from "./ecrans/Parametres";
import { Succes } from "./ecrans/succes/Succes";
import { ImageMonture } from "./ecrans/arbre/commun";
import { couleurs, FAMILLES, NOMS_FAMILLE, objectifs } from "./moteur/donnees";
import { Logo } from "./Logo";
import type { Famille, Sauvegarde } from "./moteur/types";
import { useSauvegarde } from "./stockage";

const ONGLETS = { actions: "Prochaines actions", etable: "Étable", arbre: "Arbre", succes: "Succès", parametres: "Paramètres" } as const;
type Onglet = keyof typeof ONGLETS;

export function App() {
  const { s, setS, erreur } = useSauvegarde();
  const [famille, setFamille] = useState<Famille>("dragodinde");
  const [onglet, setOnglet] = useState<Onglet>("actions");
  // Annulation : états précédents de la session (une saisie erronée se défait en un clic).
  const [historique, setHistorique] = useState<Sauvegarde[]>([]);
  if (!s) return <div className="p-6 text-text-muted">Chargement…</div>;

  const majS = (f: (x: Sauvegarde) => Sauvegarde) => {
    setHistorique((h) => [...h.slice(-29), s]);
    setS((x) => (x ? f(x) : x));
  };
  const annuler = () => {
    const precedent = historique[historique.length - 1];
    if (!precedent) return;
    setHistorique((h) => h.slice(0, -1));
    setS(() => precedent);
  };
  const props = { famille, s, setS: majS };

  return (
    <div className="mx-auto flex max-w-[2200px] flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-linear-to-r from-accent/12 via-bg-card to-bg-card px-5 py-4">
        <div className="flex items-center gap-4">
          <Logo taille={56} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Lign<span className="text-accent">é</span>e
            </h1>
            <p className="text-sm text-text-secondary">Pilotage d'élevage · Dofus 3.7</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FAMILLES.map((f) => {
            const n = s.obtenues[f].length;
            const total = objectifs(f).length;
            const actif = f === famille;
            return (
              <button
                key={f}
                onClick={() => setFamille(f)}
                className={`flex items-center gap-2.5 rounded-xl border py-1.5 pl-1.5 pr-3 text-left transition ${actif ? "border-accent bg-accent-dim" : "border-border-light hover:bg-bg-hover"}`}
              >
                <ImageMonture famille={f} id={couleurs(f)[0].id} taille={38} className={actif ? "" : "opacity-70"} />
                <span className="flex w-36 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={actif ? "font-semibold text-accent" : "text-text-secondary"}>{NOMS_FAMILLE[f]}s</span>
                    <span className="text-xs text-text-muted">
                      {n}/{total}
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <span className="block h-full rounded-full bg-linear-to-r from-yellow-700 to-yellow-400" style={{ width: `${(100 * n) / total}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
          <button
            onClick={annuler}
            disabled={!historique.length}
            title={historique.length ? `Annuler la dernière modification (${historique.length} possible${historique.length > 1 ? "s" : ""})` : "Rien à annuler"}
            className="ml-2 rounded-lg border border-border-light px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-30"
          >
            ↶ Annuler
          </button>
        </div>
      </header>
      <nav className="flex gap-1 border-b border-border">
        {(Object.keys(ONGLETS) as Onglet[]).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${o === onglet ? "border-accent text-text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
          >
            {ONGLETS[o]}
          </button>
        ))}
      </nav>
      {erreur && <div className="rounded-md bg-status-err/15 p-2 text-sm text-status-err">Sauvegarde impossible : {erreur}</div>}
      {onglet === "actions" && <TableauDeBord {...props} />}
      {onglet === "etable" && <Etable key={famille} {...props} />}
      {onglet === "arbre" && <Arbre key={famille} famille={famille} s={s} />}
      {onglet === "succes" && <Succes {...props} setFamille={setFamille} />}
      {onglet === "parametres" && <Parametres s={s} setS={majS} />}
    </div>
  );
}
