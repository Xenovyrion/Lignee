// Mode compagnon : vue compacte des prochaines étapes, pour une petite fenêtre gardée à côté du jeu.
import { useMemo, useState, type ReactNode } from "react";
import { actionsMaintenant, cleAction, conseiller, seancesDesEtapes, type ActionAccouplement, type ActionCapture, type ActionMaintenant } from "../moteur/conseils";
import { couleurs, FAMILLES, NOMS_FAMILLE, nomCouleur, objectifs } from "../moteur/donnees";
import { planifier, regrouperClonages, suggererClonages, type GroupeClonage } from "../moteur/planificateur";
import type { Famille, Sauvegarde, Sexe } from "../moteur/types";
import { useAnnuler } from "../notifications";
import { Logo } from "../Logo";
import { pourcent, sexeSymbole } from "../ui";
import { ImageMonture } from "./arbre/commun";
import { FormCaptures, FormClonages, FormNaissances } from "./tableau/CartesActions";
import { preparationParGeneration, TYPES, useRendrePretes, useToutesPretes, type GroupePreparer } from "./tableau/typesActions";

type SetS = (f: (s: Sauvegarde) => Sauvegarde) => void;

interface Props {
  famille: Famille;
  setFamille: (f: Famille) => void;
  s: Sauvegarde;
  setS: SetS;
  epingle: boolean;
  setEpingle: (oui: boolean) => void;
  agrandir: () => void;
  peutAnnuler: boolean;
}

