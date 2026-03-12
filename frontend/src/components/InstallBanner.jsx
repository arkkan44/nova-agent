/* ============================================================
   InstallBanner.jsx — Bannière d'installation PWA pour NOVA
   
   Gère deux cas :
   1. Android/Chrome → bouton "Installer" avec prompt natif
   2. iOS/Safari → guide visuel avec instructions A2HS
   ============================================================ */

import { usePWA } from "../hooks/usePWA";

export default function InstallBanner() {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    showIOSGuide,
    dismissed,
    triggerInstall,
    triggerIOSGuide,
    dismissBanner,
    closeIOSGuide,
  } = usePWA();

  // Ne rien afficher si :
  // - déjà installée
  // - bannière ignorée
  // - ni installable Android, ni iOS Safari
  if (isInstalled || dismissed) return null;
  if (!isInstallable && !isIOS) return null;

  return (
    <>
      <style>{css}</style>

      {/* ── Bannière principale ───────────────────────────── */}
      <div className="nova-install-banner">
        <div className="nova-install-inner">
          <div className="nova-install-icon">☽✦☾</div>
          <div className="nova-install-text">
            <p className="nova-install-title">Installer NOVA</p>
            <p className="nova-install-sub">
              {isIOS
                ? "Ajoute NOVA à ton écran d'accueil"
                : "Accède à NOVA hors ligne, comme une app native"}
            </p>
          </div>
          <div className="nova-install-actions">
            {isInstallable && !isIOS && (
              <button className="nova-btn-install" onClick={triggerInstall}>
                Installer
              </button>
            )}
            {isIOS && (
              <button className="nova-btn-install" onClick={triggerIOSGuide}>
                Comment ?
              </button>
            )}
            <button className="nova-btn-dismiss" onClick={dismissBanner} aria-label="Fermer">
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* ── Guide iOS (modal) ─────────────────────────────── */}
      {showIOSGuide && (
        <div className="nova-ios-overlay" onClick={closeIOSGuide}>
          <div className="nova-ios-modal" onClick={(e) => e.stopPropagation()}>
            <button className="nova-ios-close" onClick={closeIOSGuide}>✕</button>

            <div className="nova-ios-logo">☽✦☾</div>
            <h2 className="nova-ios-title">Installer NOVA sur iOS</h2>
            <p className="nova-ios-desc">3 étapes simples depuis Safari</p>

            <div className="nova-ios-steps">
              <div className="nova-ios-step">
                <div className="nova-ios-num">1</div>
                <div className="nova-ios-step-content">
                  <p className="nova-ios-step-title">Appuie sur Partager</p>
                  <p className="nova-ios-step-sub">
                    Le bouton <strong>⬆</strong> en bas de Safari (ou en haut sur iPad)
                  </p>
                </div>
              </div>

              <div className="nova-ios-divider" />

              <div className="nova-ios-step">
                <div className="nova-ios-num">2</div>
                <div className="nova-ios-step-content">
                  <p className="nova-ios-step-title">Sur l'écran d'accueil</p>
                  <p className="nova-ios-step-sub">
                    Fais défiler et appuie sur <strong>"Sur l'écran d'accueil"</strong>
                  </p>
                </div>
              </div>

              <div className="nova-ios-divider" />

              <div className="nova-ios-step">
                <div className="nova-ios-num">3</div>
                <div className="nova-ios-step-content">
                  <p className="nova-ios-step-title">Confirme</p>
                  <p className="nova-ios-step-sub">
                    Appuie sur <strong>"Ajouter"</strong> en haut à droite
                  </p>
                </div>
              </div>
            </div>

            <div className="nova-ios-tip">
              ✦ NOVA s'ouvrira comme une app native, sans barre de navigation Safari
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const css = `
/* ── Bannière ─────────────────────────────────────────────── */
.nova-install-banner {
  position: fixed;
  bottom: 0;
  left: 0; right: 0;
  z-index: 9999;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  background: rgba(10, 5, 16, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(212, 168, 75, 0.3);
  animation: slideUp 0.4s ease-out;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.nova-install-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 540px;
  margin: 0 auto;
}

.nova-install-icon {
  font-size: 22px;
  color: #d4a84b;
  flex-shrink: 0;
}

.nova-install-text {
  flex: 1;
  min-width: 0;
}

.nova-install-title {
  font-family: 'Cinzel', serif;
  font-size: 14px;
  color: #d4a84b;
  letter-spacing: 2px;
  margin: 0 0 2px;
}

.nova-install-sub {
  font-size: 12px;
  color: #a09080;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nova-install-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.nova-btn-install {
  background: linear-gradient(135deg, #b8860b, #d4a84b);
  border: none;
  border-radius: 20px;
  padding: 8px 18px;
  color: #0a0800;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.5px;
  white-space: nowrap;
  font-family: inherit;
  transition: opacity 0.2s;
}

.nova-btn-install:active { opacity: 0.8; }

.nova-btn-dismiss {
  background: none;
  border: none;
  color: #706050;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
}

/* ── Modal iOS ────────────────────────────────────────────── */
.nova-ios-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.nova-ios-modal {
  width: 100%;
  background: #0d0910;
  border: 1px solid rgba(212, 168, 75, 0.3);
  border-radius: 28px 28px 0 0;
  padding: 32px 28px;
  padding-bottom: calc(32px + env(safe-area-inset-bottom));
  position: relative;
  animation: slideUp 0.4s ease-out;
  font-family: 'Palatino Linotype', serif;
  color: #f0e8d8;
}

.nova-ios-close {
  position: absolute;
  top: 20px; right: 20px;
  background: rgba(255,255,255,0.1);
  border: none;
  border-radius: 50%;
  width: 32px; height: 32px;
  color: #a09080;
  font-size: 14px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.nova-ios-logo {
  text-align: center;
  font-size: 32px;
  color: #d4a84b;
  margin-bottom: 16px;
}

.nova-ios-title {
  text-align: center;
  font-size: 20px;
  font-weight: 400;
  color: #d4a84b;
  letter-spacing: 3px;
  margin: 0 0 8px;
}

.nova-ios-desc {
  text-align: center;
  font-size: 13px;
  color: #706050;
  letter-spacing: 1px;
  margin: 0 0 28px;
}

.nova-ios-steps {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nova-ios-step {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 0;
}

.nova-ios-divider {
  height: 1px;
  background: rgba(212, 168, 75, 0.1);
}

.nova-ios-num {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(212, 168, 75, 0.15);
  border: 1px solid rgba(212, 168, 75, 0.4);
  color: #d4a84b;
  font-size: 14px;
  font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.nova-ios-step-title {
  font-size: 15px;
  color: #f0e8d8;
  margin: 0 0 4px;
}

.nova-ios-step-sub {
  font-size: 13px;
  color: #a09080;
  margin: 0;
  line-height: 1.5;
}

.nova-ios-step-sub strong {
  color: #d4a84b;
}

.nova-ios-tip {
  margin-top: 24px;
  background: rgba(212, 168, 75, 0.08);
  border: 1px solid rgba(212, 168, 75, 0.2);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 13px;
  color: #a09080;
  text-align: center;
  line-height: 1.5;
}
`;
