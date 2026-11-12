// Mode compagnon : vue compacte des prochaines étapes, pour une petite fenêtre gardée à côté du jeu.
import { useMemo, useState, type ReactNode } from "react";
import { actionsMaintenant, conseiller, seancesDesEtapes, type ActionAccouplement, type ActionCapture } from "../moteur/conseils";
import { ajusterStock } from "../moteur/etable";
import { couleurs, FAMILLES, NOMS_FAMILLE, nomCouleur, objectifs } from "../moteur/donnees";
import { planifier, regrouperClonages, suggererClonages, type GroupeClonage } from "../moteur/planificateur";
import type { Famille, Sauvegarde, Sexe } from "../moteur/types";
import { useNotifier } from "../notifications";
import { Logo } from "../Logo";
import { pourcent, sexeSymbole } from "../ui";
import { ImageMonture } from "./arbre/commun";
import { FormClonages, FormNaissances } from "./tableau/CartesActions";
import { preparationParGeneration, TYPES, useRendrePretes, type GroupePreparer } from "./tableau/typesActions";

type SetS = (f: (s: Sauvegarde) => Sauvegarde) => void;

interface Props {
  famille: Famille;
  setFamille: (f: Famille) => void;
  s: Sauvegarde;
  setS: SetS;
  epingle: boolean;
  setEpingle: (oui: boolean) => void;
  agrandir: () => void;
  annuler: () => void;
  peutAnnuler: boolean;
}

