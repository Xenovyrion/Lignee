// Cartes de « À faire maintenant » : une par action (naissance, clonage, préparation, capture),
// numérotées, avec une saisie groupée des résultats constatés en jeu.
import { useState, type ReactNode } from "react";
import { clonerPlusieurs, enregistrerNaissances, type Bebe } from "../../moteur/actions";
import type { ActionAccouplement, ActionCapture } from "../../moteur/conseils";
import { couleur, nomCouleur } from "../../moteur/donnees";
import { ajusterStock } from "../../moteur/etable";
import type { GroupeClonage } from "../../moteur/planificateur";
import type { Famille, Makina, Monture, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, ChampNombre, champ, pourcent, sexeSymbole } from "../../ui";
import { ChoixCouleur } from "../ChoixCouleur";
import { useNotifier } from "../../notifications";
import { ImageMonture } from "../arbre/commun";
import { NOM_MAKINA, preparationParGeneration, TYPES, useRendrePretes, useToutesPretes } from "./typesActions";

type SetS = (f: (s: Sauvegarde) => Sauvegarde) => void;

const couleurSexe = (s: Sexe) => (s === "M" ? "text-sky-400" : "text-pink-400");

/** Cadre commun : numéro, type d'action, nombre de fois, contenu, bouton d'action et formulaire. */
function CadreAction(p: {
  id?: string;
  numero: number;
  type: keyof typeof TYPES;
  nombre?: number;
  /** Action pas encore faisable : fond hachuré et bandeau avec ce texte. */
  attente?: string;
  children: ReactNode;
  droite?: ReactNode;
  pied?: ReactNode;
  formulaire?: ReactNode;
}) {
  const t = TYPES[p.type];
  // La première action faisable est mise en avant : halo de sa couleur et numéro qui pulse.
  const vedette = p.numero === 1 && !p.attente;
  return (
    <li
      id={p.id}
      data-type={p.type}
      className={`apparition scroll-mt-4 rounded-xl border p-3 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.4)] ${p.attente ? "hachure border-border" : "border-border-light bg-bg-secondary"} ${vedette ? "halo" : ""}`}
      style={{ borderLeft: `4px solid ${p.attente ? "rgba(255,255,255,0.15)" : t.teinte}`, animationDelay: `${Math.min(p.numero, 12) * 45}ms`, ["--halo" as string]: t.teinte }}
    >
      {p.attente && (
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-accent">
          <span className="rounded-full border border-accent/40 bg-bg-primary/80 px-2 py-0.5">⏳ Pas encore faisable</span>
          <span className="text-text-secondary">{p.attente}</span>
        </div>
      )}
      <div className={`flex flex-wrap items-center gap-3 ${p.attente ? "opacity-55 grayscale-[40%]" : ""}`}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black ${vedette ? "pulsation" : ""}`} style={{ background: t.teinte }}>
          {p.numero}
        </span>
        <div className="flex w-24 shrink-0 flex-col">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.teinte }}>
            {t.libelle}
          </span>
          {p.nombre !== undefined && (
            <span className="text-2xl font-bold leading-7" title={`À faire ${p.nombre} fois`}>
              ×{p.nombre}
            </span>
          )}
        </div>
        {p.children}
        {p.droite}
      </div>
      {p.pied && <div className="mt-2 flex flex-wrap gap-x-4 sm:pl-[8.5rem] text-xs text-text-muted">{p.pied}</div>}
      {p.formulaire}
    </li>
  );
}

/** Mini-jauge circulaire de chance : rouge (30 %) → doré → vert (100 %). */
function JaugeChance({ p }: { p: number }) {
  const taille = 50;
  const ep = 5;
  const r = (taille - ep) / 2;
  const c = 2 * Math.PI * r;
  const teinte = `hsl(${Math.round(Math.max(0, Math.min(1, (p - 0.3) / 0.7)) * 120)} 75% 52%)`;
  return (
    <div className="relative" style={{ width: taille, height: taille }} title={`${pourcent(p)} de chances d'obtenir la couleur visée`}>
      <svg width={taille} height={taille} className="-rotate-90">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={ep} />
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={teinte} strokeWidth={ep} strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} style={{ filter: `drop-shadow(0 0 4px ${teinte})` }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color: teinte }}>
        {Math.round(p * 100)}%
      </span>
    </div>
  );
}

