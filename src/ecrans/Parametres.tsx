import type { ReactNode } from "react";
import { appliquerNiveauUnique, nombreEnclos, prochainPalierEnclos } from "../moteur/etable";
import type { Options, Sauvegarde } from "../moteur/types";
import { choisirFond, FONDS_ANKAMA, idGalerie, SOURCE_FONDS, supprimerFond, valeurGalerie } from "../fond";
import { Carte, champ } from "../ui";
import { SectionSauvegardes } from "./SectionSauvegardes";
import { fondDuTheme, themeParId, THEMES, type Theme } from "../themes";
import { useNotifier } from "../notifications";

interface Props {
  s: Sauvegarde;
  setS: (f: (s: Sauvegarde) => Sauvegarde) => void;
}

const Ligne = ({ titre, aide, children }: { titre: string; aide: string; children: ReactNode }) => (
  <div className="flex items-center justify-between gap-6 border-t border-border py-3 first:border-t-0 first:pt-0">
    <div>
      <div className="text-sm font-medium">{titre}</div>
      <div className="text-xs text-text-muted">{aide}</div>
    </div>
    {children}
  </div>
);

const TuileFond = ({ titre, actif, onClick, children }: { titre: string; actif: boolean; onClick: () => void; children: ReactNode }) => (
  <button onClick={onClick} title={titre} className={`group overflow-hidden rounded-lg border-2 text-left transition ${actif ? "border-accent" : "border-transparent hover:border-border-light"}`}>
    <div className="aspect-video bg-bg-secondary">{children}</div>
    <div className={`truncate px-1.5 py-1 text-[11px] ${actif ? "bg-accent-dim text-accent" : "bg-bg-secondary text-text-secondary"}`}>{titre}</div>
  </button>
);

