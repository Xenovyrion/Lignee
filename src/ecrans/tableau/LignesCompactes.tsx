// Vue compacte du tableau de bord : une ligne par action, en colonnes alignées d'une action à l'autre
// (numéro · type · visuel · couleur et détail · chance · boutons). Le formulaire s'ouvre sous la ligne.
import { useState, type ReactNode } from "react";
import type { ActionAccouplement, ActionCapture, ActionMaintenant } from "../../moteur/conseils";
import { couleur, nomCouleur } from "../../moteur/donnees";
import type { GroupeClonage } from "../../moteur/planificateur";
import type { Famille, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, pourcent, sexeSymbole } from "../../ui";
import { ImageMonture } from "../arbre/commun";
import { FormCaptures, FormClonages, FormNaissances } from "./CartesActions";
import { NOM_MAKINA, preparationParGeneration, TYPES, useRendrePretes, useToutesPretes, type GroupePreparer } from "./typesActions";

type SetS = (f: (s: Sauvegarde) => Sauvegarde) => void;

const IMG = 34;
const couleurSexe = (s: Sexe) => (s === "M" ? "text-sky-400" : "text-pink-400");

/** Ligne commune : les colonnes ont la même largeur pour toutes les actions. */
function Ligne(p: {
  numero: number;
  type: keyof typeof TYPES;
  nombre: number;
  attente?: string;
  visuel: ReactNode;
  titre: ReactNode;
  detail?: ReactNode;
  chance?: ReactNode;
  actions?: ReactNode;
  formulaire?: ReactNode;
}) {
  const t = TYPES[p.type];
  return (
    <div
      className={`apparition rounded-xl border px-3 py-2 ${p.attente ? "hachure border-border" : "border-border-light bg-bg-secondary"}`}
      style={{ borderLeft: `4px solid ${p.attente ? "rgba(255,255,255,0.15)" : t.teinte}`, animationDelay: `${Math.min(p.numero, 12) * 40}ms` }}
    >
      <div className={`grid grid-cols-[2rem_6.5rem_12rem_minmax(0,1fr)_7.5rem_11rem] items-center gap-3 ${p.attente ? "opacity-60" : ""}`}>
        <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-black" style={{ background: t.teinte }}>
          {p.numero}
        </span>
        <span className="flex items-baseline gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.teinte }}>
            {t.libelle}
          </span>
          <span className="text-base font-bold">×{p.nombre}</span>
        </span>
        <div className="flex items-center gap-1">{p.visuel}</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{p.titre}</div>
          {(p.attente || p.detail) && <div className={`truncate text-xs ${p.attente ? "text-accent" : "text-text-muted"}`}>{p.attente ? `⏳ ${p.attente}` : p.detail}</div>}
        </div>
        <div className="text-right">{p.chance}</div>
        <div className="flex items-center justify-end gap-1.5">{p.actions}</div>
      </div>
      {p.formulaire}
    </div>
  );
}

function Naissance({ numero, famille, a, setS, niveau, etapePreparer }: { numero: number; famille: Famille; a: ActionAccouplement; setS: SetS; niveau: number; etapePreparer?: number }) {
  const [ouvert, setOuvert] = useState(false);
  const { e } = a;
  const pret = !a.aPreparer.length;
  const raison = a.termineSucces ? `termine le succès G${e.generation}` : e.pour === "succes" ? "nouvelle couleur" : "pour la suite";
  return (
    <Ligne
      numero={numero}
      type="naissance"
      nombre={a.nombre}
      attente={pret ? undefined : `jauges de ${[...new Set(a.aPreparer.map((m) => `${nomCouleur(famille, m.couleur)} ${sexeSymbole(m.sexe)}`))].join(", ")} d'abord${etapePreparer ? ` (étape ${etapePreparer})` : ""}`}
      visuel={
        <>
          <ImageMonture famille={famille} id={a.pere.couleur} taille={IMG} />
          <span className="text-sky-400">♂</span>
          <span className="text-text-muted">×</span>
          <ImageMonture famille={famille} id={a.mere.couleur} taille={IMG} />
          <span className="text-pink-400">♀</span>
          <span className="text-accent">→</span>
          <ImageMonture famille={famille} id={e.couleur} taille={IMG + 4} />
        </>
      }
      titre={
        <>
          {nomCouleur(famille, e.couleur)} <span className="font-normal text-text-muted">G{e.generation}</span>
        </>
      }
      detail={
        <>
          {raison}
          {e.sexeVoulu && <span className={couleurSexe(e.sexeVoulu)}> · viser {sexeSymbole(e.sexeVoulu)}</span>}
        </>
      }
      chance={
        <span className="leading-tight" title={`${NOM_MAKINA[a.makina.makina]} : ${a.makina.raison}.`}>
          <span className="block text-sm font-bold">{pourcent(a.makina.chance)}</span>
          <span className="block text-[11px] text-text-muted">
            {NOM_MAKINA[a.makina.makina]}
            {a.makina.autre && ` · ${NOM_MAKINA[a.makina.autre.makina].slice(0, 4)}. ${pourcent(a.makina.autre.chance)}`}
          </span>
        </span>
      }
      actions={
        <Bouton data-principal discret={!pret || ouvert} onClick={() => setOuvert(!ouvert)} className="w-full">
          {ouvert ? "Annuler" : "Valider naissance"}
        </Bouton>
      }
      formulaire={ouvert && <FormNaissances famille={famille} a={a} setS={setS} niveauBebes={niveau} fermer={() => setOuvert(false)} />}
    />
  );
}

