// Guide de l'élevage pour débutants : les bases du jeu (capture, enclos, accouplement, clonage,
// niveaux) et les conseils pour les succès, avec des schémas et des liens vers les écrans de Lignée.
// Règles 3.7 : docs/REFERENCE_ELEVAGE_3.7.md ; source principale : guide de l'éleveur (édition 2026)
// de Dofus pour les noobs. Les textes sont rédigés pour Lignée ; aucune image du jeu n'est incluse.
import { useState, type ReactNode } from "react";
import { ChoixChapitres, type Chapitre } from "../Didacticiel";
import { couleurs, NOMS_FAMILLE } from "../../moteur/donnees";
import { probaCible, sommeNiveauxPour100 } from "../../moteur/regles";
import type { Famille } from "../../moteur/types";
import { Bouton, pourcent } from "../../ui";
import { ImageMonture } from "../arbre/commun";

export type OngletGuide = "actions" | "etable" | "arbre" | "succes" | "parametres";

const SECTIONS = [
  ["bases", "L'élevage en bref"],
  ["capture", "Capturer des montures"],
  ["enclos", "Enclos et jauges"],
  ["feconde", "Rendre une monture féconde"],
  ["accoupler", "Accoupler et génération cible"],
  ["makinas", "Makinas et capacités"],
  ["cloner", "Cloner les stériles"],
  ["niveaux", "Monter le niveau des montures"],
  ["succes", "Optimiser pour les succès"],
  ["lignee", "Utiliser Lignée au quotidien"],
] as const;

// ---------------------------------------------------------------------------------------------
// Briques de mise en page

function Section({ id, numero, titre, children }: { id: string; numero: number; titre: string; children: ReactNode }) {
  return (
    <section id={`guide-${id}`} className="scroll-mt-4 rounded-2xl border border-border bg-bg-card p-5">
      <h2 className="mb-3 flex items-center gap-3 text-lg font-bold">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-accent-texte">{numero}</span>
        {titre}
      </h2>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">{children}</div>
    </section>
  );
}

const TONS = {
  conseil: ["💡", "Conseil", "border-status-ok/40 bg-status-ok/8"],
  attention: ["⚠️", "Attention", "border-orange-400/40 bg-orange-400/8"],
  lignee: ["🥚", "Dans Lignée", "border-accent/40 bg-accent-dim"],
} as const;

