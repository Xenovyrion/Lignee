import { useCallback, useEffect, useRef, useState } from "react";
import { journaliser, resumerDifference } from "./diagnostic";
import { TableauDeBord } from "./ecrans/tableau/TableauDeBord";
import { Arbre } from "./ecrans/arbre/Arbre";
import { Etable } from "./ecrans/etable/Etable";
import { Parametres } from "./ecrans/Parametres";
import { Succes } from "./ecrans/succes/Succes";
import { ImageMonture } from "./ecrans/arbre/commun";
import { couleurs, FAMILLES, NOMS_FAMILLE, objectifs } from "./moteur/donnees";
import { IconeActions, IconeArbre, IconeEnclos, IconeEtable, IconeGuide, IconeParametres, IconeSucces } from "./icones";
import { Guide } from "./ecrans/guide/Guide";
import { Logo } from "./Logo";
import { entrerCompagnon, epingler, quitterCompagnon } from "./compagnon";
import { Compagnon } from "./ecrans/Compagnon";
import { FournisseurNotifications, useAnnuler } from "./notifications";
import { SurveillanceMinuteurs } from "./ecrans/SurveillanceMinuteurs";
import { OngletEnclos } from "./ecrans/enclos/OngletEnclos";
import { chercherMiseAJour, versionActuelle, versionNouvellementInstallee, type MiseAJour } from "./miseAJour";
import { NotesDeVersion } from "./ecrans/NotesDeVersion";
import { chapitreDeLOnglet, CHAPITRES, Didacticiel, ProposerDidacticiel, type Chapitre } from "./ecrans/Didacticiel";
import { construireDemo } from "./demo";
import { BarreChargement } from "./ui";
import { BandeauMiseAJour } from "./ecrans/BandeauMiseAJour";
import { Lucioles } from "./effets";
import { urlFond } from "./fond";
import { appliquerPalette, themeParId } from "./themes";
import type { Famille, Sauvegarde } from "./moteur/types";
import { useSauvegarde } from "./stockage";
import { BandeauAlmanax, CalendrierAlmanax, useAlmanax } from "./ecrans/BandeauAlmanax";
import { RechercheRapide, resultatsMontures, type Resultat } from "./ecrans/RechercheRapide";

/** Réglages trouvables par la recherche rapide : repère (data-tuto) dans Paramètres, titre et mots-clés. */
const REGLAGES: [string, string, string][] = [
  ["apparence", "Apparence", "thème fond d'écran image transparence animations lucioles"],
  ["metier", "Métier d'Éleveur", "niveau enclos"],
  ["reglages-etable", "Réglages de l'étable", "suivi simple détaillé niveau par défaut nom"],
  ["minuteurs", "Minuteurs d'enclos et Discord", "notifications relais windows discord"],
  ["sauvegardes", "Sauvegardes", "export import copie restaurer cloud onedrive google drive"],
  ["mises-a-jour", "Mises à jour", "version nouveautés"],
  ["diagnostic", "Diagnostic", "journal problème bug"],
  ["accouplements", "Accouplements", "makina optimakina animakina"],
];

/** Fait défiler jusqu'à un repère et le fait briller un instant. */
function montrer(repere: string) {
  window.setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[data-tuto="${repere}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.animate([{ boxShadow: "0 0 0 3px var(--color-accent)" }, { boxShadow: "0 0 0 0 transparent" }], { duration: 1800, easing: "ease-out" });
  }, 80);
}

const ONGLETS = { actions: "Tableau de bord", etable: "Étable", enclos: "Enclos", arbre: "Arbre", succes: "Succès", guide: "Guide", parametres: "Paramètres" } as const;
type Onglet = keyof typeof ONGLETS;
const ICONES_ONGLETS = { actions: IconeActions, etable: IconeEtable, enclos: IconeEnclos, arbre: IconeArbre, succes: IconeSucces, guide: IconeGuide, parametres: IconeParametres };

