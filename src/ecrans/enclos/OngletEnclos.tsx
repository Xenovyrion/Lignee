// Onglet Enclos : les jauges de chaque enclos comme dans le jeu (barres verticales, mêmes couleurs).
// On active au plus deux jauges, on règle leur remplissage (crans cliquables en mode simple, glisser en mode
// avancé), et Lignée calcule l'heure où les montures sont prêtes. Indépendant de la famille.
// Hypothèses : caractéristiques à 0 ; sérénité de départ déduite des jauges (montures dans la bonne zone) ou choisie.
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  CHARGE_MAX,
  chargeApres,
  COULEURS_JAUGE,
  CRANS,
  dependDeLaSerenite,
  duree,
  GROUPES_JAUGES,
  NOMS_JAUGE,
  palier,
  SERENITE_MAX,
  SERENITES,
  sereniteParDefaut,
  simuler,
  SYMBOLES_JAUGE,
  type MinuteurEnclos,
  type TypeJauge,
} from "../../moteur/enclos";
import { nombreEnclos, prochainPalierEnclos } from "../../moteur/etable";
import type { Sauvegarde } from "../../moteur/types";
import { useNotifier } from "../../notifications";
import { lireRelais } from "../../relais";
import { Bouton, champ } from "../../ui";

type Charges = Record<TypeJauge, number>;
interface Brouillon {
  actives: TypeJauge[];
  charges: Charges;
  montures: number;
  niveauDepart: number;
  niveauCible: number;
  /** Sérénité de départ choisie ; null : déduite des jauges actives. */
  serenite: number | null;
}

const TOUTES = GROUPES_JAUGES.flat();
const SERENITE: TypeJauge[] = ["baffeur", "caresseur"];
/** Repères des paliers sur la barre (fin de T1, T2, T3), en part de la charge maximale. */
const REPERES = [80_000, 140_000, 180_000].map((c) => c / CHARGE_MAX);
const CRANS_SIMPLES = [0, ...CRANS.map((c) => c.charge)];
const HAUTEUR = 176;
const NB_CRANS = CRANS.length;
/** Mode simple : la barre est découpée en 8 crans égaux ; position (0 à 1) d'une charge quelconque. */
function position(charge: number) {
  const c = Math.max(0, Math.min(CHARGE_MAX, charge));
  const i = CRANS_SIMPLES.findIndex((x) => x >= c);
  if (i <= 0) return 0;
  const [a, b] = [CRANS_SIMPLES[i - 1], CRANS_SIMPLES[i]];
  return (i - 1 + (c - a) / (b - a)) / NB_CRANS;
}
const cranProche = (charge: number) => CRANS_SIMPLES.reduce((m, c, i) => (Math.abs(c - charge) < Math.abs(CRANS_SIMPLES[m] - charge) ? i : m), 0);

/** « 18:40 », « demain 06:10 », « ven. 09:00 ». */
function heure(ms: number) {
  const d = new Date(ms);
  const h = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const jours = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
  if (jours === 0) return h;
  if (jours === 1) return `demain ${h}`;
  return `${d.toLocaleDateString("fr-FR", { weekday: "short" })} ${h}`;
}

const libelleCharge = (c: number, exacte: boolean) =>
  exacte ? c.toLocaleString("fr-FR") : (CRANS.find((x) => x.charge === c)?.libelle ?? (c ? palier(c) : "vide"));

