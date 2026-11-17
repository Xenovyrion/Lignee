// Onglet Enclos : les jauges de chaque enclos comme dans le jeu (barres verticales, mêmes couleurs).
// On active au plus deux jauges, on règle leur remplissage en glissant de haut en bas, et Lignée calcule
// l'heure où les montures sont prêtes. Indépendant de la famille : on veut juste savoir quand c'est prêt.
// Hypothèse voulue : les montures partent de 0 (sérénité, endurance, maturité, amour).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHARGE_MAX,
  chargeApres,
  COULEURS_JAUGE,
  CRANS,
  duree,
  GROUPES_JAUGES,
  NOMS_JAUGE,
  palier,
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
}

const TOUTES = GROUPES_JAUGES.flat();
const SERENITE: TypeJauge[] = ["baffeur", "caresseur"];
/** Repères des paliers sur la barre (fin de T1, T2, T3), en part de la charge maximale. */
const REPERES = [80_000, 140_000, 180_000].map((c) => c / CHARGE_MAX);
const CRANS_SIMPLES = [0, ...CRANS.map((c) => c.charge)];
const HAUTEUR = 150;

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
  basculer: () => void;
  regler: (c: number) => void;
}) {
  const barre = useRef<HTMLDivElement>(null);
  const couleur = COULEURS_JAUGE[type];
  const ajuster = (c: number) => {
    const v = Math.max(0, Math.min(CHARGE_MAX, c));
    regler(exacte ? Math.round(v / 1000) * 1000 : CRANS_SIMPLES.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a)));
  };
  const depuisPointeur = (y: number) => {
    const r = barre.current?.getBoundingClientRect();
    if (r) ajuster((1 - (y - r.top) / r.height) * CHARGE_MAX);
  };
  const pas = (sens: 1 | -1) => {
    if (exacte) return ajuster(charge + sens * 5000);
    const i = CRANS_SIMPLES.findIndex((c) => c >= charge);
    ajuster(CRANS_SIMPLES[Math.max(0, Math.min(CRANS_SIMPLES.length - 1, (i < 0 ? CRANS_SIMPLES.length - 1 : i) + sens))]);
  };

  return (
    <div className="flex w-12 flex-col items-center gap-1">
      <div className={`rounded-lg p-1 transition ${actif ? "bg-black/30 ring-2 ring-accent" : "bg-black/20"}`}>
        <div
          ref={barre}
          role="slider"
          tabIndex={modifiable && actif ? 0 : -1}
          aria-label={NOMS_JAUGE[type]}
          aria-valuemin={0}
          aria-valuemax={CHARGE_MAX}
          aria-valuenow={charge}
          title={`${NOMS_JAUGE[type]} : ${charge.toLocaleString("fr-FR")} (${palier(charge)})${modifiable ? (actif ? " · glisse pour régler" : " · clique pour activer") : ""}`}
          className={`relative w-5 overflow-hidden rounded-sm bg-black/60 ${modifiable ? "cursor-ns-resize touch-none" : ""}`}
          style={{ height: HAUTEUR }}
          onPointerDown={(e) => {
            if (!modifiable) return;
            if (!actif) return basculer();
            e.currentTarget.setPointerCapture(e.pointerId);
            depuisPointeur(e.clientY);
          }}
          onPointerMove={(e) => modifiable && actif && e.buttons && depuisPointeur(e.clientY)}
          onKeyDown={(e) => {
            if (!modifiable || !actif) return;
            if (e.key === "ArrowUp") pas(1);
            else if (e.key === "ArrowDown") pas(-1);
            else return;
            e.preventDefault();
          }}
        >
          <div className="absolute inset-x-0 bottom-0 transition-[height] duration-300" style={{ height: `${(charge / CHARGE_MAX) * 100}%`, background: couleur, opacity: actif ? 1 : 0.3 }} />
          {REPERES.map((r) => (
            <div key={r} className="absolute inset-x-0 h-px bg-black/60" style={{ bottom: `${r * 100}%` }} />
          ))}
        </div>
      </div>
      <button
        disabled={!modifiable}
        onClick={basculer}
        title={actif ? "Désactiver cette jauge" : "Activer cette jauge"}
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold transition disabled:cursor-default"
        style={{ borderColor: couleur, color: actif ? "#1a1a1a" : couleur, background: actif ? couleur : "rgba(0,0,0,0.35)" }}
      >
        {SYMBOLES_JAUGE[type]}
      </button>
      <span className={`text-center text-[10px] leading-tight ${actif ? "text-text-secondary" : "text-text-muted"}`}>{actif ? libelleCharge(charge, exacte) : " "}</span>
    </div>
  );
}

