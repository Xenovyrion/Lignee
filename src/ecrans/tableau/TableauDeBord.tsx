import { Fragment, useMemo, useState, type ReactNode } from "react";
import { conseiller, prochainObjectif } from "../../moteur/conseils";
import { couleur, NOMS_FAMILLE, nomCouleur, objectifs } from "../../moteur/donnees";
import { planifier, suggererClonages, type Source } from "../../moteur/planificateur";
import { nomSuccesGeneration } from "../../moteur/succes";
import type { Famille, Monture, Sauvegarde } from "../../moteur/types";
import { Bouton, libelleMonture, sexeSymbole } from "../../ui";
import { Etoile, ImageMonture } from "../arbre/commun";
import { ClonagePropose } from "../etable/Clonage";
import { CarteNaissance } from "./CarteNaissance";

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

const LIMITE = 6;

const Cadre = ({ id, titre, sous, children, droite, ton }: { id?: string; titre: string; sous?: string; children: ReactNode; droite?: ReactNode; ton?: "alerte" }) => (
  <section id={id} className={`scroll-mt-4 rounded-xl border p-4 ${ton === "alerte" ? "border-status-warn/40 bg-status-warn/5" : "border-border bg-bg-card"}`}>
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

/** Tuile chiffrée cliquable qui mène à sa section. */
const Tuile = ({ valeur, libelle, teinte, cible }: { valeur: number; libelle: string; teinte: string; cible: string }) => (
  <button
    onClick={() => document.getElementById(cible)?.scrollIntoView({ behavior: "smooth" })}
    className="flex flex-col rounded-xl border border-border bg-bg-card px-4 py-3 text-left transition hover:bg-bg-hover"
    style={{ borderTop: `3px solid ${valeur ? teinte : "rgba(255,255,255,0.08)"}` }}
  >
    <span className="text-3xl font-bold" style={{ color: valeur ? teinte : "#64748b" }}>
      {valeur}
    </span>
    <span className="text-sm text-text-secondary">{libelle}</span>
  </button>
);

export function TableauDeBord({ famille, s, setS }: Props) {
  const plan = useMemo(() => planifier(famille, s.montures, s.obtenues[famille]), [famille, s.montures, s.obtenues]);
  const c = useMemo(() => conseiller(plan, { takeza: s.options.takeza }), [plan, s.options.takeza]);
  const objectif = useMemo(() => prochainObjectif(plan), [plan]);
  const clonages = useMemo(() => suggererClonages(s.montures.filter((m) => m.famille === famille)), [famille, s.montures]);
  const [tout, setTout] = useState(false);
  const [planOuvert, setPlanOuvert] = useState(false);

  const obtenues = new Set(s.obtenues[famille]);
  const gens = Array.from({ length: 9 }, (_, i) => i + 2).map((g) => {
    const l = objectifs(famille).filter((x) => x.generation === g);
    return { g, faites: l.filter((x) => obtenues.has(x.id)).length, total: l.length };
  });
  const nbCaptures = Object.values(plan.captures).reduce((a, b) => a + b, 0);
  const prevues = (couleurId: string) => plan.etapes.filter((e) => e.couleur === couleurId).length;
  const rangDe = new Map(c.ordre.map((a) => [a.e.couleur, a]));
  const bloquees = new Set(c.blocages.map((b) => b.e.couleur));

  // Montures à mettre en enclos (jauges à remplir), une seule fois chacune, dans l'ordre des priorités.
  const enEnclos: Monture[] = [];
  for (const a of c.ordre) for (const m of a.aPreparer) if (!enEnclos.some((x) => x.id === m.id)) enEnclos.push(m);
  const sousNiveau = c.ordre.filter((a) => a.niveauConseille).length;

  if (plan.etapes.length === 0)
    return (
      <Cadre titre="Bravo !">
        <p>Toutes les couleurs des {NOMS_FAMILLE[famille]}s sont obtenues.</p>
      </Cadre>
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Progression */}
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
                <div className={`mt-1 text-center text-xs ${faites === total ? "text-status-ok" : objectif?.generation === g ? "font-semibold text-accent" : "text-text-muted"}`}>G{g}</div>
              </div>
            ))}
          </div>
          <div className="text-right text-xs text-text-secondary">
            Reste : <b className="text-text-primary">{plan.etapes.length}</b> naissances · <b className="text-text-primary">{nbCaptures}</b> captures ·{" "}
            <b className="text-text-primary">{plan.clonages}</b> clonages
          </div>
        </div>
      </div>

      {/* Prochain objectif et chemin */}
      {objectif && (
        <section className="rounded-xl border border-accent/40 bg-gradient-to-br from-accent/10 to-transparent p-4">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-accent">Prochain objectif</span>
            <h2 className="text-xl font-bold">{nomSuccesGeneration(famille, objectif.generation)}</h2>
            <span className="text-sm text-text-secondary">
              {gens.find((x) => x.g === objectif.generation)!.faites}/{gens.find((x) => x.g === objectif.generation)!.total} · {objectif.manquantes.length} à obtenir
            </span>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            Chemin pour obtenir <b className="text-text-primary">{nomCouleur(famille, objectif.cible)}</b> avec ton étable :
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {objectif.chemin.map((i, k) => {
              const e = plan.etapes[i];
              const a = rangDe.get(e.couleur);
              const estCible = k === objectif.chemin.length - 1;
              return (
                <Fragment key={i}>
                  {k > 0 && <span className="text-lg text-text-muted">→</span>}
                  <div
                    className={`relative flex w-28 flex-col items-center rounded-lg border px-1 pb-1.5 pt-1 text-center ${estCible ? "border-accent bg-bg-card" : "border-border-light bg-bg-secondary"}`}
                  >
                    {a && (
                      <span className="absolute -right-2 -top-2">
                        <Etoile rang={a.rang} pret={!a.aPreparer.length} />
                      </span>
                    )}
                    <ImageMonture famille={famille} id={e.couleur} taille={48} className={a || estCible ? "" : "opacity-60"} />
                    <span className="text-[11px] font-medium leading-tight">{nomCouleur(famille, e.couleur)}</span>
                    <span className={`text-[10px] ${a ? (a.aPreparer.length ? "text-accent" : "text-status-ok") : bloquees.has(e.couleur) ? "text-status-warn" : "text-text-muted"}`}>
                      {a ? (a.aPreparer.length ? "à préparer" : "prête") : bloquees.has(e.couleur) ? "bloquée" : "ensuite"}
                    </span>
                  </div>
                </Fragment>
              );
            })}
          </div>
          {objectif.manquantes.length > 1 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
              Puis, pour compléter le succès :
              {objectif.manquantes
                .filter((x) => x !== objectif.cible)
                .map((x) => (
                  <span key={x} className="flex items-center gap-1 rounded-md border border-border-light px-1.5 py-0.5">
                    <ImageMonture famille={famille} id={x} taille={18} className="opacity-60 grayscale" />
                    {nomCouleur(famille, x)}
                  </span>
                ))}
            </div>
          )}
        </section>
      )}

      {/* Tuiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tuile valeur={c.ordre.filter((a) => !a.aPreparer.length).length} libelle="prêts à accoupler" teinte="#22c55e" cible="naissances" />
        <Tuile valeur={enEnclos.length} libelle="montures à mettre en enclos" teinte="#d4a017" cible="enclos" />
        <Tuile valeur={c.captures.reduce((x, y) => x + y.nombre, 0)} libelle="captures à faire" teinte="#60a5fa" cible="captures" />
        <Tuile valeur={clonages.length} libelle="clonages possibles" teinte="#a78bfa" cible="clonages" />
        <Tuile valeur={c.blocages.length} libelle="blocages" teinte="#f97316" cible="blocages" />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Naissances conseillées, une carte par couleur */}
        <Cadre id="naissances" titre={`Naissances à faire (${c.ordre.length})`} sous="Dans l'ordre conseillé : terminer un succès, nouvelle couleur, puis ce qui débloque la suite.">
          {c.ordre.length ? (
            <>
              <ul className="flex flex-col gap-2">
                {(tout ? c.ordre : c.ordre.slice(0, LIMITE)).map((a) => (
                  <CarteNaissance key={a.e.couleur} famille={famille} a={a} prevues={prevues(a.e.couleur)} setS={setS} />
                ))}
              </ul>
              {c.ordre.length > LIMITE && (
                <button className="mt-2 text-sm text-accent hover:underline" onClick={() => setTout(!tout)}>
                  {tout ? "Réduire" : `Voir les ${c.ordre.length - LIMITE} autres`}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">Aucune naissance possible avec l'étable actuelle : commence par les captures.</p>
          )}
        </Cadre>

        {/* Listes d'actions */}
        <div className="flex flex-col gap-4">
          {c.blocages.length > 0 && (
            <Cadre id="blocages" titre={`Blocages (${c.blocages.length})`} ton="alerte">
              <ul className="flex flex-col gap-2 text-sm">
                {c.blocages.map((b) => (
                  <li key={b.etape} className="flex items-start gap-2">
                    <ImageMonture famille={famille} id={b.e.couleur} taille={28} />
                    <span>
                      <b>
                        G{b.e.generation} {nomCouleur(famille, b.e.couleur)}
                      </b>
                      {b.nombre > 1 && <span className="text-text-muted"> (×{b.nombre})</span>}
                      <span className="block text-xs text-text-secondary">{b.message}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Cadre>
          )}

          <Cadre
            id="enclos"
            titre={`Mettre en enclos (${enEnclos.length})`}
            sous={enEnclos.length ? `Remplir Endurance, Maturité et Amour · ≈ ${Math.ceil(enEnclos.length / 10)} enclos de 10 · à gérer dans Étable → Enclos` : undefined}
          >
            {enEnclos.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {enEnclos.map((m) => (
                  <li key={m.id} className="flex items-center gap-2">
                    <ImageMonture famille={famille} id={m.couleur} taille={24} />
                    <span className="flex-1">{nomCouleur(famille, m.couleur)}</span>
                    <span className={m.sexe === "M" ? "text-sky-400" : "text-pink-400"}>{sexeSymbole(m.sexe)}</span>
                    <span className="w-14 text-right text-xs text-text-muted">niv. {m.niveau}</span>
                    <span className="w-16 text-right text-xs">{m.enclos ? <span className="text-status-ok">enclos {m.enclos}</span> : <span className="text-text-muted">à placer</span>}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">Rien à préparer : les montures utiles sont déjà fécondes.</p>
            )}
            {sousNiveau > 0 && (
              <p className="mt-2 text-xs text-text-muted">
                {sousNiveau} accouplement{sousNiveau > 1 ? "s" : ""} sous 100 % : monte les niveaux (Mangeoire) pour atteindre {c.ordre.find((a) => a.niveauConseille)?.niveauConseille} niveaux
                cumulés.
              </p>
            )}
          </Cadre>

          <Cadre id="captures" titre="À capturer" sous={nbCaptures ? `Total sur tout le plan : ${nbCaptures}` : undefined}>
            {c.captures.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {c.captures.map((x) => (
                  <li key={`${x.couleur}/${x.sexe}`} className="flex items-center gap-2">
                    <ImageMonture famille={famille} id={x.couleur} taille={24} />
                    <span className="flex-1">
                      {nomCouleur(famille, x.couleur)} {x.sexe && <span className={x.sexe === "M" ? "text-sky-400" : "text-pink-400"}>{sexeSymbole(x.sexe)}</span>}
                    </span>
                    <span className="text-text-secondary">× {x.nombre}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">Aucune capture nécessaire pour les prochaines étapes.</p>
            )}
          </Cadre>

          <Cadre id="clonages" titre={`Clonages possibles (${clonages.length})`} sous={c.clonagesUtiles ? `${c.clonagesUtiles} étape(s) du plan attendent un clonage` : undefined}>
            {clonages.length ? (
              <ul className="flex flex-col gap-2">
                {clonages.map((p) => (
                  <ClonagePropose key={`${p.a.id}-${p.b.id}`} paire={p} setS={setS} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">Aucune paire de stériles de même génération.</p>
            )}
          </Cadre>
        </div>
      </div>

      <Cadre
        titre="Plan complet"
        sous="Suppose 100 % de réussite ; recalculé après chaque naissance. ♂/♀ : sexe à viser pour l'étape suivante."
        droite={
          <Bouton discret onClick={() => setPlanOuvert(!planOuvert)}>
            {planOuvert ? "Masquer" : `Afficher les ${plan.etapes.length} étapes`}
          </Bouton>
        }
      >
        {planOuvert && <PlanComplet famille={famille} plan={plan} />}
      </Cadre>
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
          <span className={`w-24 text-xs leading-5 ${e.pour === "succes" ? "text-accent" : "text-text-muted"}`}>{e.pour === "succes" ? "succès" : "pour la suite"}</span>
          <span className="w-56 font-medium">
            G{e.generation} {couleur(famille, e.couleur).nom} {e.sexeVoulu ? sexeSymbole(e.sexeVoulu) : ""}
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
