import { useMemo, useState } from "react";
import { conseiller } from "../../moteur/conseils";
import { couleur, FAMILLES, NOMS_FAMILLE } from "../../moteur/donnees";
import { planifier } from "../../moteur/planificateur";
import { bilan, naissances, NOM_META_NAISSANCES, OBJECTIF_NAISSANCES, PALIERS_NAISSANCES, type SuccesGeneration } from "../../moteur/succes";
import type { Famille, Sauvegarde } from "../../moteur/types";
import { champ } from "../../ui";
import { COULEURS, Etoile, ImageMonture, PointObtenue } from "../arbre/commun";

interface Props {
  famille: Famille;
  setFamille: (f: Famille) => void;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

type Filtre = "tous" | "encours" | "valides";

/** Anneau de progression. */
function Anneau({ valeur, taille = 64, epaisseur = 7 }: { valeur: number; taille?: number; epaisseur?: number }) {
  const r = (taille - epaisseur) / 2;
  const c = 2 * Math.PI * r;
  const fini = valeur >= 1;
  return (
    <svg width={taille} height={taille} className="shrink-0 -rotate-90">
      <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={epaisseur} />
      <circle
        cx={taille / 2}
        cy={taille / 2}
        r={r}
        fill="none"
        stroke={fini ? COULEURS.obtenue : "#d4a017"}
        strokeWidth={epaisseur}
        strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, valeur)} ${c}`}
        style={{ transition: "stroke-dasharray 400ms ease-out" }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" transform={`rotate(90 ${taille / 2} ${taille / 2})`} className="fill-text-primary text-[13px] font-bold">
        {Math.floor(valeur * 100)}%
      </text>
    </svg>
  );
}

const Barre = ({ valeur }: { valeur: number }) => (
  <div className="h-1.5 overflow-hidden rounded-full bg-bg-hover">
    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, valeur * 100)}%`, background: valeur >= 1 ? COULEURS.obtenue : "#d4a017" }} />
  </div>
);

const Badge = ({ valide, commence }: { valide: boolean; commence: boolean }) =>
  valide ? (
    <span className="rounded-full bg-status-ok/15 px-2 py-0.5 text-xs font-medium text-status-ok">✓ Validé</span>
  ) : commence ? (
    <span className="rounded-full bg-accent-dim px-2 py-0.5 text-xs font-medium text-accent">En cours</span>
  ) : (
    <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs font-medium text-text-muted">À commencer</span>
  );

