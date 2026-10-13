import { useState } from "react";
import { enregistrerNaissance, type Bebe } from "../../moteur/actions";
import type { ActionAccouplement } from "../../moteur/conseils";
import { couleur, nomCouleur } from "../../moteur/donnees";
import { cible, probaCible } from "../../moteur/regles";
import type { Famille, Makina, Monture, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, ChoixCouleur, champ, libelleMonture, pourcent } from "../../ui";

type SetS = (f: (s: Sauvegarde) => Sauvegarde) => void;

const NOM_MAKINA: Record<Makina, string> = { optimakina: "Optimakina", animakina: "Animakina", kromakina: "Kromakina" };

/** Carte d'un accouplement proposé par le plan (prêt ou à préparer). */
export function CarteAccouplement({ famille, a, setS }: { famille: Famille; a: ActionAccouplement; setS: SetS }) {
  const [ouvert, setOuvert] = useState(false);
  const pret = a.aPreparer.length === 0;
  const { e } = a;
  return (
    <li className={`rounded-lg border p-3 ${pret ? "border-status-ok/30 bg-status-ok/5" : "border-border bg-bg-secondary"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">
              G{e.generation} {nomCouleur(famille, e.couleur)}
            </span>
            {e.pour === "succes" ? (
              <span className="rounded bg-accent-dim px-1.5 text-xs text-accent">succès</span>
            ) : (
              <span className="rounded bg-bg-hover px-1.5 text-xs text-text-muted">pour la suite</span>
            )}
            {a.debloque > 0 && <span className="text-xs text-text-muted">débloque {a.debloque} étape{a.debloque > 1 ? "s" : ""}</span>}
            {e.sexeVoulu && <span className="text-xs text-text-secondary">· viser {e.sexeVoulu === "M" ? "un mâle ♂" : "une femelle ♀"}</span>}
          </div>
          <div className="mt-0.5 text-sm text-text-secondary">
            {libelleMonture(a.pere)} × {libelleMonture(a.mere)}
          </div>
          <div className="mt-1 text-xs">
            <span className="text-text-secondary">{NOM_MAKINA[a.makina.makina]}</span>
            <span className={`ml-1 font-medium ${a.makina.chance >= 1 ? "text-status-ok" : a.makina.chance >= 0.8 ? "text-text-primary" : "text-status-warn"}`}>
              {pourcent(a.makina.chance)}
            </span>
            <span className="ml-1 text-text-muted">— {a.makina.raison}</span>
          </div>
          {!pret && (
            <div className="mt-1 text-xs text-status-warn">
              Remplir les jauges (Endurance, Maturité, Amour) : {a.aPreparer.map((m) => libelleMonture(m)).join(", ")}
            </div>
          )}
          {a.niveauConseille && (
            <div className="mt-0.5 text-xs text-text-muted">
              Pour 100 % avec Optimakina : niveaux cumulés {a.niveauConseille} (actuellement {a.pere.niveau + a.mere.niveau})
            </div>
          )}
        </div>
        <Bouton discret={!pret} onClick={() => setOuvert(!ouvert)}>
          {ouvert ? "Annuler" : "Enregistrer la naissance"}
        </Bouton>
      </div>
      {ouvert && <FormResultat famille={famille} pere={a.pere} mere={a.mere} makina={a.makina.makina} sexe={e.sexeVoulu} setS={setS} fermer={() => setOuvert(false)} />}
    </li>
  );
}

export function FormResultat(p: { famille: Famille; pere: Monture; mere: Monture; makina?: Makina; sexe?: Sexe; setS: SetS; fermer: () => void }) {
  const attendue = cible(p.famille, p.pere, p.mere)?.couleurs[0] ?? p.pere.couleur;
  const [bebes, setBebes] = useState<Bebe[]>([{ couleur: attendue, sexe: p.sexe ?? "F" }]);
  const [makina, setMakina] = useState<Makina | "">(p.makina ?? "optimakina");
  const maj = (i: number, champs: Partial<Bebe>) => setBebes(bebes.map((b, j) => (j === i ? { ...b, ...champs } : b)));
  const valider = () => {
    try {
      p.setS((s) => enregistrerNaissance(s, p.pere.id, p.mere.id, bebes, makina || undefined));
      p.fermer();
    } catch (err) {
      alert((err as Error).message);
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3 text-sm">
      {bebes.map((b, i) => (
        <div key={i} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            Bébé {i + 1} — couleur obtenue
            <ChoixCouleur famille={p.famille} value={b.couleur} onChange={(e) => maj(i, { couleur: e.target.value })} />
          </label>
          <select className={champ} value={b.sexe} onChange={(e) => maj(i, { sexe: e.target.value as Sexe })}>
            <option value="F">♀</option>
            <option value="M">♂</option>
          </select>
        </div>
      ))}
      <label className="flex items-center gap-1 text-xs text-text-secondary">
        <input type="checkbox" checked={bebes.length === 2} onChange={(e) => setBebes(e.target.checked ? [...bebes, { couleur: attendue, sexe: "M" }] : bebes.slice(0, 1))} />
        2ᵉ bébé (Reproducteur)
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-secondary">
        Makina utilisée
        <select className={champ} value={makina} onChange={(e) => setMakina(e.target.value as Makina | "")}>
          {Object.entries(NOM_MAKINA).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
          <option value="">Aucune</option>
        </select>
      </label>
      <Bouton onClick={valider}>Valider</Bouton>
      <span className="text-xs text-text-muted">Les parents passent stériles ; le succès est coché si la couleur est nouvelle.</span>
    </div>
  );
}

/** Accouplement choisi librement, hors plan. */
export function AccouplementLibre({ famille, s, setS }: { famille: Famille; s: Sauvegarde; setS: SetS }) {
  const [pereId, setPereId] = useState("");
  const [mereId, setMereId] = useState("");
  const dispo = s.montures.filter((m) => m.famille === famille && m.etat !== "sterile");
  const pere = dispo.find((m) => m.id === pereId);
  const mere = dispo.find((m) => m.id === mereId);
  const c = pere && mere ? cible(famille, pere, mere) : null;
  const options = (sexe: Sexe) =>
    dispo
      .filter((m) => m.sexe === sexe)
      .sort((x, y) => couleur(famille, x.couleur).generation - couleur(famille, y.couleur).generation || y.niveau - x.niveau)
      .map((m) => (
        <option key={m.id} value={m.id}>
          {libelleMonture(m)}
        </option>
      ));
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <select className={champ} value={pereId} onChange={(e) => setPereId(e.target.value)}>
          <option value="">— mâle —</option>
          {options("M")}
        </select>
        ×
        <select className={champ} value={mereId} onChange={(e) => setMereId(e.target.value)}>
          <option value="">— femelle —</option>
          {options("F")}
        </select>
        {pere && mere && (
          <span className="text-text-secondary">
            {c
              ? `Cible G${c.generation} : ${c.couleurs.map((x) => nomCouleur(famille, x)).join(" / ")} — ${pourcent(probaCible(pere.niveau, mere.niveau, { optimakina: true, takeza: s.options.takeza }))} avec Optimakina`
              : "Aucune recette : le bébé aura une couleur de son arbre"}
          </span>
        )}
      </div>
      {pere && mere && <FormResultat key={pere.id + mere.id} famille={famille} pere={pere} mere={mere} setS={setS} fermer={() => (setPereId(""), setMereId(""))} />}
    </div>
  );
}