function Clonage({ numero, famille, g, setS }: { numero: number; famille: Famille; g: GroupeClonage; setS: SetS }) {
  const [ouvert, setOuvert] = useState(false);
  const [a, b] = g.couleurs;
  return (
    <Ligne
      numero={numero}
      type="clonage"
      nombre={g.paires.length}
      visuel={
        <>
          <ImageMonture famille={famille} id={a} taille={IMG} />
          <span className="text-text-muted">+</span>
          <ImageMonture famille={famille} id={b} taille={IMG} />
          <span className="text-accent">→</span>
          <ImageMonture famille={famille} id={a} taille={IMG + 4} />
          {!g.memeCouleur && <ImageMonture famille={famille} id={b} taille={IMG + 4} />}
        </>
      }
      titre={
        <>
          {g.memeCouleur ? nomCouleur(famille, a) : `${nomCouleur(famille, a)} ou ${nomCouleur(famille, b)}`}{" "}
          <span className="font-normal text-text-muted">G{couleur(famille, a).generation}</span>
        </>
      }
      detail={`un clone fertile par paire de stériles · ${g.memeCouleur ? "résultat certain" : "couleur à 50/50"}`}
      actions={
        <Bouton data-principal discret={ouvert} onClick={() => setOuvert(!ouvert)} className="w-full">
          {ouvert ? "Annuler" : "Valider clonage"}
        </Bouton>
      }
      formulaire={ouvert && <FormClonages famille={famille} g={g} setS={setS} fermer={() => setOuvert(false)} />}
    />
  );
}

function Preparer({ numero, famille, groupes, setS, avance }: { numero: number; famille: Famille; groupes: GroupePreparer[]; setS: SetS; avance?: boolean }) {
  const rendrePretes = useRendrePretes(famille, setS);
  const toutesPretes = useToutesPretes(famille, setS);
  const total = groupes.reduce((n, g) => n + g.montures.length, 0);
  const couleurs = preparationParGeneration(famille, groupes).flatMap((x) => x.couleurs);
  return (
    <Ligne
      numero={numero}
      type="preparer"
      nombre={total}
      visuel={couleurs.slice(0, 5).map((c) => <ImageMonture key={c.couleur} famille={famille} id={c.couleur} taille={IMG - 4} />)}
      titre={`${total} monture${total > 1 ? "s" : ""} à mettre en enclos${avance ? " · en avance (pour plus tard)" : ""}`}
      detail={
        <span className="flex flex-wrap gap-x-3 gap-y-1 whitespace-normal">
          {couleurs.map((c) => (
            <span key={c.couleur} className="inline-flex items-center gap-1">
              {nomCouleur(famille, c.couleur)}
              {(["M", "F"] as Sexe[])
                .filter((sx) => c[sx].length)
                .map((sx) => (
                  <button
                    key={sx}
                    onClick={() => rendrePretes(c.couleur, c[sx])}
                    title="Jauges remplies : passer en Féconde"
                    className={`rounded border border-border-light px-1 text-[11px] font-semibold hover:border-status-ok hover:bg-status-ok/15 ${couleurSexe(sx)}`}
                  >
                    {sexeSymbole(sx)}×{c[sx].length} <span className="text-status-ok">✓</span>
                  </button>
                ))}
            </span>
          ))}
        </span>
      }
      actions={
        <Bouton data-principal onClick={() => toutesPretes(groupes)} className="w-full">
          ✓ Toutes prêtes
        </Bouton>
      }
    />
  );
}

function Capture({ numero, famille, capture, setS, niveau }: { numero: number; famille: Famille; capture: ActionCapture; setS: SetS; niveau: number }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Ligne
      numero={numero}
      type="capture"
      nombre={capture.nombre}
      visuel={<ImageMonture famille={famille} id={capture.couleur} taille={IMG} />}
      titre={
        <>
          {nomCouleur(famille, capture.couleur)}
          {(["M", "F"] as Sexe[]).map(
            (sx) =>
              capture[sx] > 0 && (
                <span key={sx} className={`ml-2 font-normal ${couleurSexe(sx)}`}>
                  {sexeSymbole(sx)}×{capture[sx]}
                </span>
              ),
          )}
          {capture.libres > 0 && <span className="ml-2 font-normal text-text-muted">×{capture.libres} au choix</span>}
        </>
      }
      detail={capture.avance ? "en avance (pour plus tard) · à capturer au filet" : "génération 1 · à capturer au filet"}
      actions={
        <Bouton data-principal discret={ouvert} onClick={() => setOuvert(!ouvert)} className="w-full">
          {ouvert ? "Annuler" : "Valider capture"}
        </Bouton>
      }
      formulaire={ouvert && <FormCaptures famille={famille} capture={capture} setS={setS} niveau={niveau} fermer={() => setOuvert(false)} />}
    />
  );
}

/** Une action du tableau de bord en vue compacte. */
export function LigneCompacte({ x, famille, setS, niveau, etapePreparer }: { x: ActionMaintenant; famille: Famille; setS: SetS; niveau: number; etapePreparer?: number }) {
  if (x.type === "naissance") return <Naissance numero={x.numero} famille={famille} a={x.a} setS={setS} niveau={niveau} etapePreparer={etapePreparer} />;
  if (x.type === "clonage") return <Clonage numero={x.numero} famille={famille} g={x.g} setS={setS} />;
  if (x.type === "preparer") return <Preparer numero={x.numero} famille={famille} groupes={x.groupes} setS={setS} avance={x.avance} />;
  return <Capture numero={x.numero} famille={famille} capture={x.capture} setS={setS} niveau={niveau} />;
}
