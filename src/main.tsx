import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Pas de menu du clic droit (Recharger, Inspecter…) dans l'application installée, sauf dans les
// champs de saisie pour garder copier / coller. Laissé actif en développement pour l'inspecteur.
if (import.meta.env.PROD)
  document.addEventListener("contextmenu", (e) => {
    const cible = e.target as HTMLElement;
    if (!cible.closest("input, textarea, [contenteditable='true']")) e.preventDefault();
  });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
