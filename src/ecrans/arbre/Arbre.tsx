import { useMemo, useState, type ReactNode } from "react";
import { actionsMaintenant, conseiller, seancesDesEtapes, type ActionAccouplement } from "../../moteur/conseils";
import { bonusDeFamille, caracteristiques, couleur, couleurs, nomCouleur } from "../../moteur/donnees";
import { enfantsDe, lignee } from "../../moteur/genealogie";
import { choisirCible } from "../../moteur/actions";
import { planifier, regrouperClonages, suggererClonages, type Plan } from "../../moteur/planificateur";
import type { Famille, Sauvegarde } from "../../moteur/types";
import { Segments, TitreSection } from "../../ui";
import { CarteLignee, type FiltreCarte } from "./CarteLignee";
import { COULEURS, Etoile, fabriquerStatut, ImageMonture, type RolePlan, type Statut } from "./commun";

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
  /** Couleur à sélectionner à l'ouverture (recherche rapide). */
  focus?: string | null;
}

export function Arbre({ famille, s, setS, focus = null }: Props) {
  const cible = s.options.cibles?.[famille] ?? null;
  const viser = (id: string | null) => setS((x) => choisirCible(x, famille, id));
  const [selection, setSelection] = useState<string | null>(focus);
  const [survol, setSurvol] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<FiltreCarte>("tout");
  const [bonus, setBonus] = useState("");
  const [legende, setLegende] = useState(true);

  // Le plan d'élevage colore la carte : prochaines naissances (★) et couleurs à faire naître pour la suite.
  const { statut, prochaines, plan, dansPlan, seances } = useMemo(() => {
    const plan = planifier(famille, s.montures, s.obtenues[famille], s.options.cibles?.[famille], s.options.priorite);
    const c = conseiller(plan, { takeza: s.options.takeza, makina: s.options.makina, seuilAnimakina: s.options.seuilAnimakina });
    // Même numérotation que le tableau de bord (clonages compris).
    actionsMaintenant(c, regrouperClonages(suggererClonages(s.montures.filter((m) => m.famille === famille))));
    const roles = new Map<string, RolePlan>();
    for (const e of plan.etapes) if (e.pour === "intermediaire") roles.set(e.couleur, "produire");
    const rangs = new Map<string, number>();
    for (const a of c.ordre) {
      if (rangs.has(a.e.couleur)) continue; // la carte prête passe avant celle à préparer
      roles.set(a.e.couleur, a.aPreparer.length ? "preparer" : "pret");
      rangs.set(a.e.couleur, a.rang);
    }
    // « Mon plan » : les couleurs à faire naître et celles qui leur servent de parents.
    const dansPlan = new Set<string>();
    for (const e of plan.etapes) {
      dansPlan.add(e.couleur);
      e.recette.forEach((x) => dansPlan.add(x));
    }
    return { statut: fabriquerStatut(famille, s.montures, s.obtenues[famille], roles, rangs), prochaines: c.ordre, plan, dansPlan, seances: seancesDesEtapes(plan) };
  }, [famille, s.montures, s.obtenues, s.options.takeza, s.options.makina, s.options.seuilAnimakina, s.options.cibles]);

  const detail = selection ?? survol;

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[560px] gap-4">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border bg-bg-secondary px-3 py-2 text-sm">
          <span className="font-semibold">Carte des lignées</span>
          <span className="text-xs text-text-muted">glisser pour déplacer · molette pour zoomer · survol : parents et enfants · clic : toute la lignée · Échap : désélectionner</span>
          <span className="flex-1" />
          <RechercheCarte famille={famille} choisir={setSelection} />
          <select
            data-tuto="arbre-bonus"
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            title="Mettre en avant les couleurs qui donnent ce bonus"
            className={`rounded-lg border bg-bg-card px-2 py-1 text-xs outline-none ${bonus ? "border-accent text-accent" : "border-border-light text-text-secondary"}`}
          >
            <option value="">Bonus : tous</option>
            {bonusDeFamille(famille).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <span data-tuto="arbre-filtres">
            <Segments
            petit
            valeur={filtre}
            onChange={setFiltre}
            options={[
              { valeur: "tout", libelle: "Tout" },
              { valeur: "plan", libelle: "Mon plan", titre: "Seulement les couleurs à faire naître et leurs parents" },
              { valeur: "manquantes", libelle: "Manquantes", titre: "Seulement les couleurs jamais obtenues" },
              ]}
            />
          </span>
        </div>
        <div className="min-h-0 flex-1" data-tuto="arbre-carte">
          <CarteLignee famille={famille} cible={cible} bonus={bonus} statut={statut} selection={selection} setSelection={setSelection} survol={survol} setSurvol={setSurvol} filtre={filtre} dansPlan={dansPlan} />
        </div>
        <div data-tuto="arbre-legende">
          <Legende ouverte={legende} basculer={() => setLegende(!legende)} />
        </div>
      </div>

      <aside data-tuto="arbre-detail" className="w-80 shrink-0 overflow-y-auto rounded-xl border border-border bg-bg-card p-4">
        {detail ? (
          <Detail famille={famille} id={detail} cible={cible} viser={viser} statut={statut} plan={plan} seances={seances} choisir={setSelection} selectionnee={detail === selection} />
        ) : (
          <div className="flex flex-col gap-5">
            <Prochaines famille={famille} liste={prochaines} choisir={setSelection} />
            <p className="text-xs text-text-muted">Clique une couleur sur la carte pour voir comment l'obtenir et ce qu'elle débloque.</p>
          </div>
        )}
      </aside>
    </div>
  );
}

