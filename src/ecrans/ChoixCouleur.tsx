// Choix d'une couleur avec recherche : on tape une partie du nom (accents et majuscules ignorés),
// la liste se filtre ; ↑ ↓ pour se déplacer, Entrée pour choisir, Échap pour fermer.
// La liste s'ouvre dans un portail (les panneaux floutés capturent la position fixe).
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { couleurs, nomCouleur } from "../moteur/donnees";
import type { Famille } from "../moteur/types";
import { champ } from "../ui";
import { ImageMonture } from "./arbre/commun";

const simplifier = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

interface Option {
  id: string;
  nom: string;
  generation?: number;
  groupe: string;
}

export function ChoixCouleur({
  famille,
  valeur,
  onChange,
  vide,
  suggestions = [],
  titreSuggestions = "Les plus probables",
  className = "",
}: {
  famille: Famille;
  valeur: string;
  onChange: (id: string) => void;
  /** Libellé d'une option « aucune couleur » (valeur ""). */
  vide?: string;
  /** Couleurs proposées en tête de liste. */
  suggestions?: string[];
  titreSuggestions?: string;
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [actif, setActif] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number; haut: boolean } | null>(null);
  const champRef = useRef<HTMLInputElement>(null);
  const listeRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const toutes: Option[] = couleurs(famille).map((c) => ({ id: c.id, nom: c.nom, generation: c.generation, groupe: `Génération ${c.generation}` }));
    const mots = simplifier(texte).split(/\s+/).filter(Boolean);
    const garde = (o: Option) => mots.every((m) => simplifier(`${o.nom} g${o.generation}`).includes(m));
    const sugg = suggestions
      .filter((id, i) => suggestions.indexOf(id) === i)
      .map((id) => toutes.find((o) => o.id === id))
      .filter((o): o is Option => !!o && garde(o))
      .map((o) => ({ ...o, groupe: titreSuggestions }));
    const liste: Option[] = [];
    if (vide !== undefined && !mots.length) liste.push({ id: "", nom: vide, groupe: "" });
    return [...liste, ...sugg, ...toutes.filter((o) => garde(o) && !sugg.some((s) => s.id === o.id))];
  }, [famille, texte, suggestions, titreSuggestions, vide]);

  // Position de la liste sous le champ (ou au-dessus s'il manque de place).
  useLayoutEffect(() => {
    if (!ouvert || !champRef.current) return;
    const placer = () => {
      const r = champRef.current!.getBoundingClientRect();
      const haut = r.bottom + 300 > window.innerHeight && r.top > 300;
      setPos({ left: r.left, top: haut ? r.top - 4 : r.bottom + 4, width: Math.max(r.width, 240), haut });
    };
    placer();
    window.addEventListener("resize", placer);
    window.addEventListener("scroll", placer, true);
    return () => {
      window.removeEventListener("resize", placer);
      window.removeEventListener("scroll", placer, true);
    };
  }, [ouvert]);
  useLayoutEffect(() => {
    listeRef.current?.querySelector(`[data-index="${actif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [actif, ouvert]);

  const ouvrir = () => {
    setTexte("");
    setActif(Math.max(0, options.findIndex((o) => o.id === valeur)));
    setOuvert(true);
  };
  const choisir = (o: Option | undefined) => {
    if (!o) return;
    onChange(o.id);
    setOuvert(false);
    setTexte("");
    champRef.current?.blur();
  };

  return (
    <>
      <span className={`relative inline-flex items-center ${className}`}>
        {valeur && !ouvert && (
          <span className="pointer-events-none absolute left-1.5">
            <ImageMonture famille={famille} id={valeur} taille={20} />
          </span>
        )}
        <input
          ref={champRef}
          className={`${champ} w-full pr-6 ${valeur && !ouvert ? "pl-8" : ""}`}
          value={ouvert ? texte : valeur ? nomCouleur(famille, valeur) : (vide ?? "")}
          placeholder={ouvert ? "Tape pour chercher…" : undefined}
          onFocus={ouvrir}
          onClick={() => !ouvert && ouvrir()}
          onBlur={() => setOuvert(false)}
          onChange={(e) => {
            setTexte(e.target.value);
            setActif(0);
            setOuvert(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              if (!ouvert) ouvrir();
              else setActif((k) => Math.min(options.length - 1, k + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActif((k) => Math.max(0, k - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (ouvert) choisir(options[actif]);
            } else if (e.key === "Escape") {
              setOuvert(false);
              champRef.current?.blur();
            }
          }}
          role="combobox"
          aria-expanded={ouvert}
        />
        <span className="pointer-events-none absolute right-2 text-[10px] text-text-muted">▼</span>
      </span>
      {ouvert &&
        pos &&
        createPortal(
          <div
            ref={listeRef}
            role="listbox"
            className="fixed z-[70] max-h-72 overflow-y-auto rounded-xl border border-border-light bg-bg-card py-1 text-sm shadow-2xl"
            style={{ left: pos.left, width: pos.width, ...(pos.haut ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}
            // Garde le focus dans le champ pendant le clic.
            onMouseDown={(e) => e.preventDefault()}
          >
            {options.length === 0 && <div className="px-3 py-2 text-text-muted">Aucune couleur ne correspond</div>}
            {options.map((o, i) => (
              <div key={`${o.groupe}-${o.id}`}>
                {o.groupe && o.groupe !== options[i - 1]?.groupe && (
                  <div className={`px-3 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wider ${o.groupe === titreSuggestions ? "text-accent" : "text-text-muted"}`}>{o.groupe}</div>
                )}
                <div
                  data-index={i}
                  role="option"
                  aria-selected={o.id === valeur}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => choisir(o)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-1 ${i === actif ? "bg-accent-dim text-text-primary" : "text-text-secondary"} ${o.id === valeur ? "font-semibold" : ""}`}
                >
                  {o.id ? <ImageMonture famille={famille} id={o.id} taille={22} /> : <span className="w-[22px]" />}
                  <span className="flex-1 truncate">{o.nom}</span>
                  {o.id === valeur && <span className="text-accent">✓</span>}
                </div>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
