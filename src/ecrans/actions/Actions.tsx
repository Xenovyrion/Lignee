import { useMemo, useState, type ReactNode } from "react";
import { cloner } from "../../moteur/actions";
import { conseiller, type ActionAccouplement } from "../../moteur/conseils";
import { NOMS_FAMILLE, nomCouleur, objectifs } from "../../moteur/donnees";
import { planifier, suggererClonages, type PaireClonage, type Source } from "../../moteur/planificateur";
import type { Famille, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, champ, libelleMonture, sexeSymbole } from "../../ui";
import { AccouplementLibre, CarteAccouplement } from "./Accouplement";

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

const LIMITE = 8;

const Section = ({ titre, sous, ton = "neutre", children, droite }: { titre: string; sous?: string; ton?: "neutre" | "alerte" | "ok"; children: ReactNode; droite?: ReactNode }) => (
  <section
    className={`rounded-xl border p-4 ${ton === "alerte" ? "border-status-warn/40 bg-status-warn/5" : ton === "ok" ? "border-status-ok/30 bg-bg-card" : "border-border bg-bg-card"}`}
  >
    <div className="mb-3 flex items-start justify-between gap-2">
      <div>
        <h2 className="font-semibold">{titre}</h2>
        {sous && <p className="text-xs text-text-muted">{sous}</p>}
      </div>
      {droite}
    </div>
    {children}
  </section>
);

function ListeAccouplements({ famille, liste, setS }: { famille: Famille; liste: ActionAccouplement[]; setS: Props["setS"] }) {
  const [tout, setTout] = useState(false);
  return (
    <>
      <ul className="flex flex-col gap-2">
        {(tout ? liste : liste.slice(0, LIMITE)).map((a) => (
          <CarteAccouplement key={`${a.pere.id}-${a.mere.id}`} famille={famille} a={a} setS={setS} />
        ))}
      </ul>
      {liste.length > LIMITE && (
        <button className="mt-2 text-sm text-accent hover:underline" onClick={() => setTout(!tout)}>
          {tout ? "Réduire" : `Voir les ${liste.length - LIMITE} autres`}
        </button>
      )}
    </>
  );
}