/** Compteur − n + */
function Compteur({ valeur, setValeur, min = 0, max = 99, teinte }: { valeur: number; setValeur: (n: number) => void; min?: number; max?: number; teinte?: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border-light bg-bg-card">
      <button type="button" disabled={valeur <= min} onClick={() => setValeur(valeur - 1)} className="px-2 py-1 text-text-muted hover:text-text-primary disabled:opacity-25">
        −
      </button>
      <ChampNombre valeur={valeur} setValeur={setValeur} min={min} max={max} className={teinte} />
      <button type="button" disabled={valeur >= max} onClick={() => setValeur(valeur + 1)} className="px-2 py-1 text-text-muted hover:text-text-primary disabled:opacity-25">
        +
      </button>
    </span>
  );
}

/** Lignes « couleur : ♂ n · ♀ n » pour saisir des résultats groupés. */
interface Ligne {
  couleur: string;
  M: number;
  F: number;
}
const total = (l: Ligne[]) => l.reduce((n, x) => n + x.M + x.F, 0);
const resumer = (famille: Famille, l: Ligne[]) =>
  l
    .filter((x) => x.M + x.F > 0)
    .map((x) => `${nomCouleur(famille, x.couleur)} ${[x.M && `${x.M} ♂`, x.F && `${x.F} ♀`].filter(Boolean).join(" ")}`)
    .join(", ");
const versListe = (l: Ligne[]) => l.flatMap((x) => [...Array(x.M).fill({ couleur: x.couleur, sexe: "M" }), ...Array(x.F).fill({ couleur: x.couleur, sexe: "F" })]) as { couleur: string; sexe: Sexe }[];

function SaisieResultats({
  famille,
  lignes,
  setLignes,
  couleursFixes,
  ajouterAutre,
  probables,
}: {
  famille: Famille;
  lignes: Ligne[];
  setLignes: (l: Ligne[]) => void;
  couleursFixes?: boolean;
  /** Ajout d'une couleur obtenue à la place de celle visée (croisement raté). */
  ajouterAutre?: () => void;
  /** Couleurs les plus probables en cas de croisement raté (arbre des parents), en tête de liste. */
  probables?: string[];
}) {
  const maj = (i: number, champs: Partial<Ligne>) => setLignes(lignes.map((x, j) => (j === i ? { ...x, ...champs } : x)));
  return (
    <div className="flex flex-col gap-1.5">
      {lignes.map((l, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          {!couleursFixes && lignes.length > 1 && (
            <span className={`w-14 text-[11px] font-semibold uppercase tracking-wide ${i === 0 ? "text-status-ok" : "text-orange-400"}`}>{i === 0 ? "visé" : "raté →"}</span>
          )}
          {couleursFixes ? (
            <span className="flex w-52 items-center gap-1.5">
              <ImageMonture famille={famille} id={l.couleur} taille={24} />
              {nomCouleur(famille, l.couleur)}
            </span>
          ) : (
            <ChoixCouleur famille={famille} valeur={l.couleur} onChange={(v) => maj(i, { couleur: v })} suggestions={i > 0 ? probables : undefined} className="w-56" />
          )}
          <span className="text-sky-400">♂</span>
          <Compteur valeur={l.M} setValeur={(M) => maj(i, { M })} teinte="text-sky-400" />
          <span className="text-pink-400">♀</span>
          <Compteur valeur={l.F} setValeur={(F) => maj(i, { F })} teinte="text-pink-400" />
          {!couleursFixes && lignes.length > 1 && (
            <button className="text-xs text-text-muted hover:text-status-err" onClick={() => setLignes(lignes.filter((_, j) => j !== i))}>
              retirer
            </button>
          )}
        </div>
      ))}
      {!couleursFixes && (
        <button
          className="mt-1 flex items-center gap-2 self-start rounded-lg border border-orange-400/50 bg-orange-400/10 px-3 py-1.5 text-sm font-medium text-orange-300 transition hover:bg-orange-400/20"
          onClick={ajouterAutre ?? (() => setLignes([...lignes, { couleur: lignes[0].couleur, M: 0, F: 0 }]))}
        >
          <span className="text-base leading-none">✗</span>
          Croisement raté ? Indiquer la couleur obtenue à la place
        </button>
      )}
    </div>
  );
}