/** Image de fond choisie dans les Paramètres, assombrie pour garder le contenu lisible. */
function FondEcran({ nom, visibilite, flou }: { nom: string; visibilite: number; flou: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [charge, setCharge] = useState(false);
  useEffect(() => {
    let actuelle: string | null = null;
    setCharge(false);
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
      {/* Fine barre de chargement en haut de l'écran le temps que l'image arrive. */}
      {!charge && <BarreChargement className="fixed inset-x-0 top-0 z-50 h-0.5! rounded-none!" />}
      {/* Sans référent : les fonds d'Ankama ne s'affichent pas si la requête annonce un autre site. */}
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onLoad={() => setCharge(true)}
        onError={() => setCharge(true)}
        className="absolute inset-0 h-full w-full scale-105 object-cover transition-opacity duration-700"
        style={{ opacity: charge ? visibilite / 100 : 0, filter: flou ? `blur(${flou}px)` : undefined }}
      />
      <div className="absolute inset-0 bg-linear-to-b from-bg-primary/30 via-transparent to-bg-primary/70" />
    </div>
  );
}

/** « ↶ Annuler » de l'en-tête (passe par les notifications pour signaler l'annulation). */
function BoutonAnnuler({ possibles }: { possibles: number }) {
  const annuler = useAnnuler();
  return (
    <button
      onClick={annuler}
      disabled={!possibles}
      title={possibles ? `Annuler la dernière modification (${possibles} possible${possibles > 1 ? "s" : ""})` : "Rien à annuler"}
      className="ml-1 rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-30"
    >
      ↶ Annuler
    </button>
  );
}

export function App() {
  const { s, setS, erreur } = useSauvegarde();
  const [famille, setFamille] = useState<Famille>("dragodinde");
  const [onglet, setOnglet] = useState<Onglet>("actions");
  const [recherche, setRecherche] = useState(false);
  const [calendrier, setCalendrier] = useState(false);
  const almanax = useAlmanax();
  const [focusArbre, setFocusArbre] = useState<{ f: Famille; id: string } | null>(null);
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRecherche((x) => !x);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, []);
  // Annulation : états précédents de la session (une saisie erronée se défait en un clic).
  const [historique, setHistorique] = useState<Sauvegarde[]>([]);
  // Compteur de modifications : permet aux notifications de savoir si leur « Annuler » est encore le bon.
  const [modifications, setModifications] = useState(0);
  const [compagnon, setCompagnon] = useState(false);
  const [epingle, setEpingle] = useState(true);
  // Mise à jour disponible (vérifiée une fois au démarrage, silencieusement en cas d'erreur réseau).
  const [maj, setMaj] = useState<MiseAJour | null>(null);
  useEffect(() => {
    chercherMiseAJour()
      .then(setMaj)
      .catch((e) => console.warn("Vérification des mises à jour impossible", e));
  }, []);
  // Nouveautés : ouvertes automatiquement juste après une mise à jour, ou à la demande.
  const [nouveautes, setNouveautes] = useState<{ ouvert: boolean; version?: string }>({ ouvert: false });
  const fermerNouveautes = useCallback(() => setNouveautes({ ouvert: false }), []);
  // Journal de diagnostic : démarrage, puis chaque changement de la sauvegarde (quelle qu'en soit l'origine).
  const precedent = useRef<Sauvegarde | null>(null);
  useEffect(() => {
    if (!s) return;
    if (!precedent.current) {
      versionActuelle().then((v) =>
        journaliser(
          "info",
          `Démarrage de Lignée ${v ?? "(navigateur)"} · ${s.montures.length} montures · succès DD ${s.obtenues.dragodinde.length}, Muldo ${s.obtenues.muldo.length}, Volkorne ${s.obtenues.volkorne.length}`,
        ),
      );
    } else if (precedent.current !== s) {
      const d = resumerDifference(precedent.current, s);
      if (d) journaliser("etat", d);
    }
    precedent.current = s;
  }, [s]);
  // Visite guidée : proposée à l'ouverture tant qu'elle n'a été ni faite ni refusée.
  const [tuto, setTuto] = useState<Chapitre | null>(null);
  const [tutoReporte, setTutoReporte] = useState(false);
  // Étable de démonstration des chapitres Étable et Tableau de bord : affichée à la place de la vraie, jamais enregistrée.
  const [demo, setDemo] = useState<Sauvegarde | null>(null);
  const [historiqueDemo, setHistoriqueDemo] = useState<Sauvegarde[]>([]);
  const familleAvantDemo = useRef<Famille | null>(null);
  const allerA = useCallback((o: Onglet) => setOnglet(o), []);
  const fixerTuto = useCallback((v: "vu" | "refuse") => setS((x) => (x ? { ...x, options: { ...x.options, didacticiel: v } } : x)), [setS]);
  const quitterDemo = useCallback(() => {
    setDemo(null);
    setHistoriqueDemo([]);
    if (familleAvantDemo.current) setFamille(familleAvantDemo.current);
    familleAvantDemo.current = null;
  }, []);
  const lancerTuto = useCallback(
    (c: Chapitre) => {
      setTuto(c);
      if (!CHAPITRES[c].demo) return quitterDemo();
      if (!s) return;
      journaliser("info", `Visite guidée : chapitre « ${CHAPITRES[c].titre} » (étable de démonstration)`);
      if (!familleAvantDemo.current) familleAvantDemo.current = famille;
      setFamille("dragodinde");
      setDemo(construireDemo(s.options));
      setHistoriqueDemo([]);
    },
    [s, famille, quitterDemo],
  );
  const fermerTuto = useCallback(() => {
    setTuto(null);
    quitterDemo();
    fixerTuto("vu");
  }, [fixerTuto, quitterDemo]);
  useEffect(() => {
    versionNouvellementInstallee()
      .then((v) => v && setNouveautes({ ouvert: true, version: v }))
      .catch(() => {});
  }, []);
  if (!s)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Logo taille={88} anime />
        <div className="text-lg font-semibold">Chargement de ton élevage…</div>
        <BarreChargement className="w-56" />
      </div>
    );

  // Pendant la démo, les écrans affichent et modifient l'étable d'exemple.
  // Le bonus +20 % de l'Almanax s'applique tout seul le jour venu (plus de case à cocher).
  const sv = { ...(demo ?? s), options: { ...(demo ?? s).options, takeza: almanax.generation } };
  const majReel = (f: (x: Sauvegarde) => Sauvegarde) => {
    setHistorique((h) => [...h.slice(-29), s]);
    setModifications((n) => n + 1);
    setS((x) => (x ? f(x) : x));
  };
  const majS = (f: (x: Sauvegarde) => Sauvegarde) => {
    if (!demo) return majReel(f);
    setHistoriqueDemo((h) => [...h, demo]);
    setModifications((n) => n + 1);
    setDemo((x) => (x ? f(x) : x));
  };
  const annuler = () => {
    if (demo) {
      const avant = historiqueDemo[historiqueDemo.length - 1];
      if (!avant) return;
      setHistoriqueDemo((h) => h.slice(0, -1));
      setModifications((n) => n - 1);
      setDemo(avant);
      return;
    }
    const precedent = historique[historique.length - 1];
    if (!precedent) return;
    setHistorique((h) => h.slice(0, -1));
    setModifications((n) => n - 1);
    setS(() => precedent);
  };
  const basculerCompagnon = async (oui: boolean) => {
    setCompagnon(oui);
    setEpingle(true);
    try {
      await (oui ? entrerCompagnon() : quitterCompagnon());
    } catch (e) {
      console.error("Mode compagnon : fenêtre non modifiable", e);
    }
  };
  const resultatsRecherche = (): Resultat[] => [
    ...(Object.keys(ONGLETS) as Onglet[]).map((o) => {
      const Icone = ICONES_ONGLETS[o];
      return { cle: `onglet-${o}`, titre: ONGLETS[o], detail: "Onglet", groupe: "Onglets" as const, icone: <Icone taille={18} />, aller: () => setOnglet(o) };
    }),
    ...REGLAGES.map(([repere, titre, mots]) => ({
      cle: `reglage-${repere}`,
      titre,
      detail: "Paramètres",
      groupe: "Réglages" as const,
      icone: <IconeParametres taille={18} />,
      mots,
      aller: () => {
        setOnglet("parametres");
        montrer(repere);
      },
    })),
    ...(almanax.prochains.length
      ? [{ cle: "cmd-almanax", titre: "Calendrier de l'Almanax", detail: "Prochains bonus d'élevage", groupe: "Commandes" as const, icone: "🌙", aller: () => setCalendrier(true) }]
      : []),
    { cle: "cmd-compagnon", titre: "Mode compagnon", detail: "Fenêtre compacte au premier plan, à côté du jeu", groupe: "Commandes", icone: "⤡", aller: () => basculerCompagnon(true) },
    { cle: "cmd-aide", titre: "Visite guidée de cet onglet", detail: CHAPITRES[chapitreDeLOnglet(onglet)].titre, groupe: "Commandes", icone: "?", mots: "aide didacticiel tutoriel", aller: () => lancerTuto(chapitreDeLOnglet(onglet)) },
    {
      cle: "cmd-compacte",
      titre: s.options.vueCompacte ? "Vue détaillée du tableau de bord" : "Vue compacte du tableau de bord",
      detail: s.options.vueCompacte ? "Réafficher les explications" : "Seulement les actions, sans les explications",
      groupe: "Commandes",
      icone: "☰",
      mots: "compact résumé",
      aller: () => {
        majReel((x) => ({ ...x, options: { ...x.options, vueCompacte: !x.options.vueCompacte } }));
        setOnglet("actions");
      },
    },
    { cle: "cmd-nouveautes", titre: "Nouveautés", detail: "Notes des dernières versions", groupe: "Commandes", icone: "✦", mots: "version mise à jour", aller: () => setNouveautes({ ouvert: true }) },
    ...resultatsMontures(sv, (f, id) => {
      setFamille(f);
      setFocusArbre({ f, id });
      setOnglet("arbre");
    }),
  ];
  const props = { famille, s: sv, setS: majS };
  // Opacité des panneaux (0 à 1), lue par les couleurs de fond du thème (index.css).
  document.documentElement.style.setProperty("--voile", String((s.options.voile ?? 70) / 100));
  appliquerPalette(themeParId(s.options.theme ?? "dore"));

  const fond = (
    <>
      <FondEcran nom={s.options.fondEcran} visibilite={s.options.fondVisibilite} flou={s.options.fondFlou ?? 2} />
      {s.options.animations && s.options.particules && <Lucioles />}
    </>
  );

  if (compagnon)
    return (
      <FournisseurNotifications historique={modifications} annuler={annuler}>
        <SurveillanceMinuteurs s={s} setS={setS} />
        <div className={s.options.animations ? "" : "sans-animation"}>
          {fond}
          <Compagnon
            famille={famille}
            setFamille={setFamille}
            s={sv}
            setS={majS}
            epingle={epingle}
            setEpingle={(oui) => {
              setEpingle(oui);
              epingler(oui);
            }}
            agrandir={() => basculerCompagnon(false)}
            peutAnnuler={historique.length > 0}
          />
        </div>
      </FournisseurNotifications>
    );

  return (
    <FournisseurNotifications historique={modifications} annuler={annuler}>
        <SurveillanceMinuteurs s={s} setS={setS} />
      <div className={`mx-auto flex max-w-[2200px] flex-col gap-4 p-6 ${s.options.animations ? "" : "sans-animation"}`}>
        {fond}
        {/* En-tête sans cadre : logo et titre flottent sur le fond, avec une ombre portée pour rester lisibles. */}
        <header className="flex flex-wrap items-center justify-between gap-4 px-1">
          <div className="flex items-center gap-4">
            <Logo taille={68} anime />
            <h1 className="text-4xl font-extrabold tracking-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)" }}>
              Lign<span className="text-accent-clair">é</span>e
            </h1>
          </div>
          <div className="surface flex flex-wrap items-center gap-1.5 rounded-2xl border border-border p-1.5">
            <div data-tuto="familles" className="flex flex-wrap gap-1.5">
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
                      <span className="block h-full rounded-full bg-linear-to-r from-accent-fonce to-accent-clair" style={{ width: `${(100 * n) / total}%` }} />
                    </span>
                  </span>
                </button>
              );
            })}
            </div>
            <span data-tuto="annuler">
              <BoutonAnnuler possibles={demo ? historiqueDemo.length : historique.length} />
            </span>

            <button
              data-tuto="compagnon"
              onClick={() => basculerCompagnon(true)}
              title="Fenêtre compacte gardée au premier plan, à côté du jeu"
              className="rounded-xl px-3 py-2.5 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            >
              ⤡ Mode compagnon
            </button>
          </div>
        </header>
        <BandeauAlmanax jour={almanax.jour} aujourdhui={almanax.aujourdhui} demain={almanax.demain} />
        {calendrier && almanax.prochains.length > 0 && <CalendrierAlmanax jour={almanax.jour} liste={almanax.prochains} fermer={() => setCalendrier(false)} />}
        {maj && <BandeauMiseAJour maj={maj} fermer={() => setMaj(null)} voirNouveautes={() => setNouveautes({ ouvert: true })} />}
      {nouveautes.ouvert && <NotesDeVersion miseEnAvant={nouveautes.version} fermer={fermerNouveautes} />}
        {!s.options.didacticiel && !tutoReporte && !tuto && !nouveautes.ouvert && (
          <ProposerDidacticiel commencer={() => lancerTuto("decouverte")} plusTard={() => setTutoReporte(true)} refuser={() => fixerTuto("refuse")} />
        )}
        {recherche && <RechercheRapide resultats={resultatsRecherche()} fermer={() => setRecherche(false)} />}
        {tuto && <Didacticiel chapitre={tuto} s={sv} allerA={allerA} fermer={fermerTuto} lancer={lancerTuto} />}
        {demo && (
          <div className="pointer-events-none fixed left-1/2 top-3 z-[61] -translate-x-1/2 rounded-full border border-accent/60 bg-bg-card px-4 py-1.5 text-xs font-medium text-accent shadow-xl">
            Démo : étable d'exemple. Ta vraie étable revient à la fin de la visite.
          </div>
        )}
        <nav data-tuto="onglets" className="surface flex flex-wrap gap-1.5 rounded-2xl border border-border p-1.5">
          {(Object.keys(ONGLETS) as Onglet[]).map((o) => {
            const Icone = ICONES_ONGLETS[o];
            const actif = o === onglet;
            return (
              <button
                key={o}
                onClick={() => setOnglet(o)}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[15px] font-medium transition ${
                  actif
                    ? "bg-linear-to-b from-accent-clair to-accent text-accent-texte shadow-[0_4px_18px_color-mix(in_srgb,var(--color-accent)_40%,transparent)]"
                    : "text-text-primary/80 hover:bg-white/8 hover:text-text-primary"
                }`}
              >
                <Icone taille={19} />
                {ONGLETS[o]}
              </button>
            );
          })}
          <span className="flex-1" />
          <button
            data-tuto="recherche"
            onClick={() => setRecherche(true)}
            title="Recherche rapide : une couleur, un onglet, un réglage (Ctrl+K)"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-text-secondary hover:bg-white/8 hover:text-text-primary"
          >
            ⌕ Rechercher
            <kbd className="rounded border border-border-light px-1.5 text-[11px] text-text-muted">Ctrl K</kbd>
          </button>
          {almanax.prochains.length > 0 && (
            <button
              data-tuto="almanax"
              onClick={() => setCalendrier((x) => !x)}
              title="Prochains bonus d'élevage de l'Almanax (45 jours)"
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm hover:bg-white/8 hover:text-text-primary ${calendrier ? "text-accent" : "text-text-secondary"}`}
            >
              🌙 Almanax
            </button>
          )}
          <button
            data-tuto="aide"
            onClick={() => lancerTuto(chapitreDeLOnglet(onglet))}
            title={`Visite guidée : ${CHAPITRES[chapitreDeLOnglet(onglet)].titre}`}
            className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-text-secondary hover:bg-white/8 hover:text-text-primary"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold">?</span>
            Aide
          </button>
        </nav>
        {erreur && <div className="rounded-md bg-status-err/15 p-2 text-sm text-status-err">Sauvegarde impossible : {erreur}</div>}
        {/* Voile commun derrière chaque écran : lisibilité uniforme quelle que soit l'image de fond. */}
        <main data-tuto="ecran" className="surface rounded-2xl border border-border p-4">
          {onglet === "actions" && <TableauDeBord {...props} />}
          {onglet === "etable" && <Etable key={`${famille}-${demo ? "demo" : "reel"}`} {...props} />}
          {onglet === "enclos" && <OngletEnclos s={s} setS={majReel} />}
          {onglet === "arbre" && <Arbre key={`${famille}-${focusArbre?.id}`} famille={famille} s={sv} focus={focusArbre?.f === famille ? focusArbre.id : null} />}
          {onglet === "succes" && <Succes {...props} setFamille={setFamille} />}
          {onglet === "guide" && <Guide allerA={allerA} lancerVisite={lancerTuto} />}
          {onglet === "parametres" && <Parametres s={s} setS={majReel} lancerDidacticiel={lancerTuto} />}
        </main>
      </div>
    </FournisseurNotifications>
  );
}