export function Parametres({ s, setS }: Props) {
  const o = s.options;
  const maj = (champs: Partial<Options>) => setS((s) => ({ ...s, options: { ...s.options, ...champs } }));
  /** Change l'image de fond ; une image perso remplacée est supprimée du dossier de Lignée. */
  const changerFond = (nom: string) => {
    if (o.fondEcran && o.fondEcran !== nom) supprimerFond(o.fondEcran);
    maj({ fondEcran: nom });
  };
  const themeActuel = themeParId(o.theme);
  const notifier = useNotifier();
  /** Applique un thème : sa palette et son fond d'écran avec ses réglages. */
  const appliquerTheme = (t: Theme) => {
    if (o.fondEcran && o.fondEcran !== t.fond) supprimerFond(o.fondEcran);
    notifier(`Thème « ${t.nom} » appliqué`, { ton: "info", annulable: true });
    maj({ theme: t.id, fondEcran: t.fond, fondVisibilite: t.visibilite, fondFlou: t.flou });
  };
  return (
    <div className="flex flex-col gap-4">
      <Carte titre="Général">
        <Ligne titre="Langue" aide="D'autres langues seront proposées plus tard.">
          <select className={champ} value={o.langue} onChange={(e) => maj({ langue: e.target.value as Options["langue"] })}>
            <option value="fr">Français</option>
          </select>
        </Ligne>
      </Carte>
      <Carte titre="Apparence">
        <div className="pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">Thème</span>
            {!fondDuTheme(themeActuel, o) && (
              <span className="text-xs text-text-muted">
                · personnalisé (fond modifié){" "}
                <button className="text-accent hover:underline" onClick={() => appliquerTheme(themeActuel)}>
                  rétablir le fond du thème
                </button>
              </span>
            )}
          </div>
          <div className="mb-3 text-xs text-text-muted">Couleurs de l'application et fond d'écran assorti, appliqués en un clic. Tu peux ensuite changer le fond ou les réglages à ta guise.</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
            {THEMES.map((t) => {
              const actif = t.id === themeActuel.id;
              const vignette = FONDS_ANKAMA.find((f) => valeurGalerie(f.id) === t.fond)?.vignette;
              return (
                <button
                  key={t.id}
                  onClick={() => appliquerTheme(t)}
                  className="group relative aspect-video overflow-hidden rounded-xl border-2 text-left transition hover:-translate-y-0.5"
                  style={{ borderColor: actif ? t.accent : "transparent", boxShadow: actif ? `0 0 18px color-mix(in srgb, ${t.accent} 45%, transparent)` : undefined }}
                >
                  {vignette ? (
                    <img src={vignette} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 20% 20%, ${t.lueur1.replace(/[\d.]+\)$/, "0.5)")}, #0b0d12 70%)` }} />
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2">
                    <div>
                      <div className="font-semibold" style={{ color: t.clair }}>
                        {t.nom}
                      </div>
                      <div className="mt-1 flex gap-1">
                        {[t.accent, t.clair, t.accent2].map((c) => (
                          <span key={c} className="h-3 w-3 rounded-full ring-1 ring-black/40" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: `linear-gradient(${t.clair}, ${t.accent})`, color: t.texte }}>
                      {actif ? "✓ Actif" : "Appliquer"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <Ligne titre="Animations" aide="Apparition des cartes, compteurs qui défilent, confettis et bandeau quand une couleur ou un succès est obtenu.">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.animations} onChange={(e) => maj({ animations: e.target.checked })} />
        </Ligne>
        <div className="border-t border-border py-3">
          <div className="text-sm font-medium">Image de fond</div>
          <div className="mb-3 text-xs text-text-muted">
            Fonds d'écran officiels publiés par Ankama (chargés depuis{" "}
            <a href={SOURCE_FONDS} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              dofus.com
            </a>
            , connexion Internet nécessaire), ou une image de ton PC.
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
            <TuileFond titre="Aucune" actif={!o.fondEcran} onClick={() => changerFond("")}>
              <span className="flex h-full items-center justify-center text-2xl text-text-muted">∅</span>
            </TuileFond>
            {FONDS_ANKAMA.map((f) => (
              <TuileFond key={f.id} titre={f.titre} actif={idGalerie(o.fondEcran) === f.id} onClick={() => changerFond(valeurGalerie(f.id))}>
                <img src={f.vignette} alt="" referrerPolicy="no-referrer" loading="lazy" className="h-full w-full object-cover" />
              </TuileFond>
            ))}
            <TuileFond
              titre={o.fondEcran && !idGalerie(o.fondEcran) ? "Mon image (changer…)" : "Mon image…"}
              actif={!!o.fondEcran && !idGalerie(o.fondEcran)}
              onClick={async () => {
                const nom = await choisirFond();
                if (nom) changerFond(nom);
              }}
            >
              <span className="flex h-full items-center justify-center text-2xl text-text-muted">＋</span>
            </TuileFond>
          </div>
        </div>
        {o.fondEcran && (
          <>
            <Ligne titre="Visibilité de l'image" aide={`${o.fondVisibilite} % : plus bas, le fond est plus sombre et le contenu plus lisible.`}>
              <input type="range" min={10} max={80} step={5} className="w-48 accent-accent" value={o.fondVisibilite} onChange={(e) => maj({ fondVisibilite: Number(e.target.value) })} />
            </Ligne>
            <Ligne titre="Flou de l'image" aide={o.fondFlou ? `${o.fondFlou} px : un peu de flou fait ressortir le contenu.` : "Aucun flou : l'image est nette."}>
              <input type="range" min={0} max={12} step={1} className="w-48 accent-accent" value={o.fondFlou} onChange={(e) => maj({ fondFlou: Number(e.target.value) })} />
            </Ligne>
          </>
        )}
        <Ligne titre="Opacité des panneaux" aide={`${o.voile} % : plus haut, les panneaux cachent davantage le fond et le texte est plus lisible.`}>
          <input type="range" min={20} max={100} step={5} className="w-48 accent-accent" value={o.voile} onChange={(e) => maj({ voile: Number(e.target.value) })} />
        </Ligne>
        <Ligne titre="Lucioles en fond d'écran" aide="Petites lueurs qui flottent lentement derrière le contenu.">
          <input type="checkbox" className="h-4 w-4 accent-accent" disabled={!o.animations} checked={o.particules && o.animations} onChange={(e) => maj({ particules: e.target.checked })} />
        </Ligne>
      </Carte>
      <Carte titre="Métier">
        <Ligne
          titre="Niveau du métier Éleveur"
          aide={`Détermine le nombre d'enclos : ${nombreEnclos(o.niveauEleveur)} actuellement${prochainPalierEnclos(o.niveauEleveur) ? `, un de plus au niveau ${prochainPalierEnclos(o.niveauEleveur)}` : " (maximum)"}.`}
        >
          <input
            type="number"
            min={1}
            max={200}
            className={`${champ} w-24`}
            value={o.niveauEleveur}
            onChange={(e) => maj({ niveauEleveur: Math.max(1, Math.min(200, Number(e.target.value) || 1)) })}
          />
        </Ligne>
      </Carte>
      <Carte titre="Étable">
        <Ligne
          titre="Mode de suivi"
          aide={
            o.modeSuivi === "simple"
              ? "Simple : tu saisis des nombres par couleur, sexe et état (fertile, féconde, stérile), avec un seul niveau pour toutes tes montures."
              : "Détaillé : chaque monture a son niveau, son enclos et sa fiche ; vue Liste et suivi des enclos."
          }
        >
          <div className="flex rounded-lg border border-border-light p-0.5 text-sm">
            {(
              [
                ["simple", "Simple"],
                ["detaille", "Détaillé"],
              ] as const
            ).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setS((s) => ({ ...(v === "simple" ? appliquerNiveauUnique(s, s.options.niveauParDefaut) : s), options: { ...s.options, modeSuivi: v } }))}
                className={`rounded-md px-3 py-1 ${o.modeSuivi === v ? "bg-accent-dim text-accent" : "text-text-secondary"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </Ligne>
        <Ligne
          titre={o.modeSuivi === "simple" ? "Niveau de tes montures" : "Niveau par défaut"}
          aide={
            o.modeSuivi === "simple"
              ? "Niveau de tes montures au moment des accouplements : il s'applique à toutes et sert à calculer les probabilités (167 + Optimakina = 100 %)."
              : "Niveau proposé pour les nouvelles montures, et appliqué par le bouton « Mettre au niveau » de l'étable."
          }
        >
          <input
            type="number"
            min={1}
            max={200}
            className={`${champ} w-24`}
            value={o.niveauParDefaut}
            onChange={(e) => {
              const n = Math.max(1, Math.min(200, Number(e.target.value) || 1));
              setS((s) => ({ ...(s.options.modeSuivi === "simple" ? appliquerNiveauUnique(s, n) : s), options: { ...s.options, niveauParDefaut: n } }));
            }}
          />
        </Ligne>
        {o.modeSuivi === "detaille" && (
          <Ligne titre="Afficher le nom des montures" aide="Ajoute une colonne « Nom » modifiable dans l'étable.">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.afficherNom} onChange={(e) => maj({ afficherNom: e.target.checked })} />
          </Ligne>
        )}
      </Carte>
      <SectionSauvegardes s={s} setS={setS} />
      <Carte titre="Accouplements">
        <Ligne titre="Bonus Almanax Takeza actif" aide="+20 % de chances d'obtenir la génération cible, les jours où l'Almanax le propose.">
          <input type="checkbox" className="h-4 w-4 accent-accent" checked={o.takeza} onChange={(e) => maj({ takeza: e.target.checked })} />
        </Ligne>
      </Carte>
    </div>
  );
}
