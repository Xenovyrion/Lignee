// Cartes de « À faire maintenant » : une par action (naissance, clonage, préparation, capture),
// numérotées, avec une saisie groupée des résultats constatés en jeu.
import { useState, type ReactNode } from "react";
import { clonerPlusieurs, enregistrerNaissances, type Bebe } from "../../moteur/actions";
import type { ActionAccouplement, ActionCapture } from "../../moteur/conseils";
import { couleur, nomCouleur } from "../../moteur/donnees";
import { ajusterStock, rendreFecondes } from "../../moteur/etable";
import type { GroupeClonage } from "../../moteur/planificateur";
import type { Famille, Makina, Monture, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, ChoixCouleur, champ, pourcent, sexeSymbole } from "../../ui";
import { ImageMonture } from "../arbre/commun";

type SetS = (f: (s: Sauvegarde) => Sauvegarde) => void;

export const NOM_MAKINA: Record<Makina, string> = { optimakina: "Optimakina", animakina: "Animakina", kromakina: "Kromakina" };

export const TYPES = {
  naissance: { libelle: "Naissance", teinte: "#22c55e" },
  clonage: { libelle: "Clonage", teinte: "#a78bfa" },
  preparer: { libelle: "Préparer", teinte: "#d4a017" },
  capture: { libelle: "Capture", teinte: "#60a5fa" },
} as const;

const couleurSexe = (s: Sexe) => (s === "M" ? "text-sky-400" : "text-pink-400");

/** Cadre commun : numéro, type d'action, nombre de fois, contenu, bouton d'action et formulaire. */
function CadreAction(p: {
  id?: string;
  numero: number;
  type: keyof typeof TYPES;
  nombre?: number;
  attente?: boolean;
  children: ReactNode;
  droite?: ReactNode;
  pied?: ReactNode;
  formulaire?: ReactNode;
}) {
  const t = TYPES[p.type];
  return (
    <li id={p.id} className={`scroll-mt-4 rounded-xl border bg-bg-secondary p-3 ${p.attente ? "border-border opacity-60" : "border-border-light"}`} style={{ borderLeft: `4px solid ${t.teinte}` }}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-black" style={{ background: t.teinte }}>
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
      {p.pied && <div className="mt-2 flex flex-wrap gap-x-4 pl-[8.5rem] text-xs text-text-muted">{p.pied}</div>}
      {p.formulaire}
    </li>
  );
}