export function Compagnon({ famille, setFamille, s, setS, epingle, setEpingle, agrandir, annuler, peutAnnuler }: Props) {
  const plan = useMemo(() => planifier(famille, s.montures, s.obtenues[famille]), [famille, s.montures, s.obtenues]);
  const c = useMemo(() => conseiller(plan, { takeza: s.options.takeza }), [plan, s.options.takeza]);
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
        {actions.map((x) => {
          const k = `c-${x.numero}`;
          if (x.type === "naissance") return <LigneNaissance key={k} numero={x.numero} famille={famille} a={x.a} setS={setS} niveau={niveau} />;
          if (x.type === "clonage") return <LigneClonage key={k} numero={x.numero} famille={famille} g={x.g} setS={setS} />;
          if (x.type === "preparer") return <LignePreparer key={k} numero={x.numero} famille={famille} groupes={x.groupes} setS={setS} />;
          return <LigneCapture key={k} numero={x.numero} famille={famille} capture={x.capture} setS={setS} niveau={niveau} />;
        })}
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

/** Ligne compacte : numéro, type, ×N, contenu et bouton ; le formulaire s'ouvre dessous. */
function Ligne(p: { numero: number; type: keyof typeof TYPES; nombre: number; attente?: boolean; children: ReactNode; bouton?: ReactNode; formulaire?: ReactNode }) {
  const t = TYPES[p.type];
  return (
    <div
      className={`apparition rounded-xl border px-2.5 py-2 ${p.attente ? "hachure border-border opacity-70" : "border-border-light bg-bg-secondary"}`}
      style={{ borderLeft: `3px solid ${p.attente ? "rgba(255,255,255,0.15)" : t.teinte}`, animationDelay: `${Math.min(p.numero, 10) * 40}ms` }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black" style={{ background: t.teinte }}>
          {p.numero}
        </span>
        <span className="w-[4.5rem] shrink-0 text-[10px] font-semibold uppercase leading-tight tracking-wide" style={{ color: t.teinte }}>
          {t.libelle}
          <span className="block text-base leading-5 text-text-primary">×{p.nombre}</span>
        </span>
        <div className="min-w-0 flex-1">{p.children}</div>
        {p.bouton}
      </div>
      {p.formulaire}
    </div>
  );
}

const PetitBouton = ({ ouvert, onClick, children }: { ouvert: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    onClick={onClick}
    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold transition ${ouvert ? "border border-border-light text-text-secondary" : "bg-linear-to-b from-accent-clair to-accent text-accent-texte"}`}
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
      bouton={!attente && <PetitBouton ouvert={ouvert} onClick={() => setOuvert(!ouvert)}>Enregistrer</PetitBouton>}
      formulaire={ouvert && <FormNaissances famille={famille} a={a} setS={setS} niveauBebes={niveau} fermer={() => setOuvert(false)} />}
    >
      <div className="flex items-center gap-1">
        <ImageMonture famille={famille} id={a.pere.couleur} taille={26} />
        <span className="text-sky-400">♂</span>
        <span className="text-text-muted">×</span>
        <ImageMonture famille={famille} id={a.mere.couleur} taille={26} />
        <span className="text-pink-400">♀</span>
        <span className="text-accent">→</span>
        <ImageMonture famille={famille} id={a.e.couleur} taille={30} />
      </div>
      <div className="truncate text-xs">
        <b>{nomCouleur(famille, a.e.couleur)}</b>{" "}
        <span className="text-text-muted">
          · {pourcent(a.makina.chance)} {a.makina.makina === "animakina" ? "Animakina" : "Optimakina"}
          {a.e.sexeVoulu && ` · viser ${sexeSymbole(a.e.sexeVoulu)}`}
        </span>
      </div>
      {attente && <div className="text-[11px] text-accent">⏳ jauges des parents d'abord</div>}
    </Ligne>
  );
}

function LignePreparer({ numero, famille, groupes, setS }: { numero: number; famille: Famille; groupes: GroupePreparer[]; setS: SetS }) {
  const rendrePretes = useRendrePretes(famille, setS);
  return (
    <Ligne numero={numero} type="preparer" nombre={groupes.reduce((n, g) => n + g.montures.length, 0)}>
      <div className="flex flex-col gap-1.5">
        {preparationParGeneration(famille, groupes).map(({ generation, couleurs }) => (
          <div key={generation} className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-accent">G{generation}</span>
            {couleurs.map((c) => (
              <div key={c.couleur} className="flex items-center gap-1.5 text-xs">
                <ImageMonture famille={famille} id={c.couleur} taille={24} />
                <span className="min-w-0 flex-1 truncate">{nomCouleur(famille, c.couleur)}</span>
                {(["M", "F"] as Sexe[])
                  .filter((sexe) => c[sexe].length)
                  .map((sexe) => (
                    <button
                      key={sexe}
                      onClick={() => rendrePretes(c.couleur, c[sexe])}
                      title="Jauges remplies : passer en Féconde"
                      className={`shrink-0 rounded-md border border-border-light px-1.5 py-0.5 text-[11px] font-semibold hover:border-status-ok hover:bg-status-ok/15 ${sexe === "M" ? "text-sky-400" : "text-pink-400"}`}
                    >
                      {sexeSymbole(sexe)}×{c[sexe].length} <span className="text-status-ok">✓</span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Ligne>
  );
}

function LigneCapture({ numero, famille, capture, setS, niveau }: { numero: number; famille: Famille; capture: ActionCapture; setS: SetS; niveau: number }) {
  const notifier = useNotifier();
  // Un clic ajoute une monture capturée (du sexe demandé, sinon on choisit).
  const ajouter = (sexe: Sexe) => {
    notifier(`${nomCouleur(famille, capture.couleur)} ${sexeSymbole(sexe)} ajoutée à l'étable`, { annulable: true });
    setS((s) => ajusterStock(s, famille, capture.couleur, sexe, "fertile", 1, niveau));
  };
  return (
    <Ligne
      numero={numero}
      type="capture"
      nombre={capture.nombre}
      bouton={
        <div className="flex shrink-0 gap-1">
          {(capture.sexe ? [capture.sexe] : (["M", "F"] as Sexe[])).map((sexe) => (
            <button
              key={sexe}
              onClick={() => ajouter(sexe)}
              title={`Une ${nomCouleur(famille, capture.couleur)} ${sexe === "M" ? "mâle" : "femelle"} capturée`}
              className={`rounded-lg border border-border-light px-2 py-1 text-xs font-semibold hover:bg-bg-hover ${sexe === "M" ? "text-sky-400" : "text-pink-400"}`}
            >
              +{sexeSymbole(sexe)}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex items-center gap-1.5">
        <ImageMonture famille={famille} id={capture.couleur} taille={28} />
        <span className="truncate text-xs">
          <b>{nomCouleur(famille, capture.couleur)}</b> {capture.sexe && <span className={capture.sexe === "M" ? "text-sky-400" : "text-pink-400"}>{sexeSymbole(capture.sexe)}</span>}
          <span className="block text-text-muted">à capturer au filet</span>
        </span>
      </div>
    </Ligne>
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
      bouton={<PetitBouton ouvert={ouvert} onClick={() => setOuvert(!ouvert)}>Enregistrer</PetitBouton>}
      formulaire={ouvert && <FormClonages famille={famille} g={g} setS={setS} fermer={() => setOuvert(false)} />}
    >
      <div className="flex items-center gap-1">
        <ImageMonture famille={famille} id={a} taille={26} />
        <span className="text-text-muted">+</span>
        <ImageMonture famille={famille} id={b} taille={26} />
        <span className="text-accent">→</span>
        <ImageMonture famille={famille} id={a} taille={30} />
        {!g.memeCouleur && <ImageMonture famille={famille} id={b} taille={30} />}
      </div>
      <div className="truncate text-xs text-text-muted">{g.memeCouleur ? `${nomCouleur(famille, a)} · résultat certain` : "couleur à 50/50"}</div>
    </Ligne>
  );
}
