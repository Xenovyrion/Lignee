import { objectifs } from "../moteur/donnees";
import type { Famille, Sauvegarde } from "../moteur/types";
import { Carte } from "../ui";

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

/** Une case par couleur G2-G10. Cochée automatiquement à la naissance, modifiable à la main (reprise d'une progression existante). */
export function Succes({ famille, s, setS }: Props) {
  const obtenues = new Set(s.obtenues[famille]);
  const toutes = objectifs(famille);
  const basculer = (id: string) =>
    setS((s) => {
      const l = s.obtenues[famille];
      return { ...s, obtenues: { ...s.obtenues, [famille]: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] } };
    });
  const gens = [...new Set(toutes.map((c) => c.generation))];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-secondary">
        {obtenues.size}/{toutes.length} naissances obtenues · {s.journal.length} accouplement(s) enregistré(s). Clique sur une couleur pour la cocher si tu l'as déjà fait naître avant
        d'utiliser l'outil.
      </p>
      {gens.map((g) => {
        const liste = toutes.filter((c) => c.generation === g);
        const faites = liste.filter((c) => obtenues.has(c.id)).length;
        return (
          <Carte key={g} titre={`Génération ${g}`} droite={<span className={faites === liste.length ? "text-status-ok" : "text-text-muted"}>{faites}/{liste.length}{faites === liste.length ? " ✓ succès" : ""}</span>}>
            <div className="flex flex-wrap gap-2">
              {liste.map((c) => (
                <button
                  key={c.id}
                  onClick={() => basculer(c.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${obtenues.has(c.id) ? "border-status-ok bg-status-ok/15 text-status-ok" : "border-border-light text-text-secondary hover:bg-bg-hover"}`}
                >
                  {obtenues.has(c.id) ? "✓ " : ""}
                  {c.nom}
                </button>
              ))}
            </div>
          </Carte>
        );
      })}
    </div>
  );
}
