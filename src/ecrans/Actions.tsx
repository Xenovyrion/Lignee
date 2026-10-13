import { useMemo, useState } from "react";
import { cloner, enregistrerNaissance, type Bebe } from "../moteur/actions";
import { couleur, nomCouleur } from "../moteur/donnees";
import { planifier, suggererClonages, type PaireClonage, type Source } from "../moteur/planificateur";
import { cible, probaCible, sommeNiveauxPour100 } from "../moteur/regles";
import type { Famille, Makina, Monture, Sauvegarde, Sexe } from "../moteur/types";
import { Bouton, Carte, ChoixCouleur, champ, libelleMonture, pourcent, sexeSymbole } from "../ui";

interface Props {
  famille: Famille;
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

export function Actions({ famille, s, setS }: Props) {
  const plan = useMemo(() => planifier(famille, s.montures, s.obtenues[famille]), [famille, s.montures, s.obtenues]);
  const clonages = useMemo(() => suggererClonages(s.montures.filter((m) => m.famille === famille)), [famille, s.montures]);
  const [toutVoir, setToutVoir] = useState(false);
  const takeza = s.options.takeza;
  const nbSucces = plan.etapes.filter((e) => e.pour === "succes").length;
  const nbCaptures = Object.values(plan.captures).reduce((a, b) => a + b, 0);

  const libelleSource = (src: Source) =>
    src.type === "monture"
      ? libelleMonture(src.monture)
      : src.type === "capture"
        ? `${nomCouleur(famille, src.couleur)} à capturer`
        : src.type === "clone"
          ? `clone de 2 ${nomCouleur(famille, src.couleur)} stériles`
          : `bébé de l'étape ${src.etape + 1}`;

  if (plan.etapes.length === 0) return <Carte titre="Bravo !">Toutes les couleurs de cette famille sont obtenues.</Carte>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-4">
        <Chiffre valeur={nbSucces} libelle="couleurs à faire naître" />
        <Chiffre valeur={plan.etapes.length} libelle="naissances planifiées (avec intermédiaires)" />
        <Chiffre valeur={nbCaptures} libelle="captures G1 à prévoir" />
        <Chiffre valeur={plan.clonages} libelle="clonages de stériles de même couleur" />
      </div>

      <Carte
        titre={`À faire maintenant (${plan.immediates.length})`}
        droite={
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input type="checkbox" checked={takeza} onChange={(e) => setS((s) => ({ ...s, options: { ...s.options, takeza: e.target.checked } }))} />
            Bonus Almanax Takeza actif (+20 %)
          </label>
        }
      >
        {plan.immediates.length === 0 ? (
          <p className="text-sm text-text-muted">Aucun accouplement possible avec l'étable actuelle : commence par les captures ci-dessous.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {plan.immediates.map((i) => {
              const e = plan.etapes[i];
              const [a, b] = e.parents.map((p) => (p as { monture: Monture }).monture);
              const [pere, mere] = a.sexe === "M" ? [a, b] : [b, a];
              return <AccouplementPropose key={`${pere.id}-${mere.id}`} famille={famille} pere={pere} mere={mere} cibleVisee={e.couleur} pour={e.pour} sexeVoulu={e.sexeVoulu} takeza={takeza} setS={setS} />;
            })}
          </ul>
        )}
      </Carte>

      {nbCaptures > 0 && (
        <Carte titre="Captures à prévoir">
          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(plan.captures).map(([c, n]) => (
              <span key={c} className="rounded-md bg-bg-secondary px-3 py-1">
                {nomCouleur(famille, c)} × {n}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">Total sur l'ensemble du plan. Les filets multiplicateurs (éleveur niv. 100+) dupliquent les captures.</p>
        </Carte>
      )}

      {clonages.length > 0 && (
        <Carte titre={`Clonages possibles (${clonages.length})`}>
          <ul className="flex flex-col gap-2">
            {clonages.map((p) => (
              <ClonagePropose key={`${p.a.id}-${p.b.id}`} paire={p} setS={setS} />
            ))}
          </ul>
        </Carte>
      )}

      <AccouplementLibre famille={famille} s={s} setS={setS} takeza={takeza} />

      <Carte titre="Plan complet" droite={<Bouton discret onClick={() => setToutVoir(!toutVoir)}>{toutVoir ? "Réduire" : `Afficher les ${plan.etapes.length} étapes`}</Bouton>}>
        <ol className="flex flex-col gap-1 text-sm">
          {(toutVoir ? plan.etapes : plan.etapes.slice(0, 15)).map((e, i) => (
            <li key={i} className="flex gap-2 border-t border-border py-1">
              <span className="w-10 text-text-muted">{i + 1}.</span>
              <span className={`w-24 ${e.pour === "succes" ? "text-accent" : "text-text-muted"}`}>{e.pour === "succes" ? "Succès" : "Intermédiaire"}</span>
              <span className="w-56 font-medium">
                G{e.generation} {nomCouleur(famille, e.couleur)} {e.sexeVoulu ? sexeSymbole(e.sexeVoulu) : ""}
              </span>
              <span className="text-text-secondary">
                {libelleSource(e.parents[0])} × {libelleSource(e.parents[1])}
                {e.alerteSexe && <span className="ml-2 text-status-warn">⚠ même sexe</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-text-muted">
          Le plan suppose 100 % de réussite et est recalculé à chaque naissance. ♂/♀ après une couleur : sexe à viser (Animakina) car l'étape suivante en dépend.
        </p>
      </Carte>
    </div>
  );
}

const Chiffre = ({ valeur, libelle }: { valeur: number; libelle: string }) => (
  <div className="rounded-xl border border-border bg-bg-card p-4">
    <div className="text-3xl font-semibold text-accent">{valeur}</div>
    <div className="text-sm text-text-secondary">{libelle}</div>
  </div>
);

function conseilNiveau(pere: Monture, mere: Monture, takeza: boolean) {
  const somme = sommeNiveauxPour100({ optimakina: true, takeza });
  if (somme === null || pere.niveau + mere.niveau >= somme) return null;
  return `niveaux cumulés ${somme} pour 100 % avec Optimakina (actuellement ${pere.niveau + mere.niveau})`;
}

function AccouplementPropose(p: { famille: Famille; pere: Monture; mere: Monture; cibleVisee: string; pour: string; sexeVoulu?: Sexe; takeza: boolean; setS: Props["setS"] }) {
  const [ouvert, setOuvert] = useState(false);
  const proba = probaCible(p.pere.niveau, p.mere.niveau, { optimakina: true, takeza: p.takeza });
  const prets = p.pere.etat === "feconde" && p.mere.etat === "feconde";
  const niveau = conseilNiveau(p.pere, p.mere, p.takeza);
  return (
    <li className="rounded-lg border border-border bg-bg-secondary p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-medium">
            → G{couleur(p.famille, p.cibleVisee).generation} {nomCouleur(p.famille, p.cibleVisee)}
            {p.sexeVoulu && <span className="ml-1 text-text-secondary">(viser {p.sexeVoulu === "M" ? "un mâle" : "une femelle"})</span>}
            <span className={`ml-2 text-xs ${p.pour === "succes" ? "text-accent" : "text-text-muted"}`}>{p.pour === "succes" ? "succès" : "intermédiaire"}</span>
          </div>
          <div className="text-sm text-text-secondary">
            {libelleMonture(p.pere)} × {libelleMonture(p.mere)} · avec Optimakina : <span className={proba >= 1 ? "text-status-ok" : "text-status-warn"}>{pourcent(proba)}</span>
          </div>
          {!prets && <div className="text-xs text-status-warn">Jauges à remplir (Endurance, Maturité, Amour) avant l'accouplement</div>}
          {niveau && <div className="text-xs text-text-muted">Conseil : {niveau}</div>}
        </div>
        <Bouton discret onClick={() => setOuvert(!ouvert)}>{ouvert ? "Annuler" : "Enregistrer le résultat"}</Bouton>
      </div>
      {ouvert && <FormResultat famille={p.famille} pere={p.pere} mere={p.mere} setS={p.setS} fermer={() => setOuvert(false)} />}
    </li>
  );
}

function FormResultat({ famille, pere, mere, setS, fermer }: { famille: Famille; pere: Monture; mere: Monture; setS: Props["setS"]; fermer: () => void }) {
  const attendue = cible(famille, pere, mere)?.couleurs[0] ?? pere.couleur;
  const [bebes, setBebes] = useState<Bebe[]>([{ couleur: attendue, sexe: "F" }]);
  const [makina, setMakina] = useState<Makina | "">("optimakina");
  const maj = (i: number, champs: Partial<Bebe>) => setBebes(bebes.map((b, j) => (j === i ? { ...b, ...champs } : b)));
  const valider = () => {
    try {
      setS((s) => enregistrerNaissance(s, pere.id, mere.id, bebes, makina || undefined));
      fermer();
    } catch (e) {
      alert((e as Error).message);
    }
  };
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3 text-sm">
      {bebes.map((b, i) => (
        <div key={i} className="flex items-end gap-2">
          <label className="flex flex-col gap-1">
            Bébé {i + 1} — couleur obtenue
            <ChoixCouleur famille={famille} value={b.couleur} onChange={(e) => maj(i, { couleur: e.target.value })} />
          </label>
          <select className={champ} value={b.sexe} onChange={(e) => maj(i, { sexe: e.target.value as Sexe })}>
            <option value="F">♀</option>
            <option value="M">♂</option>
          </select>
        </div>
      ))}
      <label className="flex items-center gap-1">
        <input type="checkbox" checked={bebes.length === 2} onChange={(e) => setBebes(e.target.checked ? [...bebes, { couleur: attendue, sexe: "M" }] : bebes.slice(0, 1))} />
        2ᵉ bébé (Reproducteur)
      </label>
      <label className="flex flex-col gap-1">
        Makina utilisée
        <select className={champ} value={makina} onChange={(e) => setMakina(e.target.value as Makina | "")}>
          <option value="optimakina">Optimakina</option>
          <option value="animakina">Animakina</option>
          <option value="kromakina">Kromakina</option>
          <option value="">Aucune</option>
        </select>
      </label>
      <Bouton onClick={valider}>Valider la naissance</Bouton>
    </div>
  );
}

function AccouplementLibre({ famille, s, setS, takeza }: Props & { takeza: boolean }) {
  const [pereId, setPereId] = useState("");
  const [mereId, setMereId] = useState("");
  const dispo = s.montures.filter((m) => m.famille === famille && m.etat !== "sterile");
  const pere = dispo.find((m) => m.id === pereId);
  const mere = dispo.find((m) => m.id === mereId);
  const c = pere && mere ? cible(famille, pere, mere) : null;
  const options = (sexe: Sexe) =>
    dispo
      .filter((m) => m.sexe === sexe)
      .map((m) => (
        <option key={m.id} value={m.id}>
          {libelleMonture(m)}
        </option>
      ));
  return (
    <Carte titre="Autre accouplement (hors plan)">
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
            {c ? `Cible G${c.generation} : ${c.couleurs.map((x) => nomCouleur(famille, x)).join(" / ")} — ${pourcent(probaCible(pere.niveau, mere.niveau, { optimakina: true, takeza }))} avec Optimakina` : "Aucune recette : le bébé aura une couleur de son arbre"}
          </span>
        )}
      </div>
      {pere && mere && <FormResultat key={pere.id + mere.id} famille={famille} pere={pere} mere={mere} setS={setS} fermer={() => (setPereId(""), setMereId(""))} />}
    </Carte>
  );
}

function ClonagePropose({ paire, setS }: { paire: PaireClonage; setS: Props["setS"] }) {
  const [resultat, setResultat] = useState(paire.a.couleur);
  const [sexe, setSexe] = useState<Sexe>(paire.a.sexe);
  const f = paire.a.famille;
  const valider = () => {
    try {
      setS((s) => cloner(s, paire.a.id, paire.b.id, { couleur: resultat, sexe }));
    } catch (e) {
      alert((e as Error).message);
    }
  };
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-bg-secondary p-3 text-sm">
      <span>
        {libelleMonture(paire.a)} + {libelleMonture(paire.b)}
        <span className="ml-2 text-text-muted">{paire.memeCouleur ? "résultat certain" : "couleur 50/50"}</span>
      </span>
      <span className="ml-auto flex items-center gap-2">
        Résultat :
        <select className={champ} value={resultat} onChange={(e) => setResultat(e.target.value)} disabled={paire.memeCouleur}>
          {[...new Set([paire.a.couleur, paire.b.couleur])].map((c) => (
            <option key={c} value={c}>
              {nomCouleur(f, c)}
            </option>
          ))}
        </select>
        <select className={champ} value={sexe} onChange={(e) => setSexe(e.target.value as Sexe)}>
          <option value="F">♀</option>
          <option value="M">♂</option>
        </select>
        <Bouton discret onClick={valider}>
          Cloné
        </Bouton>
      </span>
    </li>
  );
}