export function Compagnon({ famille, setFamille, s, setS, epingle, setEpingle, agrandir, peutAnnuler }: Props) {
  const annuler = useAnnuler();
  const plan = useMemo(() => planifier(famille, s.montures, s.obtenues[famille], s.options.cibles?.[famille], s.options.priorite), [famille, s.montures, s.obtenues, s.options.cibles, s.options.priorite]);
  const c = useMemo(() => conseiller(plan, { takeza: s.options.takeza, makina: s.options.makina, seuilAnimakina: s.options.seuilAnimakina }), [plan, s.options.takeza, s.options.makina, s.options.seuilAnimakina]);
  const clonages = useMemo(() => regrouperClonages(suggererClonages(s.montures.filter((m) => m.famille === famille))), [famille, s.montures]);
  const actions = useMemo(() => actionsMaintenant(c, clonages), [c, clonages]);
  const seances = Math.max(1, ...seancesDesEtapes(plan));
  const niveau = s.options.modeSuivi === "simple" ? s.options.niveauParDefaut : 1;
  const obtenues = s.obtenues[famille].length;
  const total = objectifs(famille).length;

  return (
    <div className="flex min-h-screen flex-col gap-2 p-2">
      {/* Barre compacte */}
      <div className="surface flex items-center gap-2 rounded-xl border border-border px-2 py-1.5">
        <Logo taille={30} anime={s.options.animations} />
        <div className="flex gap-1">
          {FAMILLES.map((f) => (
            <button
              key={f}
              title={NOMS_FAMILLE[f] + "s"}
              onClick={() => setFamille(f)}
              className={`rounded-lg border p-0.5 transition ${f === famille ? "border-accent bg-accent-dim" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <ImageMonture famille={f} id={couleurs(f)[0].id} taille={24} />
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <BoutonBarre titre="Annuler la dernière modification" onClick={annuler} disabled={!peutAnnuler}>
          ↶
        </BoutonBarre>
        <BoutonBarre titre={epingle ? "Ne plus garder au premier plan" : "Garder au premier plan"} onClick={() => setEpingle(!epingle)} actif={epingle}>
          📌
        </BoutonBarre>
        <BoutonBarre titre="Revenir à la fenêtre complète" onClick={agrandir}>
          ⤢
        </BoutonBarre>
      </div>

      {/* Progression */}
      <div className="surface flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs">
        <span className="font-semibold text-accent">{NOMS_FAMILLE[famille]}s</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
          <span className="block h-full rounded-full bg-linear-to-r from-accent-fonce to-accent-clair" style={{ width: `${(100 * obtenues) / total}%` }} />
        </span>
        <span className="text-text-secondary">
          {obtenues}/{total}
        </span>
        <span className="text-text-muted">· ≈ {seances} séances</span>
      </div>

      {/* Étapes */}
      <div className="flex flex-col gap-1.5">
        {actions.length === 0 && <p className="surface rounded-xl p-3 text-sm text-text-muted">Rien à faire pour l'instant.</p>}
        {actions.map((x) => (
          <LigneAction key={cleAction(x)} x={x} famille={famille} setS={setS} niveau={niveau} />
        ))}
      </div>
    </div>
  );
}

const BoutonBarre = ({ titre, onClick, disabled, actif, children }: { titre: string; onClick: () => void; disabled?: boolean; actif?: boolean; children: ReactNode }) => (
  <button
    title={titre}
    onClick={onClick}
    disabled={disabled}
    className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition disabled:opacity-30 ${actif ? "bg-accent-dim text-accent" : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"}`}
  >
    {children}
  </button>
);

/** Une action sur une ligne du mode compagnon. */
export function LigneAction({ x, famille, setS, niveau }: { x: ActionMaintenant; famille: Famille; setS: SetS; niveau: number }) {
  if (x.type === "naissance") return <LigneNaissance numero={x.numero} famille={famille} a={x.a} setS={setS} niveau={niveau} />;
  if (x.type === "clonage") return <LigneClonage numero={x.numero} famille={famille} g={x.g} setS={setS} />;
  if (x.type === "preparer") return <LignePreparer numero={x.numero} famille={famille} groupes={x.groupes} setS={setS} avance={x.avance} />;
  return <LigneCapture numero={x.numero} famille={famille} capture={x.capture} setS={setS} niveau={niveau} />;
}

const IMG = 28;
const couleurSexe = (s: Sexe) => (s === "M" ? "text-sky-400" : "text-pink-400");

/**
 * Ligne du compagnon, en colonnes fixes : numéro · type ×N · contenu · bouton (même largeur pour toutes les actions).
 * Contenu : les images en haut, puis le nom en gras et le détail. Le formulaire s'ouvre dessous.
 */
function Ligne(p: {
  numero: number;
  type: keyof typeof TYPES;
  nombre: number;
  attente?: boolean;
  visuel: ReactNode;
  titre: ReactNode;
  detail?: ReactNode;
  /** Bloc sous le titre (boutons par couleur de « Préparer »). */
  extra?: ReactNode;
  bouton?: ReactNode;
  formulaire?: ReactNode;
}) {
  const t = TYPES[p.type];
  return (
    <div
      className={`apparition rounded-xl border px-2.5 py-2 ${p.attente ? "hachure border-border" : "border-border-light bg-bg-secondary"}`}
      style={{ borderLeft: `3px solid ${p.attente ? "rgba(255,255,255,0.15)" : t.teinte}`, animationDelay: `${Math.min(p.numero, 10) * 40}ms` }}
    >
      <div className={`grid grid-cols-[1.5rem_4.25rem_minmax(0,1fr)_7.5rem] items-center gap-2 ${p.attente ? "opacity-60" : ""}`}>
        <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-black" style={{ background: t.teinte }}>
          {p.numero}
        </span>
        <span className="text-[10px] font-semibold uppercase leading-tight tracking-wide" style={{ color: t.teinte }}>
          {t.libelle}
          <span className="block text-base leading-5 text-text-primary">×{p.nombre}</span>
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1">{p.visuel}</div>
          <div className="truncate text-xs">
            <b>{p.titre}</b>
            {p.detail && <span className="text-text-muted"> · {p.detail}</span>}
          </div>
          {p.extra}
          {p.attente && <div className="text-[11px] text-accent">⏳ jauges des parents d'abord</div>}
        </div>
        <div className="flex justify-end">{p.bouton}</div>
      </div>
      {p.formulaire}
    </div>
  );
}

/** Bouton d'action du compagnon : toute la largeur de sa colonne, pour que tous s'alignent. */
const PetitBouton = ({ ouvert, onClick, discret, children }: { ouvert: boolean; onClick: () => void; discret?: boolean; children: ReactNode }) => (
  <button
    onClick={onClick}
    className={`w-full rounded-lg px-2 py-1.5 text-xs font-semibold transition ${ouvert || discret ? "border border-border-light text-text-secondary" : "bg-linear-to-b from-accent-clair to-accent text-accent-texte"}`}
  >
    {ouvert ? "Fermer" : children}
  </button>
);

function LigneNaissance({ numero, famille, a, setS, niveau }: { numero: number; famille: Famille; a: ActionAccouplement; setS: SetS; niveau: number }) {
  const [ouvert, setOuvert] = useState(false);
  const attente = a.aPreparer.length > 0;
  return (
    <Ligne
      numero={numero}
      type="naissance"
      nombre={a.nombre}
      attente={attente}
      visuel={
        <>
          <ImageMonture famille={famille} id={a.pere.couleur} taille={IMG} />
          <span className="text-sky-400">♂</span>
          <span className="text-text-muted">×</span>
          <ImageMonture famille={famille} id={a.mere.couleur} taille={IMG} />
          <span className="text-pink-400">♀</span>
          <span className="text-accent">→</span>
          <ImageMonture famille={famille} id={a.e.couleur} taille={IMG + 2} />
        </>
      }
      titre={nomCouleur(famille, a.e.couleur)}
      detail={
        <>
          {pourcent(a.makina.chance)} {a.makina.makina === "animakina" ? "Animakina" : "Optimakina"}
          {a.e.sexeVoulu && <span className={couleurSexe(a.e.sexeVoulu)}> · viser {sexeSymbole(a.e.sexeVoulu)}</span>}
        </>
      }
      bouton={
        <PetitBouton ouvert={ouvert} discret={attente} onClick={() => setOuvert(!ouvert)}>
          Valider naissance
        </PetitBouton>
      }
      formulaire={ouvert && <FormNaissances famille={famille} a={a} setS={setS} niveauBebes={niveau} fermer={() => setOuvert(false)} />}
    />
  );
}

function LigneClonage({ numero, famille, g, setS }: { numero: number; famille: Famille; g: GroupeClonage; setS: SetS }) {
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
          <ImageMonture famille={famille} id={a} taille={IMG + 2} />
          {!g.memeCouleur && <ImageMonture famille={famille} id={b} taille={IMG + 2} />}
        </>
      }
      titre={g.memeCouleur ? nomCouleur(famille, a) : `${nomCouleur(famille, a)} ou ${nomCouleur(famille, b)}`}
      detail={g.memeCouleur ? "résultat certain" : "couleur à 50/50"}
      bouton={
        <PetitBouton ouvert={ouvert} onClick={() => setOuvert(!ouvert)}>
          Valider clonage
        </PetitBouton>
      }
      formulaire={ouvert && <FormClonages famille={famille} g={g} setS={setS} fermer={() => setOuvert(false)} />}
    />
  );
}

function LignePreparer({ numero, famille, groupes, setS, avance }: { numero: number; famille: Famille; groupes: GroupePreparer[]; setS: SetS; avance?: boolean }) {
  const rendrePretes = useRendrePretes(famille, setS);
  const toutesPretes = useToutesPretes(famille, setS);
  const total = groupes.reduce((n, g) => n + g.montures.length, 0);
  const couleurs = preparationParGeneration(famille, groupes).flatMap((x) => x.couleurs);
  return (
    <Ligne
      numero={numero}
      type="preparer"
      nombre={total}
      visuel={couleurs.slice(0, 6).map((c) => <ImageMonture key={c.couleur} famille={famille} id={c.couleur} taille={IMG - 2} />)}
      titre={`${total} à mettre en enclos${avance ? " · en avance" : ""}`}
      extra={
        <span className="mt-0.5 flex flex-wrap gap-x-2.5 gap-y-1 text-xs text-text-secondary">
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
      bouton={
        <PetitBouton ouvert={false} onClick={() => toutesPretes(groupes)}>
          ✓ Toutes prêtes
        </PetitBouton>
      }
    />
  );
}

function LigneCapture({ numero, famille, capture, setS, niveau }: { numero: number; famille: Famille; capture: ActionCapture; setS: SetS; niveau: number }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <Ligne
      numero={numero}
      type="capture"
      nombre={capture.nombre}
      visuel={<ImageMonture famille={famille} id={capture.couleur} taille={IMG + 2} />}
      titre={
        <>
          {nomCouleur(famille, capture.couleur)}
          {(["M", "F"] as Sexe[]).map(
            (sx) =>
              capture[sx] > 0 && (
                <span key={sx} className={`ml-1.5 font-normal ${couleurSexe(sx)}`}>
                  {sexeSymbole(sx)}×{capture[sx]}
                </span>
              ),
          )}
          {capture.libres > 0 && <span className="ml-1.5 font-normal text-text-muted">×{capture.libres} au choix</span>}
        </>
      }
      detail={capture.avance ? "en avance (pour plus tard)" : "à capturer au filet"}
      bouton={
        <PetitBouton ouvert={ouvert} onClick={() => setOuvert(!ouvert)}>
          Valider capture
        </PetitBouton>
      }
      formulaire={ouvert && <FormCaptures famille={famille} capture={capture} setS={setS} niveau={niveau} fermer={() => setOuvert(false)} />}
    />
  );
}
