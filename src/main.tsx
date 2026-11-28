import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { openUrl } from "@tauri-apps/plugin-opener";
import { chargerJournal, installerCaptureErreurs, journaliser } from "./diagnostic";

installerCaptureErreurs();
chargerJournal();

// Pas de menu du clic droit (Recharger, Inspecter…) dans l'application installée, sauf dans les
// champs de saisie pour garder copier / coller. Laissé actif en développement pour l'inspecteur.
if (import.meta.env.PROD)
  document.addEventListener("contextmenu", (e) => {
    const cible = e.target as HTMLElement;
    if (!cible.closest("input, textarea, [contenteditable='true']")) e.preventDefault();
  });

// Liens web (guides, notes de version…) : la fenêtre de l'application ne les ouvre pas, on les confie
// au navigateur par défaut. Seules les adresses https sont autorisées (capabilities/default.json).
// Écoute en phase de capture sur window : les fenêtres modales arrêtent la propagation des clics
// (stopPropagation de React), un écouteur classique ne verrait jamais les liens qu'elles contiennent.
// Un échec est noté dans le journal (visible dans le diagnostic), jamais avalé en silence.
if ("__TAURI_INTERNALS__" in window)
  window.addEventListener(
    "click",
    (e) => {
      if (e.button !== 0) return;
      const lien = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!lien || !/^https:\/\//.test(lien.href)) return;
      e.preventDefault();
      e.stopPropagation();
      openUrl(lien.href).catch((err) => {
        console.error("Lien non ouvert :", lien.href, err);
        journaliser("info", `Lien non ouvert : ${lien.href} (${String(err)})`);
      });
    },
    true,
  );

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