const Formulaire = ({ children, tuto }: { children: ReactNode; tuto?: string }) => <div data-tuto={tuto} className="mt-3 flex flex-col gap-3 border-t border-border pt-3 text-sm">{children}</div>;

const repartir = (n: number, sexe?: Sexe) => (sexe === "M" ? { M: n, F: 0 } : sexe === "F" ? { M: 0, F: n } : { M: Math.ceil(n / 2), F: Math.floor(n / 2) });

// ---------------------------------------------------------------------------------------------

const Parent = ({ famille, couleurId, sexe, niveau }: { famille: Famille; couleurId: string; sexe: Sexe; niveau?: number }) => (
  <div className="flex w-24 flex-col items-center text-center">
    <ImageMonture famille={famille} id={couleurId} taille={44} />
    <span className="text-[11px] leading-tight">{nomCouleur(famille, couleurId)}</span>
    <span className="text-[11px] text-text-muted">
      <span className={couleurSexe(sexe)}>{sexeSymbole(sexe)}</span>
      {niveau !== undefined && ` niv. ${niveau}`}
    </span>
  </div>
);

export function CarteNaissance({
  id,
  numero,
  famille,
  a,
  prevues,
  setS,
  niveauBebes,
  etapePreparer,
}: {
  id?: string;
  numero: number;
  famille: Famille;
  a: ActionAccouplement;
  prevues: number;
  setS: SetS;
  niveauBebes: number;
  /** Numéro de l'étape « Préparer » dont dépend cette naissance. */
  etapePreparer?: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const pret = a.aPreparer.length === 0;
  const { e } = a;
  const raison = a.termineSucces ? `termine le succès G${e.generation}` : e.pour === "succes" ? "nouvelle couleur" : "pour la suite";
  return (
    <CadreAction
      id={id}
      numero={numero}
      type="naissance"
      nombre={a.nombre}
      attente={
        pret
          ? undefined
          : `Remplir d'abord les jauges de : ${[...new Set(a.aPreparer.map((m) => `${nomCouleur(famille, m.couleur)} ${sexeSymbole(m.sexe)}`))].join(", ")}${etapePreparer ? ` (étape ${etapePreparer})` : ""}.`
      }
      droite={
        <>
          <div
            data-tuto="chance"
            className="flex cursor-help items-center gap-2"
            title={`${NOM_MAKINA[a.makina.makina]} : ${a.makina.raison}.${
              a.niveauConseille ? `
Pour 100 % avec Optimakina : niveaux cumulés ${a.niveauConseille} (actuellement ${a.pere.niveau + a.mere.niveau}).` : ""
            }`}
          >
            <JaugeChance p={a.makina.chance} />
            <div className="text-xs text-text-secondary">
              de réussite
              <br />
              avec {NOM_MAKINA[a.makina.makina]}
            </div>
          </div>
          <Bouton data-tuto="enregistrer" discret={!pret || ouvert} onClick={() => setOuvert(!ouvert)}>
            {ouvert ? "Annuler" : "Enregistrer"}
          </Bouton>
        </>
      }
      formulaire={ouvert && <FormNaissances famille={famille} a={a} setS={setS} niveauBebes={niveauBebes} fermer={() => setOuvert(false)} />}
    >
      <Parent famille={famille} couleurId={a.pere.couleur} sexe="M" niveau={a.pere.niveau} />
      <span className="text-lg text-text-muted">×</span>
      <Parent famille={famille} couleurId={a.mere.couleur} sexe="F" niveau={a.mere.niveau} />
      <span className="text-xl text-accent">→</span>
      <div className="flex min-w-[180px] flex-1 items-center gap-3">
        <ImageMonture famille={famille} id={e.couleur} taille={60} />
        <div>
          <div className="font-semibold">
            {nomCouleur(famille, e.couleur)} <span className="text-sm font-normal text-text-muted">G{e.generation}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className={`rounded-sm px-1.5 ${a.termineSucces ? "bg-status-ok/15 text-status-ok" : e.pour === "succes" ? "bg-accent-dim text-accent" : "bg-bg-hover text-text-secondary"}`}>{raison}</span>
            {prevues > a.nombre && (
              <span className="rounded-sm bg-bg-hover px-1.5 text-text-secondary" title="Naissances de cette couleur prévues sur l'ensemble du plan">
                {prevues} au total
              </span>
            )}
            {e.sexeVoulu && <span className="text-text-secondary">viser {e.sexeVoulu === "M" ? "des mâles ♂" : "des femelles ♀"}</span>}
          </div>
          {a.debloque > 0 && <div className="text-[11px] text-text-muted">débloque {a.debloque} étape{a.debloque > 1 ? "s" : ""}</div>}
        </div>
      </div>
    </CadreAction>
  );
}

export function FormNaissances({ famille, a, setS, niveauBebes, fermer }: { famille: Famille; a: ActionAccouplement; setS: SetS; niveauBebes: number; fermer: () => void }) {
  // Un bébé par accouplement fait : un croisement raté REMPLACE le bébé visé, il ne s'y ajoute pas.
  // Seule la capacité Reproducteur permet 2 bébés pour un même accouplement.
  const [reproducteur, setReproducteur] = useState(false);
  const [n, setNombre] = useState(a.nombre);
  const [lignes, setLignes] = useState<Ligne[]>([{ couleur: a.e.couleur, ...repartir(a.nombre, a.e.sexeVoulu) }]);
  const [makina, setMakina] = useState<Makina | "">(a.makina.makina);
  const bebes = total(lignes);
  const notifier = useNotifier();
  const ok = n >= 1 && (reproducteur ? bebes >= n && bebes <= 2 * n : bebes === n);

  /** Change le nombre d'accouplements faits : la ligne de la couleur visée suit. */
  const changerNombre = (v: number) => {
    const autres = total(lignes.slice(1));
    const vise = Math.max(0, v - autres);
    setNombre(v);
    setLignes([{ ...lignes[0], ...repartir(vise, a.e.sexeVoulu) }, ...lignes.slice(1)]);
  };
  /** Croisement raté : un bébé passe de la couleur visée à une autre (à choisir), du même sexe. */
  // En cas d'échec, le bébé prend surtout une couleur de l'arbre : les parents, puis leurs propres parents.
  const probables = [a.pere.couleur, a.mere.couleur, ...(a.pere.parents ?? []), ...(a.mere.parents ?? [])].filter((c) => c !== a.e.couleur);
  const ajouterEchec = () => {
    const [vise, ...autres] = lignes;
    // Avec Reproducteur, le bébé raté peut venir en plus du bébé réussi (jumeaux) : rien n'est retiré.
    if (reproducteur && total(lignes) < 2 * n) {
      const candidate = a.pere.couleur !== a.e.couleur ? a.pere.couleur : a.mere.couleur;
      setLignes([...lignes, { couleur: candidate, M: 0, F: 1 }]);
      return;
    }
    const sexe: Sexe = vise.M >= vise.F ? "M" : "F";
    const retire = vise[sexe] > 0 ? { ...vise, [sexe]: vise[sexe] - 1 } : vise;
    const candidate = a.pere.couleur !== a.e.couleur ? a.pere.couleur : a.mere.couleur;
    setLignes([retire, ...autres, { couleur: candidate, M: sexe === "M" ? 1 : 0, F: sexe === "F" ? 1 : 0 }]);
  };
  const valider = () => {
    try {
      const paires = a.paires.slice(0, n).map((p) => ({ pereId: p.pere.id, mereId: p.mere.id }));
      notifier(`${n > 1 ? `${n} naissances enregistrées` : "Naissance enregistrée"} : ${resumer(famille, lignes)}`, { annulable: true });
      setS((s) => enregistrerNaissances(s, paires, versListe(lignes) as Bebe[], makina || undefined, niveauBebes));
      fermer();
    } catch (err) {
      alert((err as Error).message);
    }
  };
  return (
    <Formulaire tuto="form-naissance">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-text-secondary">Accouplements faits</span>
        <Compteur valeur={n} setValeur={changerNombre} min={1} max={a.nombre} />
        <span className="text-xs text-text-muted">sur {a.nombre} proposé{a.nombre > 1 ? "s" : ""}</span>
      </div>
      <div className="text-text-secondary">
        Bébés obtenus{" "}
        <span className="text-xs text-text-muted">
          {reproducteur
            ? "— jusqu'à 2 par accouplement avec Reproducteur ; chaque bébé est réussi ou raté indépendamment"
            : "— un par accouplement ; un croisement raté remplace le bébé visé"}
        </span>
      </div>
      <SaisieResultats famille={famille} lignes={lignes} setLignes={setLignes} ajouterAutre={ajouterEchec} probables={probables} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" checked={reproducteur} onChange={(e) => setReproducteur(e.target.checked)} />
          Reproducteur (un accouplement a donné 2 bébés)
        </label>
        <label className="ml-4 flex items-center gap-2 text-text-secondary">
          Makina
          <select className={champ} value={makina} onChange={(e) => setMakina(e.target.value as Makina | "")}>
            {Object.entries(NOM_MAKINA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
            <option value="">Aucune</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Bouton onClick={valider} disabled={!ok}>
          Valider
        </Bouton>
        <span className={`text-xs ${ok ? "text-text-muted" : "text-status-warn"}`}>
          {bebes} bébé{bebes > 1 ? "s" : ""} pour {n} accouplement{n > 1 ? "s" : ""}
          {ok
            ? ` · ${2 * n} parents passent stériles, les nouvelles couleurs sont cochées.`
            : reproducteur
              ? ` : il en faut entre ${n} et ${2 * n}.`
              : bebes > n
                ? ` : ${bebes - n} de trop. Un croisement raté remplace le bébé visé (retire-le de la première ligne), sauf Reproducteur.`
                : ` : il manque ${n - bebes} bébé${n - bebes > 1 ? "s" : ""}.`}
        </span>
      </div>
    </Formulaire>
  );
}

// ---------------------------------------------------------------------------------------------

export function CarteClonage({ id, numero, famille, g, setS }: { id?: string; numero: number; famille: Famille; g: GroupeClonage; setS: SetS }) {
  const [ouvert, setOuvert] = useState(false);
  const [a, b] = g.couleurs;
  return (
    <CadreAction
      id={id}
      numero={numero}
      type="clonage"
      nombre={g.paires.length}
      droite={
        <Bouton discret={ouvert} onClick={() => setOuvert(!ouvert)}>
          {ouvert ? "Annuler" : "Enregistrer"}
        </Bouton>
      }
      formulaire={ouvert && <FormClonages famille={famille} g={g} setS={setS} fermer={() => setOuvert(false)} />}
    >
      <Parent famille={famille} couleurId={a} sexe={g.paires[0].a.sexe} />
      <span className="text-lg text-text-muted">+</span>
      <Parent famille={famille} couleurId={b} sexe={g.paires[0].b.sexe} />
      <span className="text-xl text-accent">→</span>
      <div className="flex min-w-[180px] flex-1 items-center gap-3">
        <ImageMonture famille={famille} id={a} taille={60} />
        {!g.memeCouleur && <ImageMonture famille={famille} id={b} taille={60} />}
        <div>
          <div className="font-semibold">{g.memeCouleur ? `1 ${nomCouleur(famille, a)} fertile` : `1 ${nomCouleur(famille, a)} ou ${nomCouleur(famille, b)}`}</div>
          <div className="text-xs text-text-secondary">
            par paire de stériles (G{couleur(famille, a).generation}) ·{" "}
            <span className={g.memeCouleur ? "text-status-ok" : "text-status-warn"}>{g.memeCouleur ? "résultat certain" : "couleur à 50/50"}</span>
          </div>
        </div>
      </div>
    </CadreAction>
  );
}

export function FormClonages({ famille, g, setS, fermer }: { famille: Famille; g: GroupeClonage; setS: SetS; fermer: () => void }) {
  const n0 = g.paires.length;
  const [lignes, setLignes] = useState<Ligne[]>(
    g.memeCouleur ? [{ couleur: g.couleurs[0], ...repartir(n0) }] : g.couleurs.map((c, i) => ({ couleur: c, ...repartir(i === 0 ? Math.ceil(n0 / 2) : Math.floor(n0 / 2)) })),
  );
  const n = total(lignes);
  const notifier = useNotifier();
  const valider = () => {
    try {
      const paires = g.paires.slice(0, n).map((p) => ({ idA: p.a.id, idB: p.b.id }));
      notifier(`${n > 1 ? `${n} clonages enregistrés` : "Clonage enregistré"} : ${resumer(famille, lignes)}`, { annulable: true });
      setS((s) => clonerPlusieurs(s, paires, versListe(lignes)));
      fermer();
    } catch (err) {
      alert((err as Error).message);
    }
  };
  return (
    <Formulaire>
      <div className="text-text-secondary">Clones obtenus (un par paire de stériles)</div>
      <SaisieResultats famille={famille} lignes={lignes} setLignes={setLignes} couleursFixes />
      <div className="flex flex-wrap items-center gap-3">
        <Bouton onClick={valider} disabled={n < 1 || n > n0}>
          Valider
        </Bouton>
        <span className={`text-xs ${n >= 1 && n <= n0 ? "text-text-muted" : "text-status-warn"}`}>
          {n} clonage{n > 1 ? "s" : ""} sur {n0} possibles · les stériles utilisés sont retirés de l'étable.
        </span>
      </div>
    </Formulaire>
  );
}

// ---------------------------------------------------------------------------------------------

export function CartePreparer({ id, numero, famille, groupes, setS }: { id?: string; numero: number; famille: Famille; groupes: { couleur: string; sexe: Sexe; montures: Monture[] }[]; setS: SetS }) {
  const nb = groupes.reduce((n, g) => n + g.montures.length, 0);
  const rendrePretes = useRendrePretes(famille, setS);
  const toutesPretes = useToutesPretes(famille, setS);
  return (
    <CadreAction
      id={id}
      numero={numero}
      type="preparer"
      nombre={nb}
      droite={
        <Bouton onClick={() => toutesPretes(groupes)} title="Toutes les jauges sont remplies : tout passer en Féconde">
          ✓ Toutes prêtes ({nb})
        </Bouton>
      } pied={<span>Remplis Endurance, Maturité et Amour en enclos (≈ {Math.ceil(nb / 10)} enclos de 10), puis clique « ✓ » quand elles sont prêtes.</span>}>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {preparationParGeneration(famille, groupes).map(({ generation, couleurs }) => (
          <div key={generation} className="flex flex-wrap items-center gap-2">
            <span className="w-9 shrink-0 text-xs font-semibold text-accent">G{generation}</span>
            {couleurs.map((c) => (
              <div key={c.couleur} className="flex items-center gap-2 rounded-lg border border-border-light bg-bg-card py-1 pl-1 pr-1.5 text-sm">
                <ImageMonture famille={famille} id={c.couleur} taille={32} />
                <span className="font-medium">{nomCouleur(famille, c.couleur)}</span>
                {(["M", "F"] as Sexe[])
                  .filter((sexe) => c[sexe].length)
                  .map((sexe) => (
                    <button
                      key={sexe}
                      onClick={() => rendrePretes(c.couleur, c[sexe])}
                      title={`Jauges remplies : passer ${c[sexe].length > 1 ? `ces ${c[sexe].length} ${sexe === "M" ? "mâles" : "femelles"}` : `ce${sexe === "M" ? " mâle" : "tte femelle"}`} en Féconde`}
                      className={`flex items-center gap-1 rounded-md border border-border-light px-1.5 py-0.5 text-xs font-semibold transition hover:border-status-ok hover:bg-status-ok/15 ${couleurSexe(sexe)}`}
                    >
                      {sexeSymbole(sexe)} ×{c[sexe].length}
                      <span className="text-status-ok">✓</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </CadreAction>
  );
}

// ---------------------------------------------------------------------------------------------

export function CarteCapture({ id, numero, famille, capture, setS, niveau }: { id?: string; numero: number; famille: Famille; capture: ActionCapture; setS: SetS; niveau: number }) {
  const [ouvert, setOuvert] = useState(false);
  const prevues = (): Ligne[] => [{ couleur: capture.couleur, M: capture.M + Math.ceil(capture.libres / 2), F: capture.F + Math.floor(capture.libres / 2) }];
  const [lignes, setLignes] = useState<Ligne[]>(prevues);
  const notifier = useNotifier();
  const valider = () => {
    notifier(`${total(lignes)} ${nomCouleur(famille, capture.couleur)} ajoutée${total(lignes) > 1 ? "s" : ""} à l'étable`, { annulable: true });
    setS((s) => {
      let r = ajusterStock(s, famille, capture.couleur, "M", "fertile", lignes[0].M, niveau);
      r = ajusterStock(r, famille, capture.couleur, "F", "fertile", lignes[0].F, niveau);
      return r;
    });
    setOuvert(false);
  };
  return (
    <CadreAction
      id={id}
      numero={numero}
      type="capture"
      nombre={capture.nombre}
      droite={
        <Bouton
          discret={ouvert}
          onClick={() => {
            // À l'ouverture, repartir des nombres actuels du plan (ils changent après chaque saisie).
            if (!ouvert) setLignes(prevues());
            setOuvert(!ouvert);
          }}
        >
          {ouvert ? "Annuler" : "Capturé"}
        </Bouton>
      }
      formulaire={
        ouvert && (
          <Formulaire>
            <SaisieResultats famille={famille} lignes={lignes} setLignes={setLignes} couleursFixes />
            <div>
              <Bouton onClick={valider} disabled={total(lignes) < 1}>
                Ajouter à l'étable
              </Bouton>
            </div>
          </Formulaire>
        )
      }
    >
      <div className="flex flex-1 items-center gap-3">
        <ImageMonture famille={famille} id={capture.couleur} taille={52} />
        <div>
          <div className="font-semibold">
            {nomCouleur(famille, capture.couleur)}
            {(["M", "F"] as Sexe[]).map((sx) => capture[sx] > 0 && <span key={sx} className={`ml-2 text-sm ${couleurSexe(sx)}`}>{sexeSymbole(sx)} ×{capture[sx]}</span>)}
            {capture.libres > 0 && <span className="ml-2 text-sm text-text-muted">×{capture.libres} au choix</span>}
          </div>
          <div className="text-xs text-text-secondary">Génération 1 · à capturer au filet (métier Éleveur)</div>
        </div>
      </div>
    </CadreAction>
  );
}