function Encadre({ ton, children }: { ton: keyof typeof TONS; children: ReactNode }) {
  const [icone, titre, classes] = TONS[ton];
  return (
    <div className={`rounded-xl border px-4 py-3 ${classes}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-primary">
        {icone} {titre}
      </div>
      <div className="text-sm text-text-secondary">{children}</div>
    </div>
  );
}

function Tableau({ entetes, lignes }: { entetes: string[]; lignes: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-bg-secondary text-xs uppercase tracking-wide text-text-muted">
          <tr>
            {entetes.map((e) => (
              <th key={e} className="px-3 py-2 font-semibold">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => (
            <tr key={i} className="border-t border-border">
              {l.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium text-text-primary" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const B = ({ children }: { children: ReactNode }) => <b className="text-text-primary">{children}</b>;

// ---------------------------------------------------------------------------------------------
// Schémas

/** Le cycle d'élevage : capturer, préparer, accoupler, cloner. */
function SchemaCycle() {
  const etapes = [
    { x: 90, y: 70, titre: "Capturer", texte: "montures G1 au filet" },
    { x: 300, y: 70, titre: "Préparer", texte: "jauges en enclos → féconde" },
    { x: 510, y: 70, titre: "Accoupler", texte: "1 bébé, parents stériles" },
    { x: 405, y: 190, titre: "Cloner", texte: "2 stériles → 1 fertile" },
    { x: 195, y: 190, titre: "Recommencer", texte: "avec bébés et clones" },
  ];
  const fleches = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 1],
  ];
  return (
    <svg viewBox="0 0 600 250" className="w-full max-w-2xl self-center" role="img" aria-label="Cycle de l'élevage">
      <defs>
        <marker id="fleche-guide" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="var(--color-accent)" />
        </marker>
      </defs>
      {fleches.map(([a, b]) => {
        const p = etapes[a];
        const q = etapes[b];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const d = Math.hypot(dx, dy);
        const k = 72 / d;
        const k2 = 78 / d;
        return <line key={`${a}-${b}`} x1={p.x + dx * k} y1={p.y + dy * k * 0.5} x2={q.x - dx * k2} y2={q.y - dy * k2 * 0.5} stroke="var(--color-accent)" strokeWidth="2" markerEnd="url(#fleche-guide)" opacity="0.8" />;
      })}
      {etapes.map((e) => (
        <g key={e.titre}>
          <rect x={e.x - 78} y={e.y - 30} width="156" height="60" rx="14" fill="var(--color-bg-secondary)" stroke="var(--color-border-light)" />
          <text x={e.x} y={e.y - 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--color-text-primary)">
            {e.titre}
          </text>
          <text x={e.x} y={e.y + 15} textAnchor="middle" fontSize="11.5" fill="var(--color-text-muted)">
            {e.texte}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Sérénité : quelles jauges montent selon la valeur. */
function SchemaSerenite() {
  const x = (v: number) => 40 + ((v + 5000) / 10000) * 520;
  const bandes = [
    { de: -5000, a: -1, y: 40, nom: "Endurance", teinte: "#facc15" },
    { de: -2000, a: 2000, y: 72, nom: "Maturité", teinte: "#38bdf8" },
    { de: 0, a: 5000, y: 104, nom: "Amour", teinte: "#f87171" },
  ];
  return (
    <svg viewBox="0 0 600 175" className="w-full max-w-2xl self-center" role="img" aria-label="Sérénité et jauges">
      <rect x={x(-2000)} y="28" width={x(2000) - x(-2000)} height="104" rx="8" fill="var(--color-accent)" opacity="0.1" />
      <text x={x(0)} y="20" textAnchor="middle" fontSize="11" fill="var(--color-accent)">
        zone idéale : 2 jauges à la fois
      </text>
      {bandes.map((b) => (
        <g key={b.nom}>
          <rect x={x(b.de)} y={b.y} width={x(b.a) - x(b.de)} height="22" rx="6" fill={b.teinte} opacity="0.85" />
          <text x={(x(b.de) + x(b.a)) / 2} y={b.y + 15.5} textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#111">
            {b.nom}
          </text>
        </g>
      ))}
      <line x1={x(-5000)} y1="145" x2={x(5000)} y2="145" stroke="var(--color-text-muted)" />
      {[-5000, -2000, 0, 2000, 5000].map((v) => (
        <g key={v}>
          <line x1={x(v)} y1="141" x2={x(v)} y2="149" stroke="var(--color-text-muted)" />
          <text x={x(v)} y="164" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
            {v > 0 ? `+${v}` : v}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Jauge d'enclos : 4 paliers, débit et durée de chacun. */
function SchemaJauge() {
  const paliers = [
    { nom: "T1", jusqua: 80000, gain: 10, duree: "22 h 13", carburant: "Extrait" },
    { nom: "T2", jusqua: 140000, gain: 20, duree: "8 h 19", carburant: "Philtre" },
    { nom: "T3", jusqua: 180000, gain: 30, duree: "3 h 42", carburant: "Potion" },
    { nom: "T4", jusqua: 200000, gain: 40, duree: "1 h 23", carburant: "Élixir" },
  ];
  const x = (v: number) => 20 + (v / 200000) * 560;
  let debut = 0;
  return (
    <svg viewBox="0 0 600 150" className="w-full max-w-2xl self-center" role="img" aria-label="Paliers d'une jauge d'enclos">
      {paliers.map((p, i) => {
        const de = debut;
        debut = p.jusqua;
        return (
          <g key={p.nom}>
            <rect x={x(de)} y="20" width={x(p.jusqua) - x(de) - 2} height="40" rx="6" fill="var(--color-accent)" opacity={0.25 + i * 0.2} />
            <text x={(x(de) + x(p.jusqua)) / 2} y="45" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-text-primary)">
              {p.nom}
            </text>
            <text x={(x(de) + x(p.jusqua)) / 2} y="80" textAnchor="middle" fontSize="11.5" fill="var(--color-text-secondary)">
              +{p.gain} / 10 s
            </text>
            <text x={(x(de) + x(p.jusqua)) / 2} y="97" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
              vide en {p.duree}
            </text>
            <text x={(x(de) + x(p.jusqua)) / 2} y="114" textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
              {p.carburant}
            </text>
            <text x={x(p.jusqua)} y="138" textAnchor="end" fontSize="10.5" fill="var(--color-text-muted)">
              {(p.jusqua / 1000).toLocaleString("fr-FR")} k
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Calculatrice de chance de génération cible. */
function Calculatrice() {
  const [pere, setPere] = useState(100);
  const [mere, setMere] = useState(100);
  const [opti, setOpti] = useState(true);
  const [almanax, setAlmanax] = useState(false);
  const p = probaCible(pere, mere, { optimakina: opti, takeza: almanax });
  const seuil = sommeNiveauxPour100({ optimakina: opti, takeza: almanax });
  const curseur = (nom: string, v: number, setV: (n: number) => void) => (
    <label className="flex items-center gap-3">
      <span className="w-28 text-text-primary">{nom}</span>
      <input type="range" min={1} max={200} value={v} onChange={(e) => setV(Number(e.target.value))} className="flex-1 accent-accent" />
      <span className="w-16 text-right font-mono text-text-primary">niv. {v}</span>
    </label>
  );
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-light bg-bg-secondary p-4 sm:flex-row sm:items-center">
      <div className="flex flex-1 flex-col gap-2">
        {curseur("Parent ♂", pere, setPere)}
        {curseur("Parent ♀", mere, setMere)}
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-accent" checked={opti} onChange={(e) => setOpti(e.target.checked)} /> Optimakina (+20 %)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="accent-accent" checked={almanax} onChange={(e) => setAlmanax(e.target.checked)} /> Jour d'Almanax à +20 %
          </label>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 sm:w-48">
        <div className={`text-4xl font-extrabold ${p >= 1 ? "text-status-ok" : "text-accent"}`}>{pourcent(p)}</div>
        <div className="text-center text-xs text-text-muted">de chance d'obtenir la génération cible</div>
        {seuil !== null && <div className="text-center text-xs text-text-secondary">100 % dès {seuil} niveaux cumulés</div>}
      </div>
    </div>
  );
}

/** Les montures de génération 1 d'une famille (celles qui se capturent). */
function Sauvages({ famille, zone }: { famille: Famille; zone: string }) {
  const g1 = couleurs(famille).filter((c) => c.generation === 1);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-bg-secondary p-3">
      <div className="font-semibold text-text-primary">
        {NOMS_FAMILLE[famille]}s <span className="text-xs font-normal text-text-muted">· {zone}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {g1.map((c) => (
          <div key={c.id} className="flex w-16 flex-col items-center text-center text-[11px]">
            <ImageMonture famille={famille} id={c.id} taille={44} />
            {c.nom}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------

export function Guide({ allerA, lancerVisite }: { allerA: (o: OngletGuide) => void; lancerVisite: (c: Chapitre) => void }) {
  const aller = (id: string) => document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const Lien = ({ vers, children }: { vers: OngletGuide; children: ReactNode }) => (
    <button className="font-medium text-accent hover:underline" onClick={() => allerA(vers)}>
      {children} →
    </button>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
      {/* Sommaire */}
      <nav className="self-start lg:sticky lg:top-4">
        <div className="rounded-2xl border border-border bg-bg-card p-3">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Sommaire</div>
          <ol className="flex flex-col gap-0.5 text-sm">
            {SECTIONS.map(([id, titre], i) => (
              <li key={id}>
                <button onClick={() => aller(id)} className="flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-text-secondary hover:bg-bg-hover hover:text-text-primary">
                  <span className="w-4 text-right text-text-muted">{i + 1}</span>
                  {titre}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-2xl border border-accent/40 bg-accent-dim p-5">
          <h1 className="text-2xl font-extrabold text-text-primary">Guide de l'éleveur</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Les bases de l'élevage dans Dofus 3.7 et les conseils pour finir les succès de génération, sans prise de tête. Lis-le dans l'ordre la première fois, puis
            sers-t'en comme aide-mémoire.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Bouton onClick={() => aller("bases")}>Commencer la lecture</Bouton>
            <Bouton discret onClick={() => lancerVisite("decouverte")}>
              Visite guidée de Lignée
            </Bouton>
          </div>
        </div>

        <Section id="bases" numero={1} titre="L'élevage en bref">
          <p>
            Trois familles de montures s'élèvent : les <B>Dragodindes</B>, les <B>Muldos</B> et les <B>Volkornes</B>. Toutes fonctionnent de la même façon. Seules
            quelques couleurs existent à l'état sauvage (la <B>génération 1</B>) ; toutes les autres s'obtiennent en accouplant des montures, jusqu'à la{" "}
            <B>génération 10</B>.
          </p>
          <SchemaCycle />
          <ul className="ml-5 list-disc space-y-1">
            <li>
              Une monture ne se reproduit <B>qu'une seule fois</B> : après l'accouplement, les deux parents deviennent <B>stériles</B>.
            </li>
            <li>
              Un accouplement donne <B>un seul bébé</B> (deux si un parent a la capacité Reproducteur). Le bébé naît tout de suite, niveau 1.
            </li>
            <li>
              Deux stériles de même génération se <B>clonent</B> en une monture fertile : c'est ce qui permet de ne pas perdre de montures.
            </li>
          </ul>
          <Encadre ton="lignee">
            Les succès demandent de faire naître <B>toutes les couleurs</B> des générations 2 à 10 : 63 Dragodindes, 115 Muldos et 116 Volkornes. Lignée calcule le
            chemin le plus court depuis ton étable et te dit quoi faire, dans l'ordre.
          </Encadre>
        </Section>

        <Section id="capture" numero={2} titre="Capturer des montures">
          <p>Les montures de génération 1 se capturent en combat, chacune dans sa zone :</p>
          <div className="grid gap-2 md:grid-cols-3">
            <Sauvages famille="dragodinde" zone="Montagne des Koalaks" />
            <Sauvages famille="muldo" zone="Bassin des Muldos, nord de Sufokia" />
            <Sauvages famille="volkorne" zone="Haras de Brâkmar, sud de Brâkmar" />
          </div>
          <p>
            Équipe un <B>filet</B> dans tes consommables de combat : il donne le sort <B>Apprivoisement de monture</B> (1 PA, jusqu'à 7 PO, une fois par combat).
            Lance-le sur la ou les montures voulues, puis termine le combat : elles sont capturées.
          </p>
          <Tableau
            entetes={["Filet", "Niveau d'éleveur", "Effet"]}
            lignes={[
              ["Filet de capture universel", "1", "capture la monture ciblée"],
              ["Filet multiplicateur", "100", "capture la monture ciblée et la duplique"],
              ["Filet renforcé", "150", "capture toutes les montures dans un cercle de rayon 3"],
              ["Filet multiplicateur renforcé", "200", "capture en zone et duplique chaque monture"],
            ]}
          />
          <Encadre ton="attention">Un filet qui duplique garde la couleur mais pas forcément le sexe : vérifie les sexes obtenus avant de les saisir.</Encadre>
          <Encadre ton="conseil">
            Les montures sont la seule vraie ressource de l'élevage : <B>capture en masse</B> dès que tu peux, et vise le filet multiplicateur (niveau 100) le plus
            tôt possible. En multicompte, chaque personnage peut capturer dans le même combat.
          </Encadre>
          <Encadre ton="lignee">
            Les cartes <B>Capture</B> du <Lien vers="actions">tableau de bord</Lien> indiquent combien de mâles et de femelles capturer, couleur par couleur.
          </Encadre>
        </Section>

        <Section id="enclos" numero={3} titre="Enclos et jauges">
          <p>
            Les enclos sont au <B>Village des Éleveurs</B>, près du zaap [-16,1]. Chacun a 10 places ; tu en débloques un nouveau en montant ton métier d'Éleveur :
          </p>
          <Tableau entetes={["Niveau d'éleveur", "1", "40", "80", "120", "160", "200"]} lignes={[["Enclos débloqués", "1", "2", "3", "4", "5", "6"]]} />
          <p>
            Chaque enclos a des <B>jauges</B> (sérénité +/−, endurance, maturité, amour, expérience) que tu remplis avec des <B>carburants</B>. Au plus{" "}
            <B>2 jauges actives</B> à la fois. Toutes les 10 secondes, une jauge active se vide un peu et chaque monture de l'enclos gagne autant. Plus la jauge est
            remplie, plus ça va vite (et plus elle se vide vite) :
          </p>
          <SchemaJauge />
          <p>
            Chaque type de carburant ne remplit que jusqu'à son palier : <B>Extrait</B> (T1, craftable dès le niveau 5), <B>Philtre</B> (T2, niveau 55),{" "}
            <B>Potion</B> (T3, niveau 105), <B>Élixir</B> (T4, niveau 155). Un carburant plus fort peut aussi remplir les paliers du dessous.
          </p>
          <Encadre ton="conseil">
            Une jauge se vide à la même vitesse avec 1 ou 10 montures : <B>remplis toujours l'enclos</B> avec 10 montures qui ont besoin de cette jauge.
          </Encadre>
          <Encadre ton="lignee">
            Indique ton niveau d'éleveur dans les <Lien vers="parametres">Paramètres</Lien> : Lignée en déduit le nombre d'enclos de l'onglet Enclos, où tu lances un minuteur pour savoir quand tes montures sont prêtes.
          </Encadre>
        </Section>

        <Section id="feconde" numero={4} titre="Rendre une monture féconde">
          <p>
            Une monture <B>fertile</B> doit remplir 3 jauges à <B>20 000</B> chacune — <B>endurance</B>, <B>maturité</B> et <B>amour</B> — pour devenir{" "}
            <B>féconde</B> (prête à s'accoupler). Mais chaque jauge ne monte que si sa <B>sérénité</B> est dans la bonne zone :
          </p>
          <SchemaSerenite />
          <ul className="ml-5 list-disc space-y-1">
            <li>
              Sérénité entre <B>−2 000 et −1</B> : endurance <B>et</B> maturité montent ensemble.
            </li>
            <li>
              Sérénité entre <B>0 et 2 000</B> : amour <B>et</B> maturité montent ensemble.
            </li>
            <li>Au-delà, utilise les jauges de gain ou de perte de sérénité pour ramener les montures vers le centre.</li>
          </ul>
          <Encadre ton="conseil">
            Trie tes montures <B>par sérénité</B> : un enclos « endurance + maturité » pour celles entre −2 000 et −1, un enclos « amour + maturité » pour celles
            entre 0 et 2 000, et un enclos pour recentrer les autres. Surveille ce dernier : laissées trop longtemps, les montures partent à l'autre extrême.
          </Encadre>
          <Encadre ton="lignee">
            La carte <B>Préparer</B> liste les montures dont il faut remplir les jauges. Quand elles sont fécondes en jeu, clique sur <B>✓</B> (ou{" "}
            <B>✓ Toutes prêtes</B>).
          </Encadre>
        </Section>

        <Section id="accoupler" numero={5} titre="Accoupler et génération cible">
          <p>
            Il faut un <B>mâle et une femelle féconds</B>, de la même famille, <B>dans l'étable</B> (pas dans l'inventaire ni dans un enclos). L'interface
            d'accouplement du jeu affiche les probabilités exactes de chaque bébé.
          </p>
          <p>
            La <B>génération cible</B> est la plus haute génération que le couple peut donner, en tenant compte des parents <B>et des grands-parents</B>. Le bébé a
            une chance de base de <B>30 %</B> d'être de la génération cible, augmentée par :
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              le <B>niveau des parents</B> : +0,15 % par niveau, les deux parents additionnés (deux parents niveau 100 : +30 %) ;
            </li>
            <li>
              l'<B>Optimakina</B> : +20 % ;
            </li>
            <li>
              certains jours d'<B>Almanax</B> (date variable, Lignée les détecte et te prévient) : +20 %.
            </li>
          </ul>
          <Calculatrice />
          <p>
            Si l'accouplement rate la génération cible, le bébé prend une autre couleur de l'arbre, le plus souvent celle d'un parent. Chez les Muldos et Volkornes,
            certaines couleurs de génération impaire ont plusieurs recettes, et la chance se partage alors entre les couleurs possibles.
          </p>
          <Encadre ton="lignee">
            Chaque carte <B>Naissance</B> donne la chance de réussite. Après l'accouplement en jeu, clique sur <B>Enregistrer</B> et indique ce qui est né (même un
            échec, avec <B>Croisement raté</B>) : le plan se recalcule.
          </Encadre>
        </Section>

        <Section id="makinas" numero={6} titre="Makinas et capacités">
          <p>Une makina (fabriquée par les éleveurs) s'ajoute à l'accouplement. Une seule par accouplement, et elle est facultative :</p>
          <Tableau
            entetes={["Makina", "Effet"]}
            lignes={[
              ["Optimakina", "+20 % de chance d'obtenir la génération cible"],
              ["Animakina", "tu choisis le sexe du bébé"],
              ["Kromakina", "le bébé a la capacité Caméléone (apparence aux couleurs du personnage)"],
            ]}
          />
          <p>
            Chaque makina existe pour chaque famille et chaque génération : il en faut une de génération <B>égale ou supérieure</B> à la génération cible.
          </p>
          <p>Sans makina, le bébé peut naître avec une capacité :</p>
          <Tableau
            entetes={["Capacité", "Chance", "Effet"]}
            lignes={[
              ["Reproducteur", "3 %", "un bébé de plus à l'accouplement (même sur un mâle ; deux Reproducteurs ne donnent pas plus)"],
              ["Sage", "6 %", "gain d'expérience doublé"],
              ["Amoureuse", "8 %", "gain d'amour doublé"],
              ["Endurante", "8 %", "gain d'endurance doublé"],
            ]}
          />
          <Encadre ton="conseil">
            L'<B>Optimakina</B> est la plus utile dès que tu avances dans les générations. L'Animakina sert quand il te manque un sexe précis.
          </Encadre>
          <Encadre ton="lignee">
            Choisis ta makina préférée dans <Lien vers="parametres">Paramètres → Accouplements</Lien> : les chances affichées en tiennent compte.
          </Encadre>
        </Section>

        <Section id="cloner" numero={7} titre="Cloner les stériles">
          <p>
            Deux montures <B>stériles</B> de la même famille et de la <B>même génération</B> se clonent en <B>une monture fertile</B>. Le clone garde le sexe, l'arbre
            et la sérénité de la monture conservée, mais repart avec des jauges vides et sans capacité.
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>Deux stériles de la <B>même couleur</B> : tu récupères cette couleur à coup sûr.</li>
            <li>Deux couleurs différentes : une chance sur deux pour chacune.</li>
          </ul>
          <Encadre ton="attention">
            Si tu vises les succès, <B>ne vends pas et n'extrais pas</B> tes stériles : le clonage est ce qui te permet de récupérer une monture pour chaque
            accouplement.
          </Encadre>
          <Encadre ton="lignee">
            Lignée propose les clonages utiles (carte <B>Clonage</B>) et les intègre au plan. Les stériles sont visibles dans l'<Lien vers="etable">Étable</Lien>.
          </Encadre>
        </Section>

        <Section id="niveaux" numero={8} titre="Monter le niveau des montures">
          <p>
            Les montures gagnent de l'expérience <B>uniquement en enclos</B>, avec la jauge d'<B>Expérience de monture</B> (niveau maximum 200). La capacité{" "}
            <B>Sage</B> double ce gain.
          </p>
          <Tableau
            entetes={["Objectif", "Expérience", "Jauge au palier T4", "Jauge au palier T2"]}
            lignes={[
              ["Niveau 100", "172 668", "≈ 12 h", "≈ 24 h"],
              ["Niveau 200", "867 582", "≈ 60 h", "≈ 120 h"],
            ]}
          />
          <p>Quel niveau viser ? Tout dépend de la chance que tu veux, avec une Optimakina :</p>
          <Tableau
            entetes={["Niveaux des parents", "Chance (avec Optimakina)", "Pour qui ?"]}
            lignes={[
              ["1 + 1", pourcent(probaCible(1, 1, { optimakina: true })), "premières générations : on rattrape un échec avec une capture"],
              ["100 + 100", pourcent(probaCible(100, 100, { optimakina: true })), "le bon compromis pour la plupart des accouplements"],
              ["167 + 167", pourcent(probaCible(167, 167, { optimakina: true })), "hautes générations : chaque échec coûte cher"],
              ["100 + 100, jour d'Almanax", pourcent(probaCible(100, 100, { optimakina: true, takeza: true })), "garder ses accouplements importants pour ces jours-là"],
            ]}
          />
          <Encadre ton="conseil">
            Quand un enclos n'a qu'une jauge active (par exemple pour recentrer la sérénité), active la <B>jauge d'expérience</B> en second : tes montures prennent
            des niveaux gratuitement.
          </Encadre>
        </Section>

        <Section id="succes" numero={9} titre="Optimiser pour les succès">
          <ol className="ml-5 list-decimal space-y-2">
            <li>
              <B>Monte ton métier d'Éleveur</B> : au moins niveau 120 pour 4 enclos, et niveau 100 pour le filet multiplicateur. Les crafts (carburants, filets,
              makinas) font monter le métier ; chaque capture rapporte 30 d'expérience, et chaque accouplement 30 par génération et par parent.
            </li>
            <li>
              <B>Capture en masse</B> et optimise ta prospection : les ressources des montures servent à fabriquer filets et makinas.
            </li>
            <li>
              <B>Ne jette rien</B> : clone tes stériles au lieu de les vendre ou de les extraire.
            </li>
            <li>
              <B>Monte les niveaux</B> des parents des générations hautes, et utilise l'<B>Optimakina</B> dès que les générations deviennent chères.
            </li>
            <li>
              Garde tes accouplements importants pour les jours d'<B>Almanax</B> à +20 % de chance de génération cible : Lignée te prévient la veille.
            </li>
            <li>
              Les accouplements qui dépassent la plus haute génération de l'arbre rapportent des <B>génétons</B>, à échanger au Village des Éleveurs.
            </li>
          </ol>
          <Encadre ton="lignee">
            Lignée applique déjà ces règles : il réutilise tes montures existantes, recycle les stériles par clonage et évite de capturer plus que nécessaire.
          </Encadre>
        </Section>

        <Section id="lignee" numero={10} titre="Utiliser Lignée au quotidien">
          <ol className="ml-5 list-decimal space-y-2">
            <li>
              <B>Saisis ton étable</B> une fois : pour chaque couleur, le nombre de mâles et de femelles et leur état. <Lien vers="etable">Ouvrir l'Étable</Lien>
            </li>
            <li>
              <B>Coche les succès</B> déjà obtenus en jeu. <Lien vers="succes">Ouvrir les Succès</Lien>
            </li>
            <li>
              <B>Suis le tableau de bord</B> dans l'ordre des numéros, et enregistre chaque résultat (naissance, clonage, capture, jauges remplies).{" "}
              <Lien vers="actions">Ouvrir le tableau de bord</Lien>
            </li>
            <li>
              Pendant que tu joues, passe en <B>mode compagnon</B> (en haut à droite) : une petite fenêtre au premier plan, à côté du jeu.
            </li>
            <li>
              Un souci ? <B>Annuler</B> défait la dernière action. Et si quelque chose semble faux, exporte le <B>diagnostic</B> depuis les{" "}
              <Lien vers="parametres">Paramètres</Lien> et transmets le fichier.
            </li>
          </ol>
          <div className="flex flex-col gap-2">
            <span className="text-text-secondary">Pour apprendre en manipulant une étable d'exemple, lance un chapitre de la visite guidée :</span>
            <ChoixChapitres lancer={lancerVisite} />
          </div>
        </Section>

        <p className="px-2 pb-2 text-xs text-text-muted">
          Sources : règles de la version 3.7 vérifiées dans le{" "}
          <a className="text-accent hover:underline" href="https://www.dofuspourlesnoobs.com/guide-de-l-eleveur.html" target="_blank" rel="noreferrer">
            guide de l'éleveur de Dofus pour les noobs
          </a>
          , les données du jeu (DofusDB) et les patch notes. Images des montures © Ankama, chargées depuis DofusDB. En cas de doute, l'interface de génétique du jeu
          fait foi.
        </p>
      </div>
    </div>
  );
}
