/* ============================================================
   usePWA.js — Hook React pour la gestion de l'installation PWA
   
   Détecte :
   - Android / Chrome : événement beforeinstallprompt natif
   - iOS / Safari : affiche les instructions manuelles
   - App déjà installée (display: standalone)
   ============================================================ */

import { useState, useEffect, useCallback } from "react";

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Vérifier si déjà installée (mode standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true; // iOS
    setIsInstalled(isStandalone);

    // Détecter iOS
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    // Vérifier si la bannière a été rejetée récemment (7 jours)
    const lastDismissed = localStorage.getItem("nova-pwa-dismissed");
    if (lastDismissed) {
      const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) {
        setDismissed(true);
        return;
      }
    }

    // Android/Chrome : écouter l'événement natif
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Détecter quand l'app est installée
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log("[NOVA PWA] App installée avec succès !");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // Déclencher le prompt natif Android
  const triggerInstall = useCallback(async () => {
    if (!installPrompt) return;
    const { outcome } = await installPrompt.prompt();
    console.log("[NOVA PWA] Résultat installation :", outcome);
    if (outcome === "accepted") {
      setIsInstallable(false);
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  // Afficher le guide iOS
  const triggerIOSGuide = useCallback(() => {
    setShowIOSGuide(true);
  }, []);

  const dismissBanner = useCallback(() => {
    setDismissed(true);
    localStorage.setItem("nova-pwa-dismissed", Date.now().toString());
  }, []);

  const closeIOSGuide = useCallback(() => {
    setShowIOSGuide(false);
  }, []);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSGuide,
    dismissed,
    triggerInstall,
    triggerIOSGuide,
    dismissBanner,
    closeIOSGuide,
  };
}
