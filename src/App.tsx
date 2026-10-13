import { useState } from "react";
import { Actions } from "./ecrans/actions/Actions";
import { Etable } from "./ecrans/etable/Etable";
import { Parametres } from "./ecrans/Parametres";
import { Succes } from "./ecrans/Succes";
import { FAMILLES, NOMS_FAMILLE, objectifs } from "./moteur/donnees";
import type { Famille, Sauvegarde } from "./moteur/types";
import { useSauvegarde } from "./stockage";

const ONGLETS = { actions: "Prochaines actions", etable: "Étable", succes: "Succès", parametres: "Paramètres" } as const;
type Onglet = keyof typeof ONGLETS;

export function App() {
  const { s, setS, erreur } = useSauvegarde();
  const [famille, setFamille] = useState<Famille>("dragodinde");
  const [onglet, setOnglet] = useState<Onglet>("actions");
  if (!s) return <div className="p-6 text-text-muted">Chargement…</div>;

  const majS = (f: (x: Sauvegarde) => Sauvegarde) => setS((x) => (x ? f(x) : x));
  const props = { famille, s, setS: majS };

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">
          Lignée <span className="text-sm font-normal text-text-muted">— pilotage d'élevage Dofus 3.7</span>
        </h1>
        <div className="flex gap-2">
          {FAMILLES.map((f) => (
            <button
              key={f}
              onClick={() => setFamille(f)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${f === famille ? "border-accent bg-accent-dim text-accent" : "border-border-light text-text-secondary hover:bg-bg-hover"}`}
            >
              {NOMS_FAMILLE[f]}s <span className="text-text-muted">{s.obtenues[f].length}/{objectifs(f).length}</span>
            </button>
          ))}
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
      {onglet === "actions" && <Actions {...props} />}
      {onglet === "etable" && <Etable key={famille} {...props} />}
      {onglet === "succes" && <Succes {...props} />}
      {onglet === "parametres" && <Parametres s={s} setS={majS} />}
    </div>
  );
}
