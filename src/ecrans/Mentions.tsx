// Mentions légales : pied de page identique sur tous les écrans, et bloc « À propos » des Paramètres (détails en plus).

const Lien = ({ href, children }: { href: string; children: string }) => (
  <a href={href} target="_blank" rel="noreferrer" className="text-accent hover:underline">
    {children}
  </a>
);

const DEPOT = "https://github.com/Xenovyrion/Lignee";

export function Mentions({ complet = false }: { complet?: boolean }) {
  if (!complet)
    return (
      <footer className="px-2 text-center text-[11px] leading-5 text-text-muted">
        <b className="font-semibold text-text-secondary">Outil de fan non officiel, sans lien avec Ankama.</b> Dofus est un MMORPG édité par Ankama.
        <br />
        Certaines illustrations sont la propriété d'Ankama Studio et de Dofus · Tous droits réservés
        <br />© 2026 Lignée · <Lien href={DEPOT}>Code source</Lien> · <Lien href={`${DEPOT}/blob/main/LICENSE`}>Licence PolyForm Strict</Lien>
      </footer>
    );
  return (
    <section data-tuto="a-propos" className="flex flex-col items-center gap-3 border-t border-border px-4 pb-2 pt-6 text-center">
      <div className="flex items-center gap-2 text-lg font-bold">
        <img src="/icone.svg" alt="" width={28} height={28} />
        Lignée
      </div>
      <p className="max-w-2xl text-sm text-text-secondary">
        Outil de fan gratuit. Dofus est un MMORPG édité par <Lien href="https://www.ankama.com">Ankama</Lien>.
      </p>
      <p className="max-w-2xl text-xs leading-5 text-text-muted">
        Les illustrations d'Ankama ne sont pas incluses dans l'application, qui les affiche depuis leur site d'origine.
        <br />
        Code public : chaque installeur est <b className="text-text-secondary">compilé automatiquement par GitHub</b> à partir de ce code.
      </p>
    </section>
  );
}
