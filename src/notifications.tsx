// Notifications discrètes en bas à droite (« Naissance enregistrée · Annuler »).
// Le bouton Annuler n'est proposé que sur la dernière modification (sinon il annulerait autre chose).
import { journaliser } from "./diagnostic";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type TonNotification = "succes" | "info" | "erreur";

interface Notification {
  id: number;
  texte: string;
  ton: TonNotification;
  /** Longueur de l'historique d'annulation juste après la modification notifiée. */
  etape?: number;
  /** Notifications de même clé fusionnées (clics rapides sur ± par exemple). */
  cle?: string;
  /** Incrémentée à chaque mise à jour : relance le délai d'affichage. */
  version: number;
}

interface OptionsNotification {
  ton?: TonNotification;
  /** La notification suit une modification de la sauvegarde : bouton Annuler. */
  annulable?: boolean;
  /** Remplace la notification de même clé encore affichée au lieu d'en empiler une nouvelle. */
  cle?: string;
}

interface Contexte {
  notifier: (texte: string, options?: OptionsNotification) => void;
  /** Annule la dernière modification et le signale. */
  annuler: () => void;
}

const Ctx = createContext<Contexte>({ notifier: () => {}, annuler: () => {} });
export const useNotifier = () => useContext(Ctx).notifier;
export const useAnnuler = () => useContext(Ctx).annuler;

const DUREE = 5500;
const COULEUR: Record<TonNotification, string> = { succes: "#22c55e", info: "var(--color-accent)", erreur: "#ef4444" };
const ICONE: Record<TonNotification, string> = { succes: "✓", info: "•", erreur: "!" };

export function FournisseurNotifications({ children, historique, annuler }: { children: ReactNode; historique: number; annuler: () => void }) {
  const [liste, setListe] = useState<Notification[]>([]);
  const suivant = useRef(1);
  // La modification est appliquée juste après l'appel : l'historique aura alors un élément de plus.
  const historiqueRef = useRef(historique);
  historiqueRef.current = historique;

  const retirer = useCallback((id: number) => setListe((l) => l.filter((n) => n.id !== id)), []);
  const notifier = useCallback<Contexte["notifier"]>((texte, o = {}) => {
    journaliser(o.ton === "erreur" ? "erreur" : "action", texte);
    const etape = o.annulable ? historiqueRef.current + 1 : undefined;
    setListe((l) => {
      const meme = o.cle ? l.find((n) => n.cle === o.cle) : undefined;
      if (meme) return [...l.filter((n) => n !== meme), { ...meme, texte, ton: o.ton ?? meme.ton, etape, version: meme.version + 1 }];
      return [...l.slice(-3), { id: suivant.current++, texte, ton: o.ton ?? "succes", etape, cle: o.cle, version: 0 }];
    });
  }, []);
  const annulerNotifie = useCallback(() => {
    if (historiqueRef.current <= 0) return;
    annuler();
    notifier("Dernière modification annulée", { ton: "info", cle: "annulation" });
  }, [annuler, notifier]);
  const valeur = useMemo(() => ({ notifier, annuler: annulerNotifie }), [notifier, annulerNotifie]);

  return (
    <Ctx.Provider value={valeur}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
        {liste.map((n) => (
          <Toast key={n.id} n={n} annulable={n.etape !== undefined && n.etape === historique} annuler={annulerNotifie} retirer={retirer} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function Toast({ n, annulable, annuler, retirer }: { n: Notification; annulable: boolean; annuler: () => void; retirer: (id: number) => void }) {
  // Le délai repart à chaque mise à jour de la notification (même clé).
  useEffect(() => {
    const t = window.setTimeout(() => retirer(n.id), DUREE);
    return () => window.clearTimeout(t);
  }, [n.id, n.version, retirer]);
  return (
    <div className="toast pointer-events-auto flex items-center gap-3 overflow-hidden rounded-xl border border-border-light bg-bg-card px-3 py-2.5 text-sm shadow-[0_10px_30px_rgba(0,0,0,0.45)] backdrop-blur">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-black" style={{ background: COULEUR[n.ton] }}>
        {ICONE[n.ton]}
      </span>
      <span className="min-w-0 flex-1">{n.texte}</span>
      {annulable && (
        <button
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-accent hover:bg-accent-dim"
          onClick={() => {
            annuler();
            retirer(n.id);
          }}
        >
          Annuler
        </button>
      )}
      <button className="shrink-0 text-text-muted hover:text-text-primary" onClick={() => retirer(n.id)} aria-label="Fermer">
        ×
      </button>
      <span key={n.version} className="toast-duree absolute inset-x-0 bottom-0 h-0.5" style={{ background: COULEUR[n.ton], animationDuration: `${DUREE}ms` }} />
    </div>
  );
}