function Jauges(props: { charges: Charges; actives: TypeJauge[]; modifiable: boolean; exacte: boolean; basculer: (t: TypeJauge) => void; regler: (t: TypeJauge, c: number) => void }) {
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
              basculer={() => props.basculer(t)}
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

  const aSimuler = { jauges: b.actives.map((t) => ({ type: t, charge: b.charges[t] })), niveauDepart: b.niveauDepart, niveauCible: b.niveauCible };
  const apercu = useMemo(() => simuler(aSimuler), [JSON.stringify(aSimuler)]); // eslint-disable-line react-hooks/exhaustive-deps
  const sim = useMemo(() => (m ? simuler(m) : null), [m]);

  const basculer = (t: TypeJauge) =>
    setB((x) => {
      if (x.actives.includes(t)) return { ...x, actives: x.actives.filter((y) => y !== t) };
      // Baffeur et Caresseur sont liés en jeu : activer l'un coupe l'autre.
      let actives = x.actives.filter((y) => !(SERENITE.includes(t) && SERENITE.includes(y)));
      if (actives.length >= 2) {
        notifier("2 jauges actives au maximum : désactive-en une d'abord", { ton: "info", cle: "jauges" });
        return x;
      }
      actives = [...actives, t];
      return { ...x, actives, charges: { ...x.charges, [t]: x.charges[t] || CRANS[1].charge } };
    });

  const lancer = () => {
    const nouveau: MinuteurEnclos = { enclos: k, debut: new Date().toISOString(), montures: b.montures, jauges: aSimuler.jauges, niveauDepart: b.niveauDepart, niveauCible: b.niveauCible, signales: [] };
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

  return (
    <section className={`flex flex-col gap-3 rounded-xl border bg-bg-secondary p-3 ${termine ? "border-status-ok" : enCours ? "border-accent/60" : "border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Enclos {k}</h3>
        <span className="text-xs text-text-muted">{(enCours ? m.jauges.length : b.actives.length)}/2 jauges activées</span>
      </div>

      <Jauges
        charges={chargesAffichees}
        actives={enCours ? m.jauges.map((j) => j.type) : b.actives}
        modifiable={!enCours}
        exacte={exacte}
        basculer={basculer}
        regler={(t, c) => setB((x) => ({ ...x, charges: { ...x.charges, [t]: c } }))}
      />

      {!enCours && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
          {exacte &&
            b.actives.map((t) => (
              <label key={t} className="flex items-center gap-1.5">
                <span style={{ color: COULEURS_JAUGE[t] }}>{NOMS_JAUGE[t].split(" (")[0]}</span>
                <input
                  type="number"
                  min={0}
                  max={CHARGE_MAX}
                  step={1000}
                  value={b.charges[t]}
                  onChange={(e) => setB((x) => ({ ...x, charges: { ...x.charges, [t]: Math.max(0, Math.min(CHARGE_MAX, Number(e.target.value) || 0)) } }))}
                  className={`${champ} w-24 text-xs`}
                />
              </label>
            ))}
          <label className="flex items-center gap-1.5">
            Montures
            <input type="number" min={1} max={10} value={b.montures} onChange={(e) => setB((x) => ({ ...x, montures: Math.max(1, Math.min(10, Number(e.target.value) || 1)) }))} className={`${champ} w-14 text-xs`} />
          </label>
          {b.actives.includes("mangeoire") && (
            <label className="flex items-center gap-1.5">
              Niveau
              <input type="number" min={1} max={200} value={b.niveauDepart} onChange={(e) => setB((x) => ({ ...x, niveauDepart: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))} className={`${champ} w-14 text-xs`} />
              → visé
              <input type="number" min={1} max={200} value={b.niveauCible} onChange={(e) => setB((x) => ({ ...x, niveauCible: Math.max(1, Math.min(200, Number(e.target.value) || 1)) }))} className={`${champ} w-14 text-xs`} />
            </label>
          )}
        </div>
      )}
      {enCours && (
        <div className="text-xs text-text-secondary">
          {m.montures} monture{m.montures > 1 ? "s" : ""}
          {m.jauges.some((j) => j.type === "mangeoire") && ` · niveau ${m.niveauDepart} → ${m.niveauCible}`}
        </div>
      )}

      <div className="flex flex-col gap-1 text-sm">
        {!b.actives.length && !enCours ? (
          <span className="text-xs text-text-muted">Active les jauges mises en jeu (clic sur l'icône), puis règle leur remplissage en glissant la barre.</span>
        ) : finMs !== undefined ? (
          <span className={termine ? "font-semibold text-status-ok" : enCours ? "font-medium" : "text-status-ok"}>
            {termine ? `Prêt depuis ${heure(finMs)}` : `Prêt à ${heure(finMs)} · dans ${duree((finMs - maintenant) / 1000)}`}
          </span>
        ) : null}
        {evenements
          .filter((e) => e.type !== "fin")
          .map((e) => {
            const t = (enCours ? debut : maintenant) + e.t * 1000;
            return (
              <span key={e.cle} className={`text-xs ${enCours && t <= maintenant ? "text-text-muted line-through" : "text-status-warn"}`}>
                {e.t <= 10 && !enCours ? "Tout de suite" : heure(t)} : {e.texte}
              </span>
            );
          })}
      </div>

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
            {lireRelais() && <span className="text-xs text-text-muted">Discord programmé</span>}
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
          Les montures sont supposées partir de 0. Leur nombre ne change pas la durée : chaque monture gagne autant et la jauge se vide pareil. Notifications et saisie des
          jauges : Paramètres.
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: nb }, (_, i) => (
          <CarteEnclos key={i + 1} k={i + 1} s={s} setS={setS} />
        ))}
      </div>
    </div>
  );
}
