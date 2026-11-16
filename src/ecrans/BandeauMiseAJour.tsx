import { useState } from "react";
import { journaliser } from "../diagnostic";
import type { MiseAJour } from "../miseAJour";
import { BarreChargement, Bouton } from "../ui";

/** Bandeau affiché quand une nouvelle version est disponible : installer et redémarrer, ou plus tard. */
export function BandeauMiseAJour({ maj, fermer, voirNouveautes }: { maj: MiseAJour; fermer: () => void; voirNouveautes?: () => void }) {
  const [etat, setEtat] = useState<"attente" | "installation" | "erreur">("attente");
  const [pct, setPct] = useState<number | null>(null);
  const [erreur, setErreur] = useState("");
  const installer = async () => {
    setEtat("installation");
    journaliser("info", `Installation de la mise à jour ${maj.version}`);
    try {
      await maj.installer(setPct);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      journaliser("erreur", `Échec de la mise à jour ${maj.version} : ${e instanceof Error ? e.message : String(e)}`);
      setEtat("erreur");
    }
  };
  return (
    <div className="surface flex flex-wrap items-center gap-3 rounded-2xl border border-accent/50 px-4 py-3 shadow-[0_0_24px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]">
      <span className="text-xl">⬆</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">
          Lignée <span className="text-accent">{maj.version}</span> est disponible
        </div>
        {etat === "erreur" ? (
          <div className="text-xs text-status-err">Échec de la mise à jour : {erreur}</div>
        ) : etat === "installation" ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
            <BarreChargement pct={pct} className="w-48" />

            {pct === null ? "Téléchargement…" : `${pct} %`} — l'application redémarrera toute seule
          </div>
        ) : (
          maj.notes && <div className="line-clamp-1 text-xs text-text-muted">{maj.notes.replace(/[#*>]/g, "").split("\n").find((l) => l.trim()) ?? ""}</div>
        )}
      </div>
      {etat !== "installation" && (
        <>
          {voirNouveautes && (
            <button className="text-sm text-accent hover:underline" onClick={voirNouveautes}>
              Voir les nouveautés
            </button>
          )}
          <Bouton onClick={installer}>Installer et redémarrer</Bouton>
          <Bouton discret onClick={fermer}>
            Plus tard
          </Bouton>
        </>
      )}
    </div>
  );
}