export function Actions({ famille, s, setS }: Props) {
  const plan = useMemo(() => planifier(famille, s.montures, s.obtenues[famille]), [famille, s.montures, s.obtenues]);
  const c = useMemo(() => conseiller(plan, { takeza: s.options.takeza }), [plan, s.options.takeza]);
  const clonages = useMemo(() => suggererClonages(s.montures.filter((m) => m.famille === famille)), [famille, s.montures]);
  const [planOuvert, setPlanOuvert] = useState(false);

  const obtenues = new Set(s.obtenues[famille]);
  const gens = Array.from({ length: 9 }, (_, i) => i + 2).map((g) => {
    const l = objectifs(famille).filter((x) => x.generation === g);
    return { g, faites: l.filter((x) => obtenues.has(x.id)).length, total: l.length };
  });
  const nbCaptures = Object.values(plan.captures).reduce((a, b) => a + b, 0);
  const aPreparerMontures = new Set(c.aPreparer.flatMap((a) => a.aPreparer.map((m) => m.id)));

  if (plan.etapes.length === 0)
    return (
      <Section titre="Bravo !" ton="ok">
        Toutes les couleurs des {NOMS_FAMILLE[famille]}s sont obtenues.
      </Section>
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Progression des succès et volume du plan */}
      <div className="rounded-xl border border-border bg-bg-card p-4">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <div className="text-3xl font-semibold text-accent">
              {obtenues.size}
              <span className="text-lg text-text-muted">/{objectifs(famille).length}</span>
            </div>
            <div className="text-xs text-text-secondary">couleurs obtenues</div>
          </div>
          <div className="flex flex-1 gap-1">
            {gens.map(({ g, faites, total }) => (
              <div key={g} className="flex-1" title={`G${g} : ${faites}/${total}`}>
                <div className="h-2 overflow-hidden rounded bg-bg-hover">
                  <div className={`h-full ${faites === total ? "bg-status-ok" : "bg-accent"}`} style={{ width: `${(100 * faites) / total}%` }} />
                </div>
                <div className={`mt-1 text-center text-xs ${faites === total ? "text-status-ok" : "text-text-muted"}`}>G{g}</div>
              </div>
            ))}
          </div>
          <div className="text-right text-xs text-text-secondary">
            Reste : <b className="text-text-primary">{plan.etapes.length}</b> naissances · <b className="text-text-primary">{nbCaptures}</b> captures ·{" "}
            <b className="text-text-primary">{plan.clonages}</b> clonages
          </div>
        </div>
      </div>

      {c.blocages.length > 0 && (
        <Section titre={`Blocages (${c.blocages.length})`} sous="Ces étapes ne peuvent pas avancer en l'état." ton="alerte">
          <ul className="flex flex-col gap-1 text-sm">
            {c.blocages.map((b) => (
              <li key={b.etape}>
                <b>
                  G{b.e.generation} {nomCouleur(famille, b.e.couleur)}
                </b>{" "}
                <span className="text-text-secondary">— {b.message}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        titre={`Prêts à accoupler (${c.prets.length})`}
        sous="Les deux parents sont féconds. Classés par ce qu'ils font avancer."
        ton={c.prets.length ? "ok" : "neutre"}
      >
        {c.prets.length ? (
          <ListeAccouplements famille={famille} liste={c.prets} setS={setS} />
        ) : (
          <p className="text-sm text-text-muted">Aucun pour l'instant{c.aPreparer.length ? " : prépare les montures ci-dessous." : "."}</p>
        )}
      </Section>

      {c.aPreparer.length > 0 && (
        <Section
          titre={`À préparer (${c.aPreparer.length})`}
          sous={`${aPreparerMontures.size} monture(s) à mettre en enclos pour remplir leurs jauges (≈ ${Math.ceil(aPreparerMontures.size / 10)} enclos de 10).`}
        >
          <ListeAccouplements famille={famille} liste={c.aPreparer} setS={setS} />
        </Section>
      )}

      {(c.captures.length > 0 || c.clonagesUtiles > 0 || clonages.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {c.captures.length > 0 && (
            <Section titre="À capturer maintenant" sous={`Pour les prochaines étapes. Total sur tout le plan : ${nbCaptures}.`}>
              <div className="flex flex-wrap gap-2 text-sm">
                {c.captures.map((x) => (
                  <span key={`${x.couleur}/${x.sexe}`} className="rounded-md bg-bg-secondary px-3 py-1">
                    {nomCouleur(famille, x.couleur)} {x.sexe ? sexeSymbole(x.sexe) : ""} × {x.nombre}
                  </span>
                ))}
              </div>
            </Section>
          )}
          {clonages.length > 0 && (
            <Section titre={`Clonages possibles (${clonages.length})`} sous={c.clonagesUtiles ? `${c.clonagesUtiles} étape(s) du plan attendent un clonage.` : undefined}>
              <ul className="flex flex-col gap-2">
                {clonages.map((p) => (
                  <ClonagePropose key={`${p.a.id}-${p.b.id}`} paire={p} setS={setS} />
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      <details className="rounded-xl border border-border bg-bg-card p-4">
        <summary className="cursor-pointer font-semibold">Accouplement hors plan</summary>
        <div className="mt-3">
          <AccouplementLibre famille={famille} s={s} setS={setS} />
        </div>
      </details>

      <Section
        titre="Plan complet"
        sous="Suppose 100 % de réussite ; recalculé après chaque naissance. ♂/♀ : sexe à viser pour l'étape suivante."
        droite={
          <Bouton discret onClick={() => setPlanOuvert(!planOuvert)}>
            {planOuvert ? "Masquer" : `Afficher les ${plan.etapes.length} étapes`}
          </Bouton>
        }
      >
        {planOuvert && <PlanComplet famille={famille} plan={plan} />}
      </Section>
    </div>
  );
}

function PlanComplet({ famille, plan }: { famille: Famille; plan: ReturnType<typeof planifier> }) {
  const libelle = (src: Source) =>
    src.type === "monture"
      ? libelleMonture(src.monture)
      : src.type === "capture"
        ? `${nomCouleur(famille, src.couleur)} à capturer`
        : src.type === "clone"
          ? `clone de 2 ${nomCouleur(famille, src.couleur)} stériles`
          : `bébé de l'étape ${src.etape + 1}`;
  return (
    <ol className="flex flex-col text-sm">
      {plan.etapes.map((e, i) => (
        <li key={i} className="flex gap-2 border-t border-border py-1">
          <span className="w-10 text-text-muted">{i + 1}.</span>
          <span className={`w-20 text-xs leading-5 ${e.pour === "succes" ? "text-accent" : "text-text-muted"}`}>{e.pour === "succes" ? "succès" : "pour la suite"}</span>
          <span className="w-56 font-medium">
            G{e.generation} {nomCouleur(famille, e.couleur)} {e.sexeVoulu ? sexeSymbole(e.sexeVoulu) : ""}
          </span>
          <span className="text-text-secondary">
            {libelle(e.parents[0])} × {libelle(e.parents[1])}
            {e.alerteSexe && <span className="ml-2 text-status-warn">⚠ même sexe</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function ClonagePropose({ paire, setS }: { paire: PaireClonage; setS: Props["setS"] }) {
  const [resultat, setResultat] = useState(paire.a.couleur);
  const [sexe, setSexe] = useState<Sexe>(paire.a.sexe);
  const f = paire.a.famille;
  const valider = () => {
    try {
      setS((s) => cloner(s, paire.a.id, paire.b.id, { couleur: resultat, sexe }));
    } catch (e) {
      alert((e as Error).message);
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-bg-secondary p-2 text-sm">
      <span className="flex-1">
        {libelleMonture(paire.a)} + {libelleMonture(paire.b)}
        <span className="ml-2 text-xs text-text-muted">{paire.memeCouleur ? "résultat certain" : "couleur 50/50"}</span>
      </span>
      <select className={champ} value={resultat} onChange={(e) => setResultat(e.target.value)} disabled={paire.memeCouleur}>
        {[...new Set([paire.a.couleur, paire.b.couleur])].map((c) => (
          <option key={c} value={c}>
            {nomCouleur(f, c)}
          </option>
        ))}
      </select>
      <select className={champ} value={sexe} onChange={(e) => setSexe(e.target.value as Sexe)}>
        <option value="F">♀</option>
        <option value="M">♂</option>
      </select>
      <Bouton discret onClick={valider}>
        Cloné
      </Bouton>
    </li>
  );
}
