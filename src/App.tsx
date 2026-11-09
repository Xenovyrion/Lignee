import { useEffect, useState } from "react";
import { TableauDeBord } from "./ecrans/tableau/TableauDeBord";
import { Arbre } from "./ecrans/arbre/Arbre";
import { Etable } from "./ecrans/etable/Etable";
import { Parametres } from "./ecrans/Parametres";
import { Succes } from "./ecrans/succes/Succes";
import { ImageMonture } from "./ecrans/arbre/commun";
import { couleurs, FAMILLES, NOMS_FAMILLE, objectifs } from "./moteur/donnees";
import { IconeActions, IconeArbre, IconeEtable, IconeParametres, IconeSucces } from "./icones";
import { Logo } from "./Logo";
import { Lucioles } from "./effets";
import { urlFond } from "./fond";
import type { Famille, Sauvegarde } from "./moteur/types";
import { useSauvegarde } from "./stockage";

const ONGLETS = { actions: "Prochaines actions", etable: "Étable", arbre: "Arbre", succes: "Succès", parametres: "Paramètres" } as const;
type Onglet = keyof typeof ONGLETS;
const ICONES_ONGLETS = { actions: IconeActions, etable: IconeEtable, arbre: IconeArbre, succes: IconeSucces, parametres: IconeParametres };

/** Image de fond choisie dans les Paramètres, assombrie pour garder le contenu lisible. */
function FondEcran({ nom, visibilite, flou }: { nom: string; visibilite: number; flou: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let actuelle: string | null = null;
    urlFond(nom)
      .then((u) => setUrl((actuelle = u)))
      .catch(() => setUrl(null));
    return () => {
      if (actuelle?.startsWith("blob:")) URL.revokeObjectURL(actuelle);
    };
  }, [nom]);
  if (!url) return null;
  return (
    <div className="pointer-events-none fixed inset-0 -z-20" aria-hidden>
      {/* Sans référent : les fonds d'Ankama ne s'affichent pas si la requête annonce un autre site. */}
      <img src={url} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-105 object-cover" style={{ opacity: visibilite / 100, filter: flou ? `blur(${flou}px)` : undefined }} />
      <div className="absolute inset-0 bg-linear-to-b from-bg-primary/30 via-transparent to-bg-primary/70" />
    </div>
  );
}

export function App() {
  const { s, setS, erreur } = useSauvegarde();
  const [famille, setFamille] = useState<Famille>("dragodinde");
  const [onglet, setOnglet] = useState<Onglet>("actions");
  // Annulation : états précédents de la session (une saisie erronée se défait en un clic).
  const [historique, setHistorique] = useState<Sauvegarde[]>([]);
  if (!s) return <div className="p-6 text-text-muted">Chargement…</div>;

  const majS = (f: (x: Sauvegarde) => Sauvegarde) => {
    setHistorique((h) => [...h.slice(-29), s]);
    setS((x) => (x ? f(x) : x));
  };
  const annuler = () => {
    const precedent = historique[historique.length - 1];
    if (!precedent) return;
    setHistorique((h) => h.slice(0, -1));
    setS(() => precedent);
  };
  const props = { famille, s, setS: majS };
  // Opacité des panneaux (0 à 1), lue par les couleurs de fond du thème (index.css).
  document.documentElement.style.setProperty("--voile", String((s.options.voile ?? 70) / 100));

  return (
    <div className={`mx-auto flex max-w-[2200px] flex-col gap-4 p-6 ${s.options.animations ? "" : "sans-animation"}`}>
      <FondEcran nom={s.options.fondEcran} visibilite={s.options.fondVisibilite} flou={s.options.fondFlou ?? 2} />
      {s.options.animations && s.options.particules && <Lucioles />}
      {/* En-tête sans cadre : logo et titre flottent sur le fond, avec une ombre portée pour rester lisibles. */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-4">
          <Logo taille={68} />
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)" }}>
            Lign<span className="text-amber-400">é</span>e
          </h1>
        </div>
        <div className="surface flex flex-wrap items-center gap-1.5 rounded-2xl border border-border p-1.5">
          {FAMILLES.map((f) => {
            const n = s.obtenues[f].length;
            const total = objectifs(f).length;
            const actif = f === famille;
            return (
              <button
                key={f}
                onClick={() => setFamille(f)}
                className={`flex items-center gap-2.5 rounded-xl border py-1.5 pl-1.5 pr-3 text-left transition ${actif ? "border-accent/70 bg-accent-dim" : "border-transparent hover:bg-bg-hover"}`}
              >
                <ImageMonture famille={f} id={couleurs(f)[0].id} taille={38} className={actif ? "" : "opacity-70"} />
                <span className="flex w-36 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className={actif ? "font-semibold text-accent" : "text-text-secondary"}>{NOMS_FAMILLE[f]}s</span>
                    <span className="text-xs text-text-muted">
                      {n}/{total}
                    </span>
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <span className="block h-full rounded-full bg-linear-to-r from-yellow-700 to-yellow-400" style={{ width: `${(100 * n) / total}%` }} />
                  </span>
                </span>
              </button>
            );
          })}
          <button
            onClick={annuler}
            disabled={!historique.length}
            title={historique.length ? `Annuler la dernière modification (${historique.length} possible${historique.length > 1 ? "s" : ""})` : "Rien à annuler"}
            className="ml-1 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-30"
          >
            ↶ Annuler
          </button>
        </div>
      </header>
      <nav className="surface flex flex-wrap gap-1.5 rounded-2xl border border-border p-1.5">
        {(Object.keys(ONGLETS) as Onglet[]).map((o) => {
          const Icone = ICONES_ONGLETS[o];
          const actif = o === onglet;
          return (
            <button
              key={o}
              onClick={() => setOnglet(o)}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[15px] font-medium transition ${
                actif
                  ? "bg-linear-to-b from-yellow-400 to-amber-600 text-[#1a1405] shadow-[0_4px_18px_rgba(245,158,11,0.35)]"
                  : "text-text-primary/80 hover:bg-white/8 hover:text-text-primary"
              }`}
            >
              <Icone taille={19} />
              {ONGLETS[o]}
            </button>
          );
        })}
      </nav>
      {erreur && <div className="rounded-md bg-status-err/15 p-2 text-sm text-status-err">Sauvegarde impossible : {erreur}</div>}
      {/* Voile commun derrière chaque écran : lisibilité uniforme quelle que soit l'image de fond. */}
      <main className="surface rounded-2xl border border-border p-4">
        {onglet === "actions" && <TableauDeBord {...props} />}
        {onglet === "etable" && <Etable key={famille} {...props} />}
        {onglet === "arbre" && <Arbre key={famille} famille={famille} s={s} />}
        {onglet === "succes" && <Succes {...props} setFamille={setFamille} />}
        {onglet === "parametres" && <Parametres s={s} setS={majS} />}
      </main>
    </div>
  );
}
