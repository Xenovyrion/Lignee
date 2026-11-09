import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { actionsMaintenant, conseiller, prochainObjectif, seancesDesEtapes, seancesSuivantes } from "../../moteur/conseils";
import { couleur, NOMS_FAMILLE, nomCouleur, objectifs } from "../../moteur/donnees";
import { planifier, regrouperClonages, suggererClonages, type Source } from "../../moteur/planificateur";
import { nomSuccesGeneration } from "../../moteur/succes";
import type { Famille, Sauvegarde } from "../../moteur/types";
import { Bouton, libelleMonture, sexeSymbole } from "../../ui";
import { Etoile, ImageMonture } from "../arbre/commun";
import { Bandeau, Confettis, Nombre, useCompteur } from "../../effets";
import { CarteCapture, CarteClonage, CarteNaissance, CartePreparer, TYPES } from "./CartesActions";

const LIMITE_FRISE = 6;

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

const Cadre = ({ id, titre, sous, children, droite, ton }: { id?: string; titre: string; sous?: string; children: ReactNode; droite?: ReactNode; ton?: "alerte" }) => (
  <section id={id} className={`scroll-mt-4 rounded-xl border p-4 ${ton === "alerte" ? "border-status-warn/40 bg-status-warn/5" : "border-border bg-bg-card/85 backdrop-blur-sm"}`}>
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
const Tuile = ({ valeur, libelle, teinte, cible, icone }: { valeur: number; libelle: string; teinte: string; cible: string; icone: string }) => (
  <button
    onClick={() => document.getElementById(cible)?.scrollIntoView({ behavior: "smooth" })}
    className="group flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.4)]"
    style={{
      borderTop: `3px solid ${valeur ? teinte : "rgba(255,255,255,0.08)"}`,
      background: valeur ? `linear-gradient(135deg, ${teinte}26, var(--color-bg-card) 65%)` : "var(--color-bg-card)",
    }}
  >
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl transition group-hover:scale-110 ${valeur ? "" : "opacity-40 grayscale"}`} style={{ background: `${teinte}22` }}>
      {icone}
    </span>
    <span className="flex flex-col">
      <span className="text-3xl font-bold leading-8" style={{ color: valeur ? teinte : "#64748b" }}>
        <Nombre valeur={valeur} />
      </span>
      <span className="text-sm text-text-secondary">{libelle}</span>
    </span>
  </button>
);

/** Anneau de progression global : couleurs obtenues / total. */
function AnneauTotal({ faites, total }: { faites: number; total: number }) {
  const taille = 92;
  const ep = 9;
  const r = (taille - ep) / 2;
  const c = 2 * Math.PI * r;
  const anime = useCompteur(faites, 900);
  const v = total ? anime / total : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: taille, height: taille }}>
        <svg width={taille} height={taille} className="-rotate-90">
          <defs>
            <linearGradient id="degrade-total" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor={v >= 1 ? "#4ade80" : "#d4a017"} />
            </linearGradient>
          </defs>
          <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={ep} />
          <circle
            cx={taille / 2}
            cy={taille / 2}
            r={r}
            fill="none"
            stroke="url(#degrade-total)"
            strokeWidth={ep}
            strokeLinecap="round"
            strokeDasharray={`${c * v} ${c}`}
            style={{ transition: "stroke-dasharray 700ms ease-out", filter: "drop-shadow(0 0 6px rgba(212,160,23,0.45))" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-5 text-accent">{Math.round(anime)}</span>
          <span className="text-[11px] text-text-muted">/ {total}</span>
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold">{Math.floor(v * 100)} %</div>
        <div className="text-xs text-text-secondary">couleurs obtenues</div>
      </div>
    </div>
  );
}

export function TableauDeBord({ famille, s, setS }: Props) {
  const plan = useMemo(() => planifier(famille, s.montures, s.obtenues[famille]), [famille, s.montures, s.obtenues]);
  const c = useMemo(() => conseiller(plan, { takeza: s.options.takeza }), [plan, s.options.takeza]);
  const objectif = useMemo(() => prochainObjectif(plan), [plan]);
  const clonages = useMemo(() => regrouperClonages(suggererClonages(s.montures.filter((m) => m.famille === famille))), [famille, s.montures]);
  const actions = useMemo(() => actionsMaintenant(c, clonages), [c, clonages]);
  const numSeance = useMemo(() => seancesDesEtapes(plan), [plan]);
  const suivantes = useMemo(() => seancesSuivantes(plan), [plan]);
  const totalSeances = Math.max(1, ...numSeance);
  const [toutesSeances, setToutesSeances] = useState(false);
  const [planOuvert, setPlanOuvert] = useState(false);

  // Nouvelle couleur obtenue → confettis ; génération complétée → bandeau « Succès obtenu ».
  const [confettis, setConfettis] = useState(0);
  const [bandeau, setBandeau] = useState<string | null>(null);
  const fermerBandeau = useCallback(() => setBandeau(null), []);
  const avant = useRef<{ famille: Famille; obtenues: Set<string> } | null>(null);
  useEffect(() => {
    const maintenant = new Set(s.obtenues[famille]);
    const prec = avant.current;
    avant.current = { famille, obtenues: maintenant };
    if (!prec || prec.famille !== famille || !s.options.animations) return;
    const nouvelles = [...maintenant].filter((x) => !prec.obtenues.has(x));
    if (!nouvelles.length) return;
    setConfettis((n) => n + 1);
    const complete = (o: Set<string>, g: number) => objectifs(famille).filter((x) => x.generation === g).every((x) => o.has(x.id));
    const succes = [...new Set(nouvelles.map((x) => couleur(famille, x).generation))].filter((g) => complete(maintenant, g) && !complete(prec.obtenues, g));
    setBandeau(succes.length ? `🏆 Succès obtenu : ${nomSuccesGeneration(famille, succes[0])}` : `✨ Nouvelle couleur : ${nouvelles.map((x) => nomCouleur(famille, x)).join(", ")}`);
  }, [famille, s.obtenues, s.options.animations]);

  const obtenues = new Set(s.obtenues[famille]);
  const gens = Array.from({ length: 9 }, (_, i) => i + 2).map((g) => {
    const l = objectifs(famille).filter((x) => x.generation === g);
    return { g, faites: l.filter((x) => obtenues.has(x.id)).length, total: l.length };
  });
  const nbCaptures = Object.values(plan.captures).reduce((a, b) => a + b, 0);
  const prevues = (couleurId: string) => plan.etapes.filter((e) => e.couleur === couleurId).length;
  const rangDe = new Map([...c.ordre].reverse().map((a) => [a.e.couleur, a])); // la carte prête l'emporte
  const bloquees = new Set(c.blocages.map((b) => b.e.couleur));

  const simple = s.options.modeSuivi === "simple";
  const niveauNouvelles = simple ? s.options.niveauParDefaut : 1;
  const nbPrets = c.ordre.filter((a) => !a.aPreparer.length).reduce((n, a) => n + a.nombre, 0);
  const compte = (t: string) => actions.filter((x) => x.type === t).length;
  const premier = (t: string) => actions.find((x) => x.type === t)?.numero;
  const nbAPreparer = actions.reduce((n, x) => n + (x.type === "preparer" ? x.groupes.reduce((k, g) => k + g.montures.length, 0) : 0), 0);

  if (plan.etapes.length === 0)
    return (
      <Cadre titre="Bravo !">
        <p>Toutes les couleurs des {NOMS_FAMILLE[famille]}s sont obtenues.</p>
      </Cadre>
    );

  return (
    <div className="flex flex-col gap-4">
      <Confettis declencheur={confettis} />
      <Bandeau message={bandeau} fermer={fermerBandeau} />
      {/* Progression */}
      <div className="rounded-xl border border-border bg-bg-card/85 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <AnneauTotal faites={obtenues.size} total={objectifs(famille).length} />
          <div className="flex min-w-[320px] flex-1 gap-2">
            {gens.map(({ g, faites, total }) => {
              const fini = faites === total;
              const courante = objectif?.generation === g;
              return (
                <div key={g} className="flex-1" title={`${nomSuccesGeneration(famille, g)} : ${faites}/${total}`}>
                  <div className={`mb-1 text-center text-xs font-semibold ${fini ? "text-status-ok" : courante ? "text-accent" : "text-text-muted"}`}>G{g}</div>
                  <div className={`relative h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/5 ${courante ? "ring-accent/60" : ""}`}>
                    <div
                      className={`croitre brillance h-full rounded-full transition-[width] duration-700 ${courante ? "barre-active" : ""}`}
                      style={{
                        width: `${Math.max(faites ? 8 : 0, (100 * faites) / total)}%`,
                        background: fini ? "linear-gradient(90deg,#15803d,#4ade80)" : "linear-gradient(90deg,#a16207,#facc15)",
                        boxShadow: faites ? `0 0 10px ${fini ? "rgba(74,222,128,0.45)" : "rgba(250,204,21,0.35)"}` : undefined,
                      }}
                    />
                  </div>
                  <div className={`mt-1 text-center text-[11px] ${fini ? "text-status-ok" : "text-text-muted"}`}>{fini ? "✓" : `${faites}/${total}`}</div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 text-center">
            {[
              [plan.etapes.length, "naissances"],
              [plan.clonages, "clonages"],
              [nbCaptures, "captures"],
              [totalSeances, "séances"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-lg bg-bg-secondary px-3 py-1.5" title={l === "séances" ? "Une séance = tous les accouplements faisables en même temps ; la suivante utilise leurs bébés" : `${l} restant(e)s dans le plan`}>
                <div className="text-lg font-bold leading-6">
                  <Nombre valeur={n as number} />
                </div>
                <div className="text-[10px] uppercase tracking-wide text-text-muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prochain objectif et chemin */}
      {objectif && (
        <section className="rounded-xl border border-accent/40 bg-linear-to-br from-accent/10 to-transparent p-4">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className="ruban self-center text-xs font-bold uppercase tracking-wide">🏆 Prochain objectif</span>
            <h2 className="text-xl font-bold">
              <span className="mr-1.5" title="Succès de génération">🧬</span>
              {nomSuccesGeneration(famille, objectif.generation)}
            </h2>
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
                      {a ? (a.aPreparer.length ? "à préparer" : "maintenant") : bloquees.has(e.couleur) ? "bloquée" : `séance ${numSeance[i]}`}
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

      {/* Tuiles : raccourcis vers la première action de chaque type */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Tuile valeur={nbPrets} icone="🥚" libelle="accouplements prêts" teinte={TYPES.naissance.teinte} cible={`action-${premier("naissance")}`} />
        <Tuile valeur={clonages.reduce((n, g) => n + g.paires.length, 0)} icone="🧬" libelle="clonages possibles" teinte={TYPES.clonage.teinte} cible={`action-${premier("clonage")}`} />
        <Tuile valeur={nbAPreparer} icone="⏳" libelle="montures à préparer" teinte={TYPES.preparer.teinte} cible={`action-${premier("preparer")}`} />
        <Tuile valeur={c.captures.reduce((x, y) => x + y.nombre, 0)} icone="🕸️" libelle="captures à faire" teinte={TYPES.capture.teinte} cible={`action-${premier("capture")}`} />
        <Tuile valeur={c.blocages.length} icone="⚠️" libelle="blocages" teinte="#f97316" cible="blocages" />
      </div>

      {c.blocages.length > 0 && (
        <Cadre id="blocages" titre={`Blocages (${c.blocages.length})`} ton="alerte">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
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

      {/* Toutes les actions de la séance, dans l'ordre */}
      <Cadre
        id="actions"
        titre={`Prochaines étapes : ${actions.length} action${actions.length > 1 ? "s" : ""}`}
        sous={`Séance 1 sur ≈ ${totalSeances}. Dans l'ordre : ${[
          compte("naissance") && "naissances",
          compte("clonage") && "clonages",
          compte("preparer") && "jauges à remplir",
          compte("capture") && "captures",
        ]
          .filter(Boolean)
          .join(", ")}. Enregistre chaque résultat : le plan se recalcule.`}
      >
        {actions.length ? (
          <ul className="flex flex-col gap-2">
            {actions.map((x) => {
              const id = `action-${x.numero}`;
              if (x.type === "naissance")
                return <CarteNaissance key={id} id={id} numero={x.numero} famille={famille} a={x.a} prevues={prevues(x.a.e.couleur)} setS={setS} niveauBebes={niveauNouvelles} etapePreparer={premier("preparer")} />;
              if (x.type === "clonage") return <CarteClonage key={id} id={id} numero={x.numero} famille={famille} g={x.g} setS={setS} />;
              if (x.type === "preparer") return <CartePreparer key={id} id={id} numero={x.numero} famille={famille} groupes={x.groupes} setS={setS} />;
              return <CarteCapture key={id} id={id} numero={x.numero} famille={famille} capture={x.capture} setS={setS} niveau={niveauNouvelles} />;
            })}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">Rien à faire avec l'étable actuelle.</p>
        )}
      </Cadre>

      {/* Séances suivantes */}
      {suivantes.length > 0 && (
        <Cadre
          titre="Et ensuite"
          sous="Chaque séance utilise les bébés de la précédente (et les clones de leurs parents devenus stériles). Prévision si tout réussit, recalculée après chaque naissance."
        >
          <ol className="flex gap-0 overflow-x-auto pb-2">
            {(toutesSeances ? suivantes : suivantes.slice(0, LIMITE_FRISE)).map((x, i, l) => (
              <li key={x.numero} className="apparition flex w-64 shrink-0 flex-col pr-3" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center">
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-accent ring-4 ring-accent/20" />
                  <span className={`h-0.5 flex-1 ${i < l.length - 1 ? "bg-linear-to-r from-accent/70 to-border-light" : "bg-linear-to-r from-accent/40 to-transparent"}`} />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-semibold">Séance {x.numero}</span>
                  <span className="text-xs text-text-muted">
                    {x.naissances.reduce((n, y) => n + y.nombre, 0)} naissance{x.naissances.reduce((n, y) => n + y.nombre, 0) > 1 ? "s" : ""}
                    {x.clonages > 0 && ` · ${x.clonages} clonage${x.clonages > 1 ? "s" : ""}`}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {x.naissances.map((n) => (
                    <span
                      key={n.couleur}
                      className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${n.succes ? "border-accent/50 bg-accent/10 text-text-primary" : "border-border-light text-text-secondary"}`}
                      title={n.succes ? "Nouvelle couleur pour un succès" : "Intermédiaire, sert de parent plus tard"}
                    >
                      <ImageMonture famille={famille} id={n.couleur} taille={20} />
                      {nomCouleur(famille, n.couleur)}
                      {n.nombre > 1 && <b>×{n.nombre}</b>}
                      {n.succes && <span className="text-accent">★</span>}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {suivantes.length > LIMITE_FRISE && (
            <button className="mt-2 text-sm text-accent hover:underline" onClick={() => setToutesSeances(!toutesSeances)}>
              {toutesSeances ? "Réduire" : `Voir les ${suivantes.length - LIMITE_FRISE} séances suivantes (défiler →)`}
            </button>
          )}
        </Cadre>
      )}

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
