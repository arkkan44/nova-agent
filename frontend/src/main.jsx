import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import Vocal from "./Vocal.jsx";
import Meditation from "./Meditation.jsx";

// ── Enregistrement du Service Worker (via vite-plugin-pwa) ──
// En production, vite-plugin-pwa injecte automatiquement le SW.
// Ce bloc sert de fallback manuel si le plugin n'est pas encore configuré.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[NOVA] Service Worker actif :", reg.scope);

        // Vérifier les mises à jour toutes les heures
        setInterval(() => reg.update(), 60 * 60 * 1000);
      })
      .catch((err) => console.warn("[NOVA] Erreur Service Worker :", err));
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/vocal" element={<Vocal />} />
        <Route path="/meditation" element={<Meditation />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
