// Paramètres des minuteurs d'enclos : saisie des jauges, notifications Windows et Discord.
// Chaque réglage est propre à cet utilisateur : Windows est dans sa sauvegarde, Discord (adresse du relais
// et clé personnelle) reste sur ce PC.
import { useState } from "react";
import type { Options, Sauvegarde } from "../moteur/types";
import { useNotifier } from "../notifications";
import { ecrireRelais, lireConfigRelais, synchroniserRelais, testerRelais, urlRelaisValide } from "../relais";
import { Bouton, Carte, champ } from "../ui";
import { Ligne } from "./Parametres";

const DOC = "https://github.com/Xenovyrion/Lignee/blob/main/docs/RELAIS_DISCORD.md";

const Choix = <T extends string>({ valeur, options, choisir }: { valeur: T; options: [T, string][]; choisir: (v: T) => void }) => (
  <div className="flex rounded-lg border border-border-light p-0.5 text-sm">
    {options.map(([v, l]) => (
      <button key={v} onClick={() => choisir(v)} className={`rounded-md px-3 py-1 ${valeur === v ? "bg-accent-dim text-accent" : "text-text-secondary"}`}>
        {l}
      </button>
    ))}
  </div>
);

export function SectionEnclos({ s, maj }: { s: Sauvegarde; maj: (o: Partial<Options>) => void }) {
  const notifier = useNotifier();
  const o = s.options;
  const [enregistre, setEnregistre] = useState(lireConfigRelais());
  const [url, setUrl] = useState(enregistre?.url ?? "");
  const [cle, setCle] = useState(enregistre?.cle ?? "");
  const [etat, setEtat] = useState<{ ok: boolean; texte: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const saisie = { url: url.trim().replace(/\/+$/, ""), cle: cle.trim() };
  const valide = urlRelaisValide(saisie.url) && saisie.cle.length >= 32;
  const actif = !!enregistre && enregistre.actif !== false;
  const modifie = !enregistre || enregistre.url !== saisie.url || enregistre.cle !== saisie.cle;

  /** Programme (actif) ou annule (inactif) les minuteurs en cours sur le relais. */
  const synchroniserTout = (programmer: boolean) => {
    for (let k = 1; k <= 6; k++) void synchroniserRelais(k, programmer ? s.minuteurs?.find((m) => m.enclos === k) : undefined);
  };
  const tester = async () => {
    setOccupe(true);
    const r = await testerRelais(saisie);
    setOccupe(false);
    setEtat(r.ok ? { ok: true, texte: "Message de test envoyé : vérifie Discord." } : { ok: false, texte: r.erreur ?? "échec" });
  };
  const enregistrer = () => {
    const c = { ...saisie, actif: true };
    ecrireRelais(c);
    setEnregistre(c);
    synchroniserTout(true);
    notifier("Notifications Discord activées", { ton: "succes" });
  };
  const activer = (oui: boolean) => {
    if (!enregistre) return;
    // Désactivation : on annule d'abord avec la configuration active, puis on la marque inactive.
    if (!oui) synchroniserTout(false);
    const c = { ...enregistre, actif: oui };
    ecrireRelais(c);
    setEnregistre(c);
    if (oui) synchroniserTout(true);
    notifier(oui ? "Notifications Discord activées" : "Notifications Discord coupées (configuration gardée)", { ton: "info" });
  };
  const oublier = () => {
    if (actif) synchroniserTout(false);
    ecrireRelais(null);
    setEnregistre(null);
    setUrl("");
    setCle("");
    setEtat(null);
    notifier("Relais Discord retiré de Lignée", { ton: "info" });
  };

  return (
    <Carte titre="Minuteurs d'enclos">
      <Ligne titre="Saisie des jauges" aide="Simple : la barre se cale sur les paliers et demi-paliers (T1 ½, T1 plein… T4 plein). Avancée : valeur exacte, lue en jeu en survolant la jauge.">
        <Choix
          valeur={o.saisieJauges ?? "palier"}
          options={[
            ["palier", "Simple"],
            ["exacte", "Avancée"],
          ]}
          choisir={(v) => maj({ saisieJauges: v })}
        />
      </Ligne>
      <Ligne titre="Notifications Windows" aide="Enclos prêt, sérénité hors zone, jauge vide. Seulement quand Lignée est ouverte (sinon dès sa réouverture).">
        <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.notifWindows !== false} onChange={(e) => maj({ notifWindows: e.target.checked })} />
      </Ligne>
      <Ligne
        titre="Notifications Discord"
        aide={enregistre ? "Les mêmes alertes sur Discord, même Lignée fermée, avec une mention pour toi seul." : "Nécessite un relais : renseigne-le ci-dessous."}
      >
        <input type="checkbox" className="h-4 w-4 accent-accent" disabled={!enregistre} checked={actif} onChange={(e) => activer(e.target.checked)} />
      </Ligne>
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="text-xs text-text-muted">
          Le relais est installé une fois, par toi ou par un membre de ta guilde, puis partagé. Celui qui le gère te donne son <b>adresse</b> et une <b>clé personnelle</b>{" "}
          (en échange de ton identifiant Discord) : les messages ne mentionnent que toi. Pas besoin d'être administrateur du Discord. Mise en place :{" "}
          <a href={DOC} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            guide du relais Discord
          </a>
          . L'adresse et la clé restent sur ce PC : ni dans la sauvegarde, ni dans les exports.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${champ} min-w-0 flex-1 text-xs`} placeholder="Adresse du relais (https://….workers.dev)" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
          <input className={`${champ} w-64 text-xs`} type="password" placeholder="Ta clé personnelle" value={cle} onChange={(e) => setCle(e.target.value)} autoComplete="off" />
        </div>
        {url && !urlRelaisValide(saisie.url) && <div className="text-xs text-status-err">Adresse invalide : https uniquement, sans chemin.</div>}
        {cle && saisie.cle.length < 32 && <div className="text-xs text-status-err">Clé trop courte (32 caractères minimum).</div>}
        <div className="flex flex-wrap items-center gap-2">
          <Bouton discret disabled={!valide || occupe} onClick={tester}>
            Tester
          </Bouton>
          <Bouton disabled={!valide || !modifie} onClick={enregistrer}>
            Enregistrer
          </Bouton>
          {enregistre && (
            <Bouton discret onClick={oublier}>
              Oublier ce relais
            </Bouton>
          )}
          {etat && <span className={`text-xs ${etat.ok ? "text-status-ok" : "text-status-err"}`}>{etat.texte}</span>}
        </div>
      </div>
    </Carte>
  );
}
