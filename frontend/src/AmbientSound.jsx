import { useState, useEffect, useRef } from "react";

export default function AmbientSound() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [showVolume, setShowVolume] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio("/ambient.mp3");
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      // Fondu sortant
      fadeOut(audio, () => audio.pause());
      setPlaying(false);
    } else {
      // Fondu entrant
      audio.volume = 0;
      await audio.play().catch(() => {});
      fadeIn(audio, volume);
      setPlaying(true);
    }
  };

  const fadeIn = (audio, targetVolume) => {
    let v = 0;
    const step = targetVolume / 30;
    const interval = setInterval(() => {
      v = Math.min(v + step, targetVolume);
      audio.volume = v;
      if (v >= targetVolume) clearInterval(interval);
    }, 100);
  };

  const fadeOut = (audio, onDone) => {
    let v = audio.volume;
    const step = v / 20;
    const interval = setInterval(() => {
      v = Math.max(v - step, 0);
      audio.volume = v;
      if (v <= 0) { clearInterval(interval); onDone(); }
    }, 80);
  };

  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current && playing) audioRef.current.volume = val;
  };

  return (
    <>
      <style>{css}</style>
      <div style={s.wrap}>
        {/* Bouton volume */}
        {showVolume && (
          <div style={s.volumeBox} className="volume-box">
            <input
              type="range" min="0" max="1" step="0.05"
              value={volume}
              onChange={handleVolume}
              style={s.slider}
            />
          </div>
        )}

        {/* Bouton ON/OFF */}
        <button
          style={{ ...s.btn, ...(playing ? s.btnOn : {}) }}
          className={playing ? "ambient-btn-on" : "ambient-btn"}
          onClick={togglePlay}
          onContextMenu={(e) => { e.preventDefault(); setShowVolume(v => !v); }}
          title={playing ? "Couper la nappe sonore (clic droit = volume)" : "Activer la nappe sonore binaurale"}
        >
          {playing ? "◉" : "◎"}
        </button>
      </div>
    </>
  );
}

const s = {
  wrap: { position: "fixed", bottom: 90, right: 20, zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  btn: { width: 40, height: 40, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(200,160,80,0.3)", color: "#706050", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" },
  btnOn: { border: "1px solid rgba(200,160,80,0.8)", color: "#d4a84b", boxShadow: "0 0 16px rgba(200,160,80,0.4)" },
  volumeBox: { background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 12, padding: "10px 8px", display: "flex", alignItems: "center" },
  slider: { WebkitAppearance: "none", width: 80, height: 3, background: "rgba(200,160,80,0.3)", borderRadius: 2, outline: "none", cursor: "pointer", writingMode: "vertical-lr", direction: "rtl", width: 3, height: 80 },
};

const css = `
  .ambient-btn:hover { border-color: rgba(200,160,80,0.5) !important; color: #a09080 !important; }
  .ambient-btn-on { animation: ambientPulse 3s ease-in-out infinite; }
  @keyframes ambientPulse { 0%, 100% { box-shadow: 0 0 12px rgba(200,160,80,0.3); } 50% { box-shadow: 0 0 24px rgba(200,160,80,0.6); } }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #d4a84b; cursor: pointer; }
  .volume-box { animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
`;
