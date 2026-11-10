// Notifications discrètes en bas à droite (« Naissance enregistrée · Annuler »).
// Le bouton Annuler n'est proposé que sur la dernière modification (sinon il annulerait autre chose).
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type TonNotification = "succes" | "info" | "erreur";

interface Notification {
  id: number;
  texte: string;
  ton: TonNotification;
  /** Longueur de l'historique d'annulation juste après la modification notifiée. */
  etape?: number;
}

interface Contexte {
  /** `annulable` : la notification suit une modification de la sauvegarde (bouton Annuler). */
  notifier: (texte: string, options?: { ton?: TonNotification; annulable?: boolean }) => void;
}

const Ctx = createContext<Contexte>({ notifier: () => {} });
export const useNotifier = () => useContext(Ctx).notifier;

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
    const id = suivant.current++;
    setListe((l) => [...l.slice(-3), { id, texte, ton: o.ton ?? "succes", etape: o.annulable ? historiqueRef.current + 1 : undefined }]);
  }, []);

  return (
    <Ctx.Provider value={{ notifier }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 flex-col gap-2">
        {liste.map((n) => (
          <Toast key={n.id} n={n} annulable={n.etape !== undefined && n.etape === historique} annuler={annuler} fermer={() => retirer(n.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function Toast({ n, annulable, annuler, fermer }: { n: Notification; annulable: boolean; annuler: () => void; fermer: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(fermer, DUREE);
    return () => window.clearTimeout(t);
  }, [fermer]);
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
            fermer();
          }}
        >
          Annuler
        </button>
      )}
      <button className="shrink-0 text-text-muted hover:text-text-primary" onClick={fermer} aria-label="Fermer">
        ×
      </button>
      <span className="toast-duree absolute inset-x-0 bottom-0 h-0.5" style={{ background: COULEUR[n.ton], animationDuration: `${DUREE}ms` }} />
    </div>
  );
}
