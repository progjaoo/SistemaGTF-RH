import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { applyTheme, resolveInitialTheme } from "./hooks/useTheme";
import "./index.css";

// Aplica o tema salvo/sistema no boot (antes do render) para cobrir o portal.
applyTheme(resolveInitialTheme());

// Registra o service worker do PWA do portal (atualizações aplicam no próximo acesso).
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