const Rond = ({ bord, tirets }: { bord: string; tirets?: boolean }) => <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full" style={{ border: `2px ${tirets ? "dashed" : "solid"} ${bord}` }} />;

/** Légende sur une ligne, repliable. */
function Legende({ ouverte, basculer }: { ouverte: boolean; basculer: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary">
      <button className="text-text-muted hover:text-text-primary" onClick={basculer}>
        {ouverte ? "▾ Légende" : "▸ Légende"}
      </button>
      {ouverte && (
        <>
          <span className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-black" style={{ background: COULEURS.obtenue }}>
              ✓
            </span>
            Obtenue
          </span>
          <span className="flex items-center gap-1.5">
            <Etoile rang={1} pret taille={16} /> Prochaine étape (n° du tableau de bord)
          </span>
          <span className="flex items-center gap-1.5">
            <Rond bord={COULEURS.produire} tirets /> À produire pour la suite
          </span>
          <span className="flex items-center gap-1.5">
            <Rond bord={COULEURS.verrouillee} tirets /> Jamais obtenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded" style={{ background: "var(--color-accent)" }} /> D'où elle vient
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded bg-sky-400" /> Ce qu'elle débloque
          </span>
        </>
      )}
    </div>
  );
}

/** Recherche d'une couleur sur la carte : Entrée sélectionne la première trouvée et la centre. */
function RechercheCarte({ famille, choisir }: { famille: Famille; choisir: (id: string) => void }) {
  const [texte, setTexte] = useState("");
  const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const trouvees = texte.trim() ? couleurs(famille).filter((c) => norm(c.nom).includes(norm(texte.trim()))) : [];
  const valider = (id: string) => {
    choisir(id);
    setTexte("");
  };
  return (
    <div className="relative" data-tuto="arbre-recherche">
      <input
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && trouvees[0]) valider(trouvees[0].id);
          if (e.key === "Escape") setTexte("");
        }}
        placeholder="⌕ Trouver une couleur…"
        className="w-48 rounded-lg border border-border-light bg-bg-card px-2 py-1 text-xs outline-none focus:border-accent"
      />
      {trouvees.length > 0 && (
        <div className="surface absolute left-0 top-full z-20 mt-1 flex max-h-72 w-60 flex-col overflow-y-auto rounded-lg border border-border-light p-1 shadow-xl">
          {trouvees.slice(0, 12).map((c) => (
            <button key={c.id} onClick={() => valider(c.id)} className="flex items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-bg-hover">
              <ImageMonture famille={famille} id={c.id} taille={20} />
              <span className="flex-1 truncate">{c.nom}</span>
              <span className="text-[10px] text-text-muted">G{c.generation}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bloc repliable au-delà de `max` éléments. */
function Repliable<T>({ items, max, rendu, quoi }: { items: T[]; max: number; rendu: (x: T) => ReactNode; quoi: string }) {
  const [tout, setTout] = useState(false);
  const visibles = tout || items.length <= max + 1 ? items : items.slice(0, max);
  return (
    <>
      {visibles.map(rendu)}
      {items.length > max + 1 && (
        <button onClick={() => setTout(!tout)} className="self-start text-[11px] text-accent hover:underline">
          {tout ? "▴ Réduire" : `▾ Voir ${items.length - max} ${quoi} de plus`}
        </button>
      )}
    </>
  );
}

/** Caractéristiques au niveau maximum, en pastilles sur deux colonnes. */
function Caracteristiques({ famille, id }: { famille: Famille; id: string }) {
  const liste = caracteristiques(famille, id);
  return (
    <div data-tuto="arbre-carac">
      <TitreSection>Caractéristiques</TitreSection>
      {liste === null ? (
        <p className="text-xs text-text-muted">Pas encore connues.</p>
      ) : liste.length === 0 ? (
        <p className="text-xs text-text-muted">Aucune.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1">
            {liste.map(([nom, v]) => (
              <span key={nom} className="flex items-baseline gap-1 truncate rounded-md border border-border-light bg-bg-secondary px-1.5 py-0.5 text-xs" title={`+${v} ${nom}`}>
                <b className="text-status-ok">+{v}</b>
                <span className="truncate text-text-secondary">{nom}</span>
              </span>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-text-muted">Au niveau maximum de la monture.</p>
        </>
      )}
    </div>
  );
}

const Puce = ({ famille, x, choisir }: { famille: Famille; x: string; choisir: (id: string) => void }) => (
  <button onClick={() => choisir(x)} className="flex items-center gap-1 rounded-md border border-border-light px-1.5 py-0.5 text-xs hover:bg-bg-hover" title="Sélectionner sur la carte">
    <ImageMonture famille={famille} id={x} taille={20} />
    {nomCouleur(famille, x)}
  </button>
);

/** Étapes du plan qui mènent à cette couleur (comme le chemin du tableau de bord). */
function cheminVers(plan: Plan, id: string): number[] {
  const indices = plan.etapes.map((e, i) => ({ e, i })).filter(({ e }) => e.couleur === id);
  if (!indices.length) return [];
  const depart = (indices.find(({ e }) => e.pour === "succes") ?? indices[0]).i;
  const chemin = new Set<number>();
  const remonter = (i: number) => {
    if (chemin.has(i)) return;
    chemin.add(i);
    for (const p of plan.etapes[i].parents) if (p.type === "naissance") remonter(p.etape);
  };
  remonter(depart);
  return [...chemin].sort((a, b) => a - b);
}

function Detail(p: { famille: Famille; id: string; cible: string | null; viser: (id: string | null) => void; statut: (id: string) => Statut; plan: Plan; seances: number[]; choisir: (id: string) => void; selectionnee: boolean }) {
  const { famille, id } = p;
  const c = couleur(famille, id);
  const st = p.statut(id);
  const enfants = enfantsDe(famille, id);
  const l = lignee(famille, id);
  const chemin = cheminVers(p.plan, id);
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full p-2" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-accent) 28%, transparent), transparent 70%)" }}>
          <ImageMonture famille={famille} id={id} taille={104} />
        </div>
        <div className="text-lg font-semibold">{c.nom}</div>
        <div className="text-text-muted">Génération {c.generation}</div>
        <div className="mt-1">
          {c.generation === 1 ? (
            <span className="text-text-secondary">Capturable (sauvage)</span>
          ) : st.obtenue ? (
            <span className="text-status-ok">✓ Naissance obtenue</span>
          ) : (
            <span className="text-status-warn">Naissance à obtenir</span>
          )}
        </div>
        <div className="mt-1">
          En stock : <span className="text-sky-400">{st.males} ♂</span> · <span className="text-pink-400">{st.femelles} ♀</span>
        </div>
        {!p.selectionnee && <div className="mt-1 text-[11px] text-text-muted">Clique pour la sélectionner et voir toute sa lignée.</div>}
        {c.generation > 1 &&
          (p.cible === id ? (
            <button data-tuto="viser" onClick={() => p.viser(null)} className="mt-2 rounded-lg border border-sky-400/60 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-300 hover:bg-sky-400/25">
              🎯 Objectif prioritaire · Retirer
            </button>
          ) : (
            <button
              data-tuto="viser"
              onClick={() => p.viser(id)}
              title="Le plan fait d'abord le chemin le plus court vers cette couleur, et garde une monture de cette couleur (jamais utilisée comme parent)."
              className="mt-2 rounded-lg border border-border-light px-3 py-1 text-xs font-semibold text-text-secondary hover:border-sky-400/60 hover:text-sky-300"
            >
              🎯 Viser en priorité{p.cible ? ` (remplace ${nomCouleur(famille, p.cible)})` : ""}
            </button>
          ))}
      </div>

      <Caracteristiques famille={famille} id={id} />

      {chemin.length > 0 && (
        <div>
          <TitreSection>
            Comment l'obtenir ({chemin.length} étape{chemin.length > 1 ? "s" : ""})
          </TitreSection>
          <ol className="flex flex-col gap-1">
            <Repliable
              items={chemin}
              max={6}
              quoi="étapes"
              rendu={(i) => {
                const e = p.plan.etapes[i];
                const s = p.statut(e.couleur);
                return (
                  <li key={i}>
                    <button
                      onClick={() => p.choisir(e.couleur)}
                      title="Sélectionner sur la carte"
                      className="flex w-full items-center gap-2 rounded-lg border border-border-light bg-bg-secondary px-2 py-1 text-left hover:border-accent/60 hover:bg-bg-hover"
                    >
                      <ImageMonture famille={famille} id={e.recette[0]} taille={20} />
                      <span className="text-text-muted">×</span>
                      <ImageMonture famille={famille} id={e.recette[1]} taille={20} />
                      <span className="text-accent">→</span>
                      <span className="min-w-0 flex-1 truncate text-xs">{nomCouleur(famille, e.couleur)}</span>
                      {s.rang && p.seances[i] === 1 ? (
                        <Etoile rang={s.rang} pret={s.plan === "pret"} taille={18} />
                      ) : (
                        <span className="shrink-0 text-[10px] text-text-muted">{p.seances[i] === 1 ? "maintenant" : `séance ${p.seances[i]}`}</span>
                      )}
                    </button>
                  </li>
                );
              }}
            />
          </ol>
        </div>
      )}

      {c.recettes.length > 0 && (
        <div>
          <TitreSection>{c.recettes.length > 1 ? `Parents possibles (${c.recettes.length})` : "Parents possibles"}</TitreSection>
          <div className="flex flex-col gap-1">
            {c.recettes.map(([a, b], i) => (
              <div key={i} className="flex flex-wrap items-center gap-1">
                <Puce famille={famille} x={a} choisir={p.choisir} /> <span className="text-text-muted">×</span> <Puce famille={famille} x={b} choisir={p.choisir} />
              </div>
            ))}
          </div>
        </div>
      )}

      {enfants.length > 0 && (
        <div>
          <TitreSection>Ce qu'elle débloque ({enfants.length})</TitreSection>
          <div className="flex flex-wrap gap-1">
            <Repliable items={enfants} max={8} quoi="couleurs" rendu={(x) => <Puce key={x} famille={famille} x={x} choisir={p.choisir} />} />
          </div>
        </div>
      )}

      <div className="text-xs text-text-muted">
        Lignée : {l.ancetres.size} ancêtre(s), {l.descendants.size} descendant(s) au total.
      </div>
    </div>
  );
}

function Prochaines({ famille, liste, choisir }: { famille: Famille; liste: ActionAccouplement[]; choisir: (id: string) => void }) {
  return (
    <div>
      <TitreSection>Naissances à venir ({liste.length})</TitreSection>
      <p className="mb-2 text-[11px] text-text-muted">Même numérotation que le tableau de bord ; hachurées : parents à préparer d'abord.</p>
      {liste.length === 0 ? (
        <p className="text-xs text-text-muted">Aucune pour l'instant : voir les captures dans le « Tableau de bord ».</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {[...liste]
            .sort((x, y) => x.rang - y.rang)
            .map((a) => (
              <button
                key={a.etape}
                onClick={() => choisir(a.e.couleur)}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm transition hover:-translate-y-0.5 hover:border-border-light ${a.aPreparer.length ? "hachure border-border" : "border-border-light bg-bg-secondary"}`}
                style={{ borderLeft: `3px solid ${a.aPreparer.length ? "rgba(255,255,255,0.15)" : "#22c55e"}` }}
                title="Voir sur la carte"
              >
                <Etoile rang={a.rang} pret={!a.aPreparer.length} />
                <ImageMonture famille={famille} id={a.e.couleur} taille={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">
                    {nomCouleur(famille, a.e.couleur)} <span className="text-[11px] text-text-muted">G{a.e.generation}</span>
                  </span>
                  <span className={`block text-[11px] ${a.termineSucces ? "text-status-ok" : a.e.pour === "succes" ? "text-accent" : "text-text-muted"}`}>
                    {a.termineSucces ? `termine le succès G${a.e.generation}` : a.e.pour === "succes" ? "nouvelle couleur" : "pour la suite"}
                    {a.aPreparer.length ? " · parents à préparer" : ""}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