export function Succes({ famille, setFamille, s, setS }: Props) {
  const bilans = useMemo(() => Object.fromEntries(FAMILLES.map((f) => [f, bilan(f, s)])) as Record<Famille, ReturnType<typeof bilan>>, [s]);
  const rangs = useMemo(() => {
    const c = conseiller(planifier(famille, s.montures, s.obtenues[famille]), { takeza: s.options.takeza });
    return new Map(c.ordre.map((a) => [a.e.couleur, { rang: a.rang, pret: !a.aPreparer.length }]));
  }, [famille, s.montures, s.obtenues, s.options.takeza]);
  const [filtre, setFiltre] = useState<Filtre>("tous");
  const [manquantesSeules, setManquantesSeules] = useState(false);
  const b = bilans[famille];
  const total = naissances(s);

  const basculer = (id: string) =>
    setS((s) => {
      const l = s.obtenues[famille];
      return { ...s, obtenues: { ...s.obtenues, [famille]: l.includes(id) ? l.filter((x) => x !== id) : [...l, id] } };
    });

  const generations = b.generations.filter((g) => (filtre === "valides" ? g.valide : filtre === "encours" ? !g.valide : true));

  return (
    <div className="flex flex-col gap-5">
      {/* Vue globale : une carte par famille + naissances */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FAMILLES.map((f) => {
          const x = bilans[f];
          const actif = f === famille;
          return (
            <button
              key={f}
              onClick={() => setFamille(f)}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition ${actif ? "border-accent bg-accent-dim" : "border-border bg-bg-card hover:bg-bg-hover"}`}
            >
              <Anneau valeur={x.obtenues / x.total} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{NOMS_FAMILLE[f]}s</div>
                <div className="text-sm text-text-secondary">
                  {x.obtenues}/{x.total} couleurs
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-text-muted">
                  <span className={x.validees === 9 ? "text-status-ok" : ""}>{x.validees}/9 générations</span>
                  <span className={x.capture.valide ? "text-status-ok" : ""}>capture {x.capture.valide ? "✓" : `${x.capture.capturees.length}/${x.capture.couleurs.length}`}</span>
                </div>
              </div>
            </button>
          );
        })}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-card p-4">
          <Anneau valeur={total / OBJECTIF_NAISSANCES} />
          <div className="min-w-0 flex-1">
            <div className="font-semibold" title={`« ${NOM_META_NAISSANCES} » : obtenir les 4 paliers`}>
              Naissances {total >= OBJECTIF_NAISSANCES && <span className="text-status-ok">✓</span>}
            </div>
            <div className="text-sm text-text-secondary">
              {total.toLocaleString("fr-FR")} / 1 000 <span className="text-text-muted">toutes familles</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-text-muted">
              {PALIERS_NAISSANCES.map(([n, nom]) => (
                <span key={n} title={nom} className={total >= n ? "text-status-ok" : ""}>
                  {n.toLocaleString("fr-FR")}
                  {total >= n ? " ✓" : ""}
                </span>
              ))}
            </div>
            <label className="mt-1 flex items-center gap-2 text-xs text-text-muted" title="Naissances déjà faites avant d'utiliser l'outil (visible dans le succès en jeu)">
              dont avant l'outil
              <input
                type="number"
                min={0}
                max={1000}
                className={`${champ} w-20 py-0.5 text-xs`}
                value={s.options.naissancesAnterieures ?? 0}
                onChange={(e) => {
                  const n = Math.max(0, Math.min(1000, Number(e.target.value) || 0));
                  setS((s) => ({ ...s, options: { ...s.options, naissancesAnterieures: n } }));
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Barre d'outils de la famille */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">{NOMS_FAMILLE[famille]}s</h2>
        <span className="text-sm text-text-secondary">
          {b.validees}/9 succès de génération · {b.total - b.obtenues} couleur{b.total - b.obtenues > 1 ? "s" : ""} à obtenir
        </span>
        <span className="flex-1" />
        <div className="flex rounded-lg border border-border-light p-0.5 text-sm">
          {(
            [
              ["tous", "Tous"],
              ["encours", "En cours"],
              ["valides", "Validés"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} onClick={() => setFiltre(v)} className={`rounded-md px-3 py-1 ${filtre === v ? "bg-bg-hover text-text-primary" : "text-text-secondary"}`}>
              {l}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" className="accent-accent" checked={manquantesSeules} onChange={(e) => setManquantesSeules(e.target.checked)} />
          Seulement les manquantes
        </label>
      </div>

      <p className="-mt-2 text-xs text-text-muted">
        Les naissances enregistrées cochent les couleurs automatiquement. Clique sur une monture pour corriger à la main (reprise d'une progression existante).
      </p>

      {/* Capture des générations 1 */}
      {filtre === "tous" || (filtre === "valides") === b.capture.valide ? (
        <CarteSucces
          titre={b.capture.nom}
          sousTitre="Capturer toutes les montures sauvages (génération 1)"
          faites={b.capture.capturees.length}
          total={b.capture.couleurs.length}
          valide={b.capture.valide}
        >
          <Grille
            famille={famille}
            couleurs={b.capture.couleurs.filter((c) => !manquantesSeules || !b.capture.capturees.includes(c))}
            obtenues={b.capture.capturees}
            rangs={new Map()}
            basculer={basculer}
          />
        </CarteSucces>
      ) : null}

      <div className="grid gap-4 2xl:grid-cols-2">
        {generations.map((g) => (
          <CarteGeneration key={g.generation} famille={famille} g={g} rangs={rangs} manquantesSeules={manquantesSeules} basculer={basculer} />
        ))}
      </div>

      {/* Méta-succès */}
      <CarteSucces titre={b.meta.nom} sousTitre="Obtenir les 9 succès de génération de la famille" faites={b.validees} total={9} valide={b.meta.valide}>
        <div className="flex flex-wrap gap-1.5">
          {b.generations.map((g) => (
            <span
              key={g.generation}
              className={`rounded-md border px-2 py-0.5 text-xs ${g.valide ? "border-status-ok/50 text-status-ok" : "border-border-light text-text-muted"}`}
            >
              {g.valide ? "✓ " : ""}G{g.generation}
            </span>
          ))}
        </div>
      </CarteSucces>
    </div>
  );
}

function CarteSucces({ titre, sousTitre, faites, total, valide, children }: { titre: string; sousTitre: string; faites: number; total: number; valide: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-xl border p-4 ${valide ? "border-status-ok/30 bg-status-ok/3" : "border-border bg-bg-card"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{titre}</div>
          <div className="text-xs text-text-muted">{sousTitre}</div>
        </div>
        <span className="text-sm text-text-secondary">
          {faites}/{total}
        </span>
        <Badge valide={valide} commence={faites > 0} />
      </div>
      <div className="mb-3">
        <Barre valeur={faites / total} />
      </div>
      {children}
    </section>
  );
}

function CarteGeneration(p: {
  famille: Famille;
  g: SuccesGeneration;
  rangs: Map<string, { rang: number; pret: boolean }>;
  manquantesSeules: boolean;
  basculer: (id: string) => void;
}) {
  const { g } = p;
  const manquantes = g.couleurs.length - g.obtenues.length;
  const visibles = g.couleurs.filter((c) => !p.manquantesSeules || !g.obtenues.includes(c));
  return (
    <CarteSucces
      titre={g.nom}
      sousTitre={g.valide ? "Toutes les montures de cette génération sont nées" : `${manquantes} monture${manquantes > 1 ? "s" : ""} à faire naître`}
      faites={g.obtenues.length}
      total={g.couleurs.length}
      valide={g.valide}
    >
      {visibles.length ? (
        <Grille famille={p.famille} couleurs={visibles} obtenues={g.obtenues} rangs={p.rangs} basculer={p.basculer} />
      ) : (
        <p className="text-xs text-text-muted">Rien à afficher avec ce filtre.</p>
      )}
    </CarteSucces>
  );
}

function Grille(p: { famille: Famille; couleurs: string[]; obtenues: string[]; rangs: Map<string, { rang: number; pret: boolean }>; basculer: (id: string) => void }) {
  const ob = new Set(p.obtenues);
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
      {p.couleurs.map((id) => {
        const c = couleur(p.famille, id);
        const fait = ob.has(id);
        const r = p.rangs.get(id);
        return (
          <button
            key={id}
            onClick={() => p.basculer(id)}
            title={fait ? "Obtenue — cliquer pour décocher" : "Pas encore obtenue — cliquer pour cocher"}
            className={`relative flex flex-col items-center rounded-lg border px-1 pb-1.5 pt-1 text-center transition hover:-translate-y-0.5 hover:bg-bg-hover ${
              fait ? "border-border-light bg-bg-secondary" : "border-dashed border-border-light"
            }`}
          >
            {fait && (
              <span className="absolute left-1.5 top-1.5">
                <PointObtenue />
              </span>
            )}
            {/* Étoile seulement sur les couleurs manquantes : c'est ce qui fait avancer les succès. */}
            {r && !fait && (
              <span className="absolute -right-1.5 -top-1.5" title={`À faire maintenant, n°${r.rang}`}>
                <Etoile rang={r.rang} pret={r.pret} taille={20} />
              </span>
            )}
            <ImageMonture famille={p.famille} id={id} taille={52} className={fait ? "" : "opacity-50 grayscale"} />
            <span className={`text-[11px] leading-tight ${fait ? "text-text-primary" : "text-text-muted"}`}>{c.nom}</span>
          </button>
        );
      })}
    </div>
  );
}