function Jauge({
  type,
  charge,
  actif,
  modifiable,
  exacte,
  basculer,
  regler,
}: {
  type: TypeJauge;
  charge: number;
  actif: boolean;
  modifiable: boolean;
  exacte: boolean;
  /** Active (avec une charge de départ éventuelle) ou désactive la jauge. */
  basculer: (charge?: number) => void;
  regler: (c: number) => void;
}) {
  const barre = useRef<HTMLDivElement>(null);
  const couleur = COULEURS_JAUGE[type];
  const pas = (sens: 1 | -1) => {
    if (exacte) return regler(Math.max(0, Math.min(CHARGE_MAX, charge + sens * 5000)));
    regler(CRANS_SIMPLES[Math.max(0, Math.min(NB_CRANS, cranProche(charge) + sens))]);
  };
  /** Part de la hauteur sous le pointeur (0 en bas, 1 en haut). */
  const part = (y: number) => {
    const r = barre.current?.getBoundingClientRect();
    return r ? Math.max(0, Math.min(1, 1 - (y - r.top) / r.height)) : 0;
  };
  const glisser = (y: number) => regler(Math.round((part(y) * CHARGE_MAX) / 1000) * 1000);
  /** Mode simple : clic sur un cran = remplir jusque-là ; re-clic sur le cran du haut = un cran de moins. */
  const cliquerCran = (y: number) => {
    const i = Math.max(1, Math.ceil(part(y) * NB_CRANS));
    if (!actif) return basculer(CRANS_SIMPLES[i]);
    regler(CRANS_SIMPLES[i === cranProche(charge) ? i - 1 : i]);
  };
  // Molette : un cran (ou 5 000) de plus ou de moins. Écouteur natif pour bloquer le défilement de la page.
  const pasRef = useRef(pas);
  pasRef.current = pas;
  useEffect(() => {
    const el = barre.current;
    if (!el || !modifiable || !actif) return;
    const roue = (e: WheelEvent) => {
      e.preventDefault();
      pasRef.current(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", roue, { passive: false });
    return () => el.removeEventListener("wheel", roue);
  }, [modifiable, actif]);

  const remplissage = exacte ? charge / CHARGE_MAX : position(charge);
  const aide = !modifiable ? "" : !actif ? " · clique pour activer" : exacte ? " · glisse ou molette pour régler" : " · clique un cran ou molette";
  return (
    <div className={`flex w-12 flex-col items-center gap-1 transition ${actif ? "" : "opacity-40 grayscale hover:opacity-75 hover:grayscale-0"}`}>
      <div
        className="rounded-lg p-1 transition"
        style={actif ? { background: "rgba(0,0,0,0.35)", boxShadow: `0 0 0 2px ${couleur}, 0 0 14px ${couleur}66` } : { background: "rgba(0,0,0,0.2)" }}
      >
        <div
          ref={barre}
          role="slider"
          tabIndex={modifiable && actif ? 0 : -1}
          aria-label={NOMS_JAUGE[type]}
          aria-valuemin={0}
          aria-valuemax={CHARGE_MAX}
          aria-valuenow={charge}
          title={`${NOMS_JAUGE[type]} : ${actif ? `${charge.toLocaleString("fr-FR")} (${palier(charge)})` : "inactive"}${aide}`}
          className={`relative w-6 overflow-hidden rounded-sm bg-black/60 ${modifiable ? (exacte && actif ? "cursor-ns-resize touch-none" : "cursor-pointer") : ""}`}
          style={{ height: HAUTEUR }}
          onPointerDown={(e) => {
            if (!modifiable) return;
            if (!exacte) return cliquerCran(e.clientY);
            if (!actif) return basculer();
            e.currentTarget.setPointerCapture(e.pointerId);
            glisser(e.clientY);
          }}
          onPointerMove={(e) => modifiable && exacte && actif && e.buttons && glisser(e.clientY)}
          onKeyDown={(e) => {
            if (!modifiable || !actif) return;
            if (e.key === "ArrowUp") pas(1);
            else if (e.key === "ArrowDown") pas(-1);
            else return;
            e.preventDefault();
          }}
        >
          <div className="absolute inset-x-0 bottom-0 transition-[height] duration-300" style={{ height: `${remplissage * 100}%`, background: couleur }} />
          {exacte
            ? REPERES.map((r) => <div key={r} className="absolute inset-x-0 h-px bg-black/60" style={{ bottom: `${r * 100}%` }} />)
            : Array.from({ length: NB_CRANS - 1 }, (_, i) => (
                <div key={i} className={`absolute inset-x-0 bg-black/70 ${i % 2 ? "h-0.5" : "h-px"}`} style={{ bottom: `${((i + 1) / NB_CRANS) * 100}%` }} />
              ))}
        </div>
      </div>
      <button
        disabled={!modifiable}
        onClick={() => basculer()}
        title={actif ? "Désactiver cette jauge" : "Activer cette jauge"}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition disabled:cursor-default"
        style={{ borderColor: couleur, color: actif ? "#1a1a1a" : couleur, background: actif ? couleur : "rgba(0,0,0,0.35)" }}
      >
        {SYMBOLES_JAUGE[type]}
      </button>
      <span className="text-center text-[10px] font-medium leading-tight" style={{ color: actif ? couleur : undefined }}>
        {actif ? libelleCharge(charge, exacte) : "off"}
      </span>
    </div>
  );
}

function Jauges(props: { charges: Charges; actives: TypeJauge[]; modifiable: boolean; exacte: boolean; basculer: (t: TypeJauge, charge?: number) => void; regler: (t: TypeJauge, c: number) => void }) {
  return (
    <div className="flex items-start justify-center gap-1">
      {GROUPES_JAUGES.map((g, i) => (
        <div key={i} className={`flex gap-1 ${i ? "border-l border-border pl-1" : ""}`}>
          {g.map((t) => (
            <Jauge
              key={t}
              type={t}
              charge={props.charges[t]}
              actif={props.actives.includes(t)}
              modifiable={props.modifiable}
              exacte={props.exacte}
              basculer={(c) => props.basculer(t, c)}
              regler={(c) => props.regler(t, c)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CarteEnclos({ k, s, setS }: { k: number; s: Sauvegarde; setS: (f: (s: Sauvegarde) => Sauvegarde) => void }) {
  const notifier = useNotifier();
  const m = s.minuteurs?.find((x) => x.enclos === k);
  const exacte = s.options.saisieJauges === "exacte";
  const depuis = (x?: MinuteurEnclos): Brouillon => {
    const charges = Object.fromEntries(TOUTES.map((t) => [t, 0])) as Charges;
    for (const j of x?.jauges ?? []) charges[j.type] = j.charge;
    return {
      actives: x?.jauges.map((j) => j.type) ?? [],
      charges,
      montures: x?.montures ?? 10,
      niveauDepart: x?.niveauDepart ?? s.options.niveauParDefaut,
      niveauCible: x?.niveauCible ?? Math.max(s.options.niveauParDefaut, 100),
      serenite: x?.sereniteDepart ?? null,
    };
  };
  const [edition, setEdition] = useState(!m);
  const [b, setB] = useState<Brouillon>(() => depuis(m));
  const [, rafraichir] = useState(0);
  useEffect(() => {
    const id = setInterval(() => rafraichir((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  // Minuteur arrêté ailleurs (annulation…) : retour à la saisie.
  useEffect(() => {
    if (!m) setEdition(true);
  }, [m]);

  const serenite = b.serenite ?? sereniteParDefaut(b.actives);
  const aSimuler = { jauges: b.actives.map((t) => ({ type: t, charge: b.charges[t] })), niveauDepart: b.niveauDepart, niveauCible: b.niveauCible, sereniteDepart: serenite };
  const apercu = useMemo(() => simuler(aSimuler), [JSON.stringify(aSimuler)]); // eslint-disable-line react-hooks/exhaustive-deps
  const sim = useMemo(() => (m ? simuler(m) : null), [m]);

  const basculer = (t: TypeJauge, charge?: number) =>
    setB((x) => {
      if (x.actives.includes(t)) return { ...x, actives: x.actives.filter((y) => y !== t) };
      // Baffeur et Caresseur sont liés en jeu : activer l'un coupe l'autre.
      let actives = x.actives.filter((y) => !(SERENITE.includes(t) && SERENITE.includes(y)));
      if (actives.length >= 2) {
        notifier("2 jauges actives au maximum : désactive-en une d'abord", { ton: "info", cle: "jauges" });
        return x;
      }
      actives = [...actives, t];
      return { ...x, actives, charges: { ...x.charges, [t]: charge ?? (x.charges[t] || CRANS[1].charge) } };
    });

  const lancer = () => {
    const nouveau: MinuteurEnclos = { enclos: k, debut: new Date().toISOString(), montures: b.montures, jauges: aSimuler.jauges, niveauDepart: b.niveauDepart, niveauCible: b.niveauCible, sereniteDepart: serenite, signales: [] };
    setS((x) => ({ ...x, minuteurs: [...(x.minuteurs ?? []).filter((y) => y.enclos !== k), nouveau] }));
    setEdition(false);
    notifier(`Enclos ${k} : minuteur lancé`, { annulable: true });
  };
  const arreter = () => {
    setS((x) => ({ ...x, minuteurs: (x.minuteurs ?? []).filter((y) => y.enclos !== k) }));
    setB(depuis(m));
    notifier(`Enclos ${k} : minuteur arrêté`, { annulable: true });
  };

  const enCours = m && !edition;
  const maintenant = Date.now();
  const debut = m ? Date.parse(m.debut) : maintenant;
  const ecoule = (maintenant - debut) / 1000;
  const chargesAffichees: Charges = enCours
    ? (Object.fromEntries(TOUTES.map((t) => [t, chargeApres(m.jauges.find((j) => j.type === t)?.charge ?? 0, ecoule)])) as Charges)
    : b.charges;
  const evenements = (enCours ? sim : apercu)?.evenements ?? [];
  const fin = (enCours ? sim : apercu)?.fin;
  const finMs = fin !== undefined ? (enCours ? debut : maintenant) + fin * 1000 : undefined;
  const termine = enCours && finMs !== undefined && finMs <= maintenant;
  const typesActifs = enCours ? m.jauges.map((j) => j.type) : b.actives;
  const estimation = dependDeLaSerenite(typesActifs);
  const signe = (v: number) => `${v > 0 ? "+" : ""}${v.toLocaleString("fr-FR")}`;

  const couleurEvt = (t: string) => (t === "fin" ? "text-status-ok" : t === "zone" ? "text-status-warn" : "text-status-err");
  const libelle = (t: TypeJauge) => NOMS_JAUGE[t].split(" (")[0];
  const chargesLancement = enCours ? Object.fromEntries(m.jauges.map((j) => [j.type, j.charge])) : b.charges;

  return (
    <section className={`@container flex flex-col gap-3 rounded-xl border bg-bg-secondary p-3 ${termine ? "border-status-ok" : enCours ? "border-accent/60" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Enclos {k}</h3>
        <span className="text-xs text-text-muted">
          {enCours ? (termine ? "terminé" : "minuteur en cours") : `${typesActifs.length}/2 jauges activées`}
        </span>
      </div>

      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-start">
        <div className="shrink-0">
          <Jauges
            charges={chargesAffichees}
            actives={typesActifs}
            modifiable={!enCours}
            exacte={exacte}
            basculer={basculer}
            regler={(t, c) => setB((x) => ({ ...x, charges: { ...x.charges, [t]: c } }))}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 text-xs">
          {!typesActifs.length ? (
            <p className="text-text-muted">
              Clique la barre des jauges mises en jeu (2 au maximum) pour les activer et régler leur remplissage. L'icône sous la barre active ou désactive.
            </p>
          ) : (
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-text-secondary">
              {typesActifs.map((t) => (
                <Fragment key={t}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: COULEURS_JAUGE[t] }} />
                    {libelle(t)}
                  </span>
                  {exacte && !enCours ? (
                    <input
                      type="number"
                      min={0}
                      max={CHARGE_MAX}
                      step={1000}
                      value={b.charges[t]}
                      onChange={(e) => setB((x) => ({ ...x, charges: { ...x.charges, [t]: Math.max(0, Math.min(CHARGE_MAX, Number(e.target.value) || 0)) } }))}
                      className={`${champ} w-28 text-xs`}
                    />
                  ) : (
                    <span className="text-text-primary">
                      {libelleCharge(chargesLancement[t] ?? 0, false)}
                      <span className="text-text-muted"> · {(chargesLancement[t] ?? 0).toLocaleString("fr-FR")}</span>
                      {enCours && <span className="text-text-muted"> au lancement</span>}
                    </span>
                  )}
                </Fragment>
              ))}

              <span style={{ color: COULEURS_JAUGE.caresseur }}>Sérénité</span>
              {enCours ? (
                <span className="text-text-primary">{signe(m.sereniteDepart ?? sereniteParDefaut(typesActifs))} au départ</span>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5" title="Sérénité des montures au lancement. Par défaut, on suppose qu'elles sont dans la zone de la jauge travaillée.">
                  {exacte ? (
                    <input
                      type="number"
                      min={-SERENITE_MAX}
                      max={SERENITE_MAX}
                      step={100}
                      value={serenite}
                      onChange={(e) => setB((y) => ({ ...y, serenite: Math.max(-SERENITE_MAX, Math.min(SERENITE_MAX, Math.round(Number(e.target.value) || 0))) }))}
                      className={`${champ} w-28 text-xs`}
                    />
                  ) : (
                    <div className="flex rounded-lg border border-border-light p-0.5">
                      {SERENITES.map((x) => (
                        <button
                          key={x.nom}
                          onClick={() => setB((y) => ({ ...y, serenite: x.valeur }))}
                          className={`rounded-md px-2 py-0.5 ${serenite === x.valeur ? "bg-accent-dim text-accent" : "text-text-secondary"}`}
                        >
                          {x.nom}
                        </button>
                      ))}
                    </div>
                  )}
                  {b.serenite === null ? (
                    <span className="text-text-muted">auto</span>
                  ) : (
                    <button className="text-text-muted underline-offset-2 hover:underline" onClick={() => setB((y) => ({ ...y, serenite: null }))}>
                      auto
                    </button>
                  )}
                </div>
              )}

              <span>Montures</span>
              {enCours ? (
                <span className="text-text-primary">{m.montures}</span>
              ) : (
                <input type="number" min={1} max={10} value={b.montures} onChange={(e) => setB((x) => ({ ...x, montures: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))} className={`${champ} w-16 text-xs`} />
              )}

              {typesActifs.includes("mangeoire") && (
                <>
                  <span>Niveau</span>
                  {enCours ? (
                    <span className="text-text-primary">
                      {m.niveauDepart} → {m.niveauCible}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <input type="number" min={1} max={200} value={b.niveauDepart} onChange={(e) => setB((x) => ({ ...x, niveauDepart: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))} className={`${champ} w-16 text-xs`} />
                      → visé
                      <input type="number" min={1} max={200} value={b.niveauCible} onChange={(e) => setB((x) => ({ ...x, niveauCible: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))} className={`${champ} w-16 text-xs`} />
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          {typesActifs.length > 0 && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-black/20 p-2.5">
              {finMs !== undefined ? (
                <span className={`text-sm ${termine ? "font-semibold text-status-ok" : "font-medium text-text-primary"}`}>
                  {termine ? `✅ Prêt depuis ${heure(finMs)}` : `⏱️ Prêt à ${heure(finMs)} · dans ${duree((finMs - maintenant) / 1000)}`}
                </span>
              ) : (
                <span className="text-sm font-medium text-status-err">Pas d'heure de fin : voir ci-dessous</span>
              )}
              {estimation && <span className="text-text-muted">Estimation : dépend de la sérénité réelle des montures.</span>}
              {evenements
                .filter((e) => e.type !== "fin")
                .map((e) => {
                  const t = (enCours ? debut : maintenant) + e.t * 1000;
                  const passe = enCours && t <= maintenant;
                  return (
                    <div key={e.cle} className={passe ? "text-text-muted line-through" : ""}>
                      <span className={`font-semibold ${passe ? "" : couleurEvt(e.type)}`}>
                        {e.t <= 10 && !enCours ? "Tout de suite" : heure(t)} · {e.titre}
                      </span>
                      <span className="block text-text-secondary">{e.texte}</span>
                    </div>
                  );
                })}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {enCours ? (
              <>
                <Bouton
                  discret
                  onClick={() => {
                    setB(depuis(m));
                    setEdition(true);
                  }}
                  title="Changer les jauges et relancer à partir de maintenant"
                >
                  Relancer
                </Bouton>
                <Bouton discret onClick={arreter}>
                  Arrêter
                </Bouton>
                {lireRelais() && <span className="text-text-muted">Discord programmé</span>}
              </>
            ) : (
              <>
                <Bouton disabled={!b.actives.length} onClick={lancer}>
                  Lancer le minuteur
                </Bouton>
                {m && (
                  <Bouton discret onClick={() => setEdition(false)}>
                    Annuler
                  </Bouton>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function OngletEnclos({ s, setS }: { s: Sauvegarde; setS: (f: (s: Sauvegarde) => Sauvegarde) => void }) {
  const nb = nombreEnclos(s.options.niveauEleveur);
  const prochain = prochainPalierEnclos(s.options.niveauEleveur);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border bg-bg-card px-4 py-3 text-sm">
        <span>
          <b>{nb}</b> enclos <span className="text-text-muted">(métier Éleveur niveau {s.options.niveauEleveur}{prochain ? ` · un de plus au niveau ${prochain}` : ""})</span>
        </span>
        <span className="text-xs text-text-muted">
          Endurance, Maturité et Amour sont supposées partir de 0 ; la sérénité de départ se règle par enclos. Le nombre de montures ne change pas la durée : chaque
          monture gagne autant et la jauge se vide pareil. Notifications et saisie des jauges : Paramètres.
        </span>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: nb }, (_, i) => (
          <CarteEnclos key={i + 1} k={i + 1} s={s} setS={setS} />
        ))}
      </div>
    </div>
  );
}