/** Compteur − n + */
function Compteur({ valeur, setValeur, min = 0, max = 99, teinte }: { valeur: number; setValeur: (n: number) => void; min?: number; max?: number; teinte?: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border-light bg-bg-card">
      <button type="button" disabled={valeur <= min} onClick={() => setValeur(valeur - 1)} className="px-2 py-1 text-text-muted hover:text-text-primary disabled:opacity-25">
        −
      </button>
      <span className={`w-6 text-center font-bold ${teinte ?? ""}`}>{valeur}</span>
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
const versListe = (l: Ligne[]) => l.flatMap((x) => [...Array(x.M).fill({ couleur: x.couleur, sexe: "M" }), ...Array(x.F).fill({ couleur: x.couleur, sexe: "F" })]) as { couleur: string; sexe: Sexe }[];

function SaisieResultats({ famille, lignes, setLignes, couleursFixes }: { famille: Famille; lignes: Ligne[]; setLignes: (l: Ligne[]) => void; couleursFixes?: boolean }) {
  const maj = (i: number, champs: Partial<Ligne>) => setLignes(lignes.map((x, j) => (j === i ? { ...x, ...champs } : x)));
  return (
    <div className="flex flex-col gap-1.5">
      {lignes.map((l, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          {couleursFixes ? (
            <span className="flex w-52 items-center gap-1.5">
              <ImageMonture famille={famille} id={l.couleur} taille={24} />
              {nomCouleur(famille, l.couleur)}
            </span>
          ) : (
            <ChoixCouleur famille={famille} value={l.couleur} onChange={(e) => maj(i, { couleur: e.target.value })} className="w-52" />
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
        <button className="self-start text-xs text-accent hover:underline" onClick={() => setLignes([...lignes, { couleur: lignes[0].couleur, M: 0, F: 0 }])}>
          + une autre couleur obtenue (croisement raté)
        </button>
      )}
    </div>
  );
}

const Formulaire = ({ children }: { children: ReactNode }) => <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 text-sm">{children}</div>;

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

export function CarteNaissance({ id, numero, famille, a, prevues, setS, niveauBebes }: { id?: string; numero: number; famille: Famille; a: ActionAccouplement; prevues: number; setS: SetS; niveauBebes: number }) {
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
      attente={!pret}
      droite={
        <>
          <div className="text-right">
            <div className={`text-2xl font-bold ${a.makina.chance >= 1 ? "text-status-ok" : a.makina.chance >= 0.8 ? "text-text-primary" : "text-status-warn"}`}>{pourcent(a.makina.chance)}</div>
            <div className="text-xs text-text-secondary">avec {NOM_MAKINA[a.makina.makina]}</div>
          </div>
          <Bouton discret={!pret || ouvert} onClick={() => setOuvert(!ouvert)}>
            {ouvert ? "Annuler" : "Enregistrer"}
          </Bouton>
        </>
      }
      pied={
        <>
          {!pret && <span className="text-accent">Après la préparation des parents (jauges)</span>}
          {a.makina.makina === "animakina" && <span>Animakina : {a.makina.raison}</span>}
          {a.niveauConseille && (
            <span>
              Pour 100 % avec Optimakina : niveaux cumulés {a.niveauConseille} (actuellement {a.pere.niveau + a.mere.niveau})
            </span>
          )}
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

function FormNaissances({ famille, a, setS, niveauBebes, fermer }: { famille: Famille; a: ActionAccouplement; setS: SetS; niveauBebes: number; fermer: () => void }) {
  // Par défaut 1 bébé par accouplement ; avec Reproducteur, le nombre d'accouplements est saisi à part.
  const [reproducteur, setReproducteur] = useState(false);
  const [nSaisi, setN] = useState(a.nombre);
  const [lignes, setLignes] = useState<Ligne[]>([{ couleur: a.e.couleur, ...repartir(a.nombre, a.e.sexeVoulu) }]);
  const [makina, setMakina] = useState<Makina | "">(a.makina.makina);
  const bebes = total(lignes);
  const n = reproducteur ? nSaisi : Math.min(bebes, a.nombre);
  const ok = n >= 1 && bebes >= n && bebes <= 2 * n;
  const valider = () => {
    try {
      const paires = a.paires.slice(0, n).map((p) => ({ pereId: p.pere.id, mereId: p.mere.id }));
      setS((s) => enregistrerNaissances(s, paires, versListe(lignes) as Bebe[], makina || undefined, niveauBebes));
      fermer();
    } catch (err) {
      alert((err as Error).message);
    }
  };
  return (
    <Formulaire>
      <div className="text-text-secondary">
        Bébés obtenus <span className="text-xs text-text-muted">— un par accouplement fait (échec = la couleur réellement obtenue)</span>
      </div>
      <SaisieResultats famille={famille} lignes={lignes} setLignes={setLignes} />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" checked={reproducteur} onChange={(e) => setReproducteur(e.target.checked)} />
          Reproducteur (2 bébés pour un accouplement)
        </label>
        {reproducteur && (
          <>
            <span className="text-text-secondary">Accouplements faits</span>
            <Compteur valeur={nSaisi} setValeur={setN} min={1} max={a.nombre} />
          </>
        )}
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
            : bebes > a.nombre && !reproducteur
              ? ` : ${a.nombre} accouplements au plus ici (coche Reproducteur si un accouplement a donné 2 bébés).`
              : ` : il en faut entre ${n} et ${2 * n}.`}
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

function FormClonages({ famille, g, setS, fermer }: { famille: Famille; g: GroupeClonage; setS: SetS; fermer: () => void }) {
  const n0 = g.paires.length;
  const [lignes, setLignes] = useState<Ligne[]>(
    g.memeCouleur ? [{ couleur: g.couleurs[0], ...repartir(n0) }] : g.couleurs.map((c, i) => ({ couleur: c, ...repartir(i === 0 ? Math.ceil(n0 / 2) : Math.floor(n0 / 2)) })),
  );
  const n = total(lignes);
  const valider = () => {
    try {
      const paires = g.paires.slice(0, n).map((p) => ({ idA: p.a.id, idB: p.b.id }));
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
  return (
    <CadreAction id={id} numero={numero} type="preparer" nombre={nb} pied={<span>Remplis Endurance, Maturité et Amour en enclos (≈ {Math.ceil(nb / 10)} enclos de 10), puis clique « ✓ Prêtes ».</span>}>
      <ul className="flex flex-1 flex-wrap gap-2">
        {groupes.map((g) => (
          <li key={`${g.couleur}/${g.sexe}`} className="flex items-center gap-2 rounded-lg border border-border-light bg-bg-card py-1 pl-1 pr-1.5 text-sm">
            <ImageMonture famille={famille} id={g.couleur} taille={32} />
            <span>
              {nomCouleur(famille, g.couleur)} <span className={couleurSexe(g.sexe)}>{sexeSymbole(g.sexe)}</span>
              <b className="ml-1">×{g.montures.length}</b>
            </span>
            <Bouton
              discret
              className="px-2! py-0.5!"
              onClick={() => setS((s) => rendreFecondes(s, famille, g.couleur, g.sexe, g.montures.length, new Set(g.montures.map((m) => m.id))))}
              title="Jauges remplies en jeu : passer ces montures en « Féconde »"
            >
              ✓ Prêtes
            </Bouton>
          </li>
        ))}
      </ul>
    </CadreAction>
  );
}

// ---------------------------------------------------------------------------------------------

export function CarteCapture({ id, numero, famille, capture, setS, niveau }: { id?: string; numero: number; famille: Famille; capture: ActionCapture; setS: SetS; niveau: number }) {
  const [ouvert, setOuvert] = useState(false);
  const [lignes, setLignes] = useState<Ligne[]>([{ couleur: capture.couleur, ...repartir(capture.nombre, capture.sexe) }]);
  const valider = () => {
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
        <Bouton discret={ouvert} onClick={() => setOuvert(!ouvert)}>
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
            {nomCouleur(famille, capture.couleur)} {capture.sexe && <span className={couleurSexe(capture.sexe)}>{sexeSymbole(capture.sexe)}</span>}
          </div>
          <div className="text-xs text-text-secondary">Génération 1 · à capturer au filet (métier Éleveur)</div>
        </div>
      </div>
    </CadreAction>
  );
}
