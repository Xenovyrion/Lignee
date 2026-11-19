import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";
import { chargerJournal, installerCaptureErreurs } from "./diagnostic";

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
// au navigateur par défaut. Seules les adresses http(s) sont concernées.
if ("__TAURI_INTERNALS__" in window)
  document.addEventListener("click", (e) => {
    const lien = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
    if (!lien || !/^https?:\/\//.test(lien.href)) return;
    e.preventDefault();
    import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(lien.href)).catch(() => {});
  });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
