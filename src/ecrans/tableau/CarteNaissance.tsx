import { useState } from "react";
import { enregistrerNaissance, type Bebe } from "../../moteur/actions";
import type { ActionAccouplement } from "../../moteur/conseils";
import { nomCouleur } from "../../moteur/donnees";
import { cible } from "../../moteur/regles";
import type { Famille, Makina, Monture, Sauvegarde, Sexe } from "../../moteur/types";
import { Bouton, ChoixCouleur, champ, pourcent } from "../../ui";
import { Etoile, ImageMonture } from "../arbre/commun";

type SetS = (f: (s: Sauvegarde) => Sauvegarde) => void;

export const NOM_MAKINA: Record<Makina, string> = { optimakina: "Optimakina", animakina: "Animakina", kromakina: "Kromakina" };

const Parent = ({ famille, m }: { famille: Famille; m: Monture }) => (
  <div className="flex w-24 flex-col items-center text-center">
    <ImageMonture famille={famille} id={m.couleur} taille={44} />
    <span className="text-[11px] leading-tight">{nomCouleur(famille, m.couleur)}</span>
    <span className="text-[11px] text-text-muted">
      <span className={m.sexe === "M" ? "text-sky-400" : "text-pink-400"}>{m.sexe === "M" ? "♂" : "♀"}</span> niv. {m.niveau}
      {m.etat !== "feconde" && <span className="text-status-warn"> · jauges</span>}
    </span>
  </div>
);

/** Carte visuelle d'une naissance conseillée : parents ♂ × ♀ → bébé, chance, makina, préparation. */
export function CarteNaissance({ famille, a, prevues, setS }: { famille: Famille; a: ActionAccouplement; prevues: number; setS: SetS }) {
  const [ouvert, setOuvert] = useState(false);
  const pret = a.aPreparer.length === 0;
  const { e } = a;
  const raison = a.termineSucces ? `termine le succès G${e.generation}` : e.pour === "succes" ? "nouvelle couleur" : "pour la suite";
  return (
    <li className={`rounded-xl border p-3 ${pret ? "border-status-ok/40 bg-status-ok/5" : "border-border bg-bg-secondary"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Etoile rang={a.rang} pret={pret} taille={28} />
        <Parent famille={famille} m={a.pere} />
        <span className="text-lg text-text-muted">×</span>
        <Parent famille={famille} m={a.mere} />
        <span className="text-xl text-accent">→</span>
        <div className="flex min-w-[180px] flex-1 items-center gap-3">
          <ImageMonture famille={famille} id={e.couleur} taille={60} />
          <div>
            <div className="font-semibold">
              {nomCouleur(famille, e.couleur)} <span className="text-sm font-normal text-text-muted">G{e.generation}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className={`rounded-sm px-1.5 ${a.termineSucces ? "bg-status-ok/15 text-status-ok" : e.pour === "succes" ? "bg-accent-dim text-accent" : "bg-bg-hover text-text-secondary"}`}>{raison}</span>
              {prevues > 1 && <span className="rounded-sm bg-bg-hover px-1.5 text-text-secondary"title="Naissances de cette couleur prévues sur l'ensemble du plan">{prevues} dans le plan</span>}
              {e.sexeVoulu && <span className="text-text-secondary">viser {e.sexeVoulu === "M" ? "un mâle ♂" : "une femelle ♀"}</span>}
            </div>
            {a.debloque > 0 && <div className="text-[11px] text-text-muted">débloque {a.debloque} étape{a.debloque > 1 ? "s" : ""}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${a.makina.chance >= 1 ? "text-status-ok" : a.makina.chance >= 0.8 ? "text-text-primary" : "text-status-warn"}`}>{pourcent(a.makina.chance)}</div>
          <div className="text-xs text-text-secondary">avec {NOM_MAKINA[a.makina.makina]}</div>
        </div>
        <Bouton discret={!pret} onClick={() => setOuvert(!ouvert)}>
          {ouvert ? "Annuler" : "Enregistrer"}
        </Bouton>
      </div>
      {(a.niveauConseille || a.makina.makina === "animakina") && (
        <div className="mt-2 flex flex-wrap gap-x-4 pl-10 text-xs text-text-muted">
          {a.makina.makina === "animakina" && <span>Animakina : {a.makina.raison}</span>}
          {a.niveauConseille && (
            <span>
              Pour 100 % avec Optimakina : niveaux cumulés {a.niveauConseille} (actuellement {a.pere.niveau + a.mere.niveau})
            </span>
          )}
        </div>
      )}
      {ouvert && <FormResultat famille={famille} pere={a.pere} mere={a.mere} makina={a.makina.makina} sexe={e.sexeVoulu} setS={setS} fermer={() => setOuvert(false)} />}
    </li>
  );
}

function FormResultat(p: { famille: Famille; pere: Monture; mere: Monture; makina?: Makina; sexe?: Sexe; setS: SetS; fermer: () => void }) {
  const attendue = cible(p.famille, p.pere, p.mere)?.couleurs[0] ?? p.pere.couleur;
  const [bebes, setBebes] = useState<Bebe[]>([{ couleur: attendue, sexe: p.sexe ?? "F" }]);
  const [makina, setMakina] = useState<Makina | "">(p.makina ?? "optimakina");
  const maj = (i: number, champs: Partial<Bebe>) => setBebes(bebes.map((b, j) => (j === i ? { ...b, ...champs } : b)));
  const valider = () => {
    try {
      p.setS((s) => enregistrerNaissance(s, p.pere.id, p.mere.id, bebes, makina || undefined, s.options.modeSuivi === "simple" ? s.options.niveauParDefaut : 1));
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
