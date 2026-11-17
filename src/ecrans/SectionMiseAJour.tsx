import { useEffect, useState } from "react";
import { chercherMiseAJour, versionActuelle, type MiseAJour } from "../miseAJour";
import { BarreChargement, Bouton, Carte } from "../ui";
import { BandeauMiseAJour } from "./BandeauMiseAJour";
import { NotesDeVersion } from "./NotesDeVersion";

/** Version installée et recherche manuelle de mise à jour. */
export function SectionMiseAJour() {
  const [version, setVersion] = useState<string | null>(null);
  const [etat, setEtat] = useState<"" | "recherche" | "ajour" | "erreur">("");
  const [maj, setMaj] = useState<MiseAJour | null>(null);
  const [notes, setNotes] = useState(false);
  useEffect(() => {
    versionActuelle().then(setVersion);
  }, []);
  const chercher = async () => {
    setEtat("recherche");
    try {
      const m = await chercherMiseAJour();
      setMaj(m);
      setEtat(m ? "" : "ajour");
    } catch {
      setEtat("erreur");
    }
  };
  return (
    <Carte tuto="mises-a-jour" titre="Mises à jour">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Version installée : {version ?? "version navigateur"}</div>
          <div className="text-xs text-text-muted">
            Lignée vérifie au démarrage si une nouvelle version est publiée sur GitHub, et propose de l'installer en un clic.
            {etat === "ajour" && <span className="ml-1 text-status-ok">✓ Tu as la dernière version.</span>}
            {etat === "erreur" && <span className="ml-1 text-status-err">Vérification impossible (connexion Internet ?).</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Bouton discret onClick={() => setNotes(true)}>
            Voir les nouveautés
          </Bouton>
          <Bouton discret onClick={chercher} disabled={etat === "recherche" || !version}>
            {etat === "recherche" ? "Recherche…" : "Rechercher une mise à jour"}
          </Bouton>
        </div>
      </div>
      {etat === "recherche" && <BarreChargement className="mt-3" />}
      {notes && <NotesDeVersion fermer={() => setNotes(false)} />}
      {maj && (
        <div className="mt-3">
          <BandeauMiseAJour maj={maj} fermer={() => setMaj(null)} voirNouveautes={() => setNotes(true)} />
        </div>
      )}
    </Carte>
  );
}
