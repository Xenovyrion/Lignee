import { useEffect, useState, type ReactNode } from "react";
import type { Sauvegarde } from "../moteur/types";
import { useNotifier } from "../notifications";
import {
  exporter,
  importer,
  lireCopie,
  listerCopies,
  type CopieAuto,
} from "../sauvegardes";
import {
  choisirDossier,
  cloudDisponible,
  copierVersCloud,
  detecterDossiers,
  ecrireCloud,
  FOURNISSEURS,
  lireCloud,
  lireCopieCloud,
  listerCopiesCloud,
  type ConfigCloud,
  type DossierCloud,
  type Fournisseur,
} from "../cloud";
import { Bouton, Carte, champ } from "../ui";

interface Props {
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

const resume = (x: Sauvegarde) => {
  const couleurs = Object.values(x.obtenues).reduce((n, l) => n + l.length, 0);
  return `${x.montures.length} montures, ${couleurs} couleurs obtenues, ${x.journal.length} naissances enregistrées`;
};

const dateFr = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const Ligne = ({
  titre,
  aide,
  children,
}: {
  titre: string;
  aide: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-6 border-t border-border py-3 first:border-t-0 first:pt-0">
    <div>
      <div className="text-sm font-medium">{titre}</div>
      <div className="text-xs text-text-muted">{aide}</div>
    </div>
    <div className="flex shrink-0 items-center gap-2">{children}</div>
  </div>
);

/** Export, import et copies automatiques de la sauvegarde. */
export function SectionSauvegardes({ s, setS }: Props) {
  const [copies, setCopies] = useState<CopieAuto[]>([]);
  const [choix, setChoix] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(
    null,
  );

  useEffect(() => {
    listerCopies()
      .then((l) => {
        setCopies(l);
        setChoix(l[0]?.nom ?? "");
      })
      .catch(() => setCopies([]));
  }, []);

  const notifier = useNotifier();
  const agir = async (f: () => Promise<string | null>) => {
    try {
      const texte = await f();
      if (texte) {
        setMessage({ ok: true, texte });
        notifier(texte, {
          annulable: texte.startsWith("Données restaurées"),
          ton: texte.startsWith("Données restaurées") ? "succes" : "info",
        });
      }
    } catch (e) {
      const texte = e instanceof Error ? e.message : String(e);
      setMessage({ ok: false, texte });
      notifier(texte, { ton: "erreur" });
    }
  };

  const remplacer = (x: Sauvegarde, origine: string) => {
    if (
      !window.confirm(
        `Remplacer les données actuelles par ${origine} ?\n\n${resume(x)}\n\n(Le bouton « ↶ Annuler » permet de revenir en arrière.)`,
      )
    )
      return null;
    setS(() => x);
    return `Données restaurées depuis ${origine} : ${resume(x)}.`;
  };

  // Sauvegarde cloud (réglage propre à ce PC).
  const [cloud, setCloud] = useState<ConfigCloud | null>(lireCloud);
  const [detectes, setDetectes] = useState<DossierCloud[]>([]);
  const [copiesCloud, setCopiesCloud] = useState<string[]>([]);
  const [choixCloud, setChoixCloud] = useState("");
  useEffect(() => {
    detecterDossiers()
      .then(setDetectes)
      .catch(() => setDetectes([]));
  }, []);
  const rafraichirCloud = (c: ConfigCloud | null) => {
    if (!c?.actif) return setCopiesCloud([]);
    listerCopiesCloud(c)
      .then((l) => {
        setCopiesCloud(l);
        setChoixCloud(l[0] ?? "");
      })
      .catch(() => setCopiesCloud([]));
  };
  useEffect(() => rafraichirCloud(cloud), [cloud?.actif, cloud?.dossier]); // eslint-disable-line react-hooks/exhaustive-deps
  const regler = (c: ConfigCloud | null) => {
    ecrireCloud(c);
    setCloud(c);
  };
  /** Copie immédiate, puis mise à jour de la liste et de l'heure de la dernière copie. */
  const copierMaintenant = async (c: ConfigCloud) => {
    await copierVersCloud(s, c);
    setCloud(lireCloud());
    rafraichirCloud(c);
    return `Sauvegarde copiée dans ${FOURNISSEURS[c.fournisseur]}.`;
  };
  const dossierDe = (f: Fournisseur) =>
    detectes.find((d) => d.fournisseur === f)?.chemin;
  const changerFournisseur = async (f: Fournisseur) => {
    const dossier = f === "autre" ? await choisirDossier() : dossierDe(f);
    if (!dossier) {
      if (f !== "autre")
        throw new Error(
          `${FOURNISSEURS[f]} n'est pas installé sur ce PC (ou pas connecté). Installe son application pour ordinateur, ou choisis « Autre dossier ».`,
        );
      return null;
    }
    const c: ConfigCloud = { actif: true, fournisseur: f, dossier };
    regler(c);
    return copierMaintenant(c);
  };
  const activerCloud = async (actif: boolean) => {
    if (!actif) {
      if (cloud) regler({ ...cloud, actif: false });
      return "Sauvegarde cloud désactivée.";
    }
    if (cloud?.dossier) {
      const c = { ...cloud, actif: true };
      regler(c);
      return copierMaintenant(c);
    }
    const premier =
      detectes.find((d) => d.fournisseur === "onedrive") ?? detectes[0];
    return changerFournisseur(premier?.fournisseur ?? "autre");
  };
  const restaurerCloud = async () =>
    cloud && choixCloud
      ? remplacer(
          await lireCopieCloud(cloud, choixCloud),
          `la copie cloud du ${dateFr(choixCloud.slice(7, 17))}`,
        )
      : null;

  const exporterFichier = async () =>
    (await exporter(s)) ? "Sauvegarde exportée." : null;
  const importerFichier = async () => {
    const x = await importer();
    return x && remplacer(x, "le fichier choisi");
  };
  const restaurer = async () => {
    const c = copies.find((x) => x.nom === choix);
    return c
      ? remplacer(await lireCopie(c), `la copie du ${dateFr(c.date)}`)
      : null;
  };

  return (
    <Carte tuto="sauvegardes" titre="Sauvegardes">
      <Ligne
        titre="Exporter une sauvegarde"
        aide={`Crée un fichier .json à garder où tu veux (clé USB, cloud…). Actuellement : ${resume(s)}.`}
      >
        <Bouton onClick={() => agir(exporterFichier)}>Exporter…</Bouton>
      </Ligne>
      <Ligne
        titre="Importer une sauvegarde"
        aide="Remplace les données actuelles par celles d'un fichier exporté."
      >
        <Bouton discret onClick={() => agir(importerFichier)}>
          Importer…
        </Bouton>
      </Ligne>
      <Ligne
        titre="Copies automatiques"
        aide="Une copie par jour, faite au démarrage ; les 15 plus récentes sont gardées."
      >
        {copies.length ? (
          <>
            <select
              className={champ}
              value={choix}
              onChange={(e) => setChoix(e.target.value)}
            >
              {copies.map((c) => (
                <option key={c.nom} value={c.nom}>
                  {dateFr(c.date)}
                </option>
              ))}
            </select>
            <Bouton discret onClick={() => agir(restaurer)}>
              Restaurer
            </Bouton>
          </>
        ) : (
          <span className="text-xs text-text-muted">
            Aucune copie pour l'instant.
          </span>
        )}
      </Ligne>
      {cloudDisponible && (
        <Ligne
          titre="Sauvegarde cloud"
          aide="Copie ta sauvegarde dans OneDrive ou Google Drive (leur application pour ordinateur l'envoie en ligne) : au démarrage, puis au plus toutes les 5 minutes pendant que tu joues. Les 30 derniers jours sont gardés."
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-accent"
            checked={!!cloud?.actif}
            onChange={(e) => agir(() => activerCloud(e.target.checked))}
          />
        </Ligne>
      )}
      {cloud?.actif && (
        <>
          <Ligne
            titre="Fournisseur"
            aide={`Dossier : ${cloud.dossier}\\Lignée`}
          >
            <select
              className={champ}
              value={cloud.fournisseur}
              onChange={(e) =>
                agir(() => changerFournisseur(e.target.value as Fournisseur))
              }
            >
              {(Object.keys(FOURNISSEURS) as Fournisseur[]).map((f) => (
                <option key={f} value={f}>
                  {FOURNISSEURS[f]}
                  {f !== "autre" && !dossierDe(f) ? " (non trouvé)" : ""}
                </option>
              ))}
            </select>
            {cloud.fournisseur === "autre" && (
              <Bouton
                discret
                onClick={() => agir(() => changerFournisseur("autre"))}
              >
                Choisir…
              </Bouton>
            )}
          </Ligne>
          <Ligne
            titre="Copies dans le cloud"
            aide={`${cloud.derniere ? `Dernière copie : ${new Date(cloud.derniere).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}.` : "Pas encore de copie."} Sur un nouveau PC : active la sauvegarde cloud, puis restaure la plus récente.`}
          >
            {copiesCloud.length > 0 && (
              <>
                <select
                  className={champ}
                  value={choixCloud}
                  onChange={(e) => setChoixCloud(e.target.value)}
                >
                  {copiesCloud.map((n) => (
                    <option key={n} value={n}>
                      {dateFr(n.slice(7, 17))}
                    </option>
                  ))}
                </select>
                <Bouton discret onClick={() => agir(restaurerCloud)}>
                  Restaurer
                </Bouton>
              </>
            )}
            <Bouton discret onClick={() => agir(() => copierMaintenant(cloud))}>
              Copier maintenant
            </Bouton>
          </Ligne>
        </>
      )}
      {message && (
        <p
          className={`mt-2 text-sm ${message.ok ? "text-status-ok" : "text-status-err"}`}
        >
          {message.texte}
        </p>
      )}
    </Carte>
  );
}
