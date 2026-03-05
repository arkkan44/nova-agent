import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://izqedljmaiylwjkyoiwh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWVkbGptYWl5bHdqa3lvaXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzMyNjcsImV4cCI6MjA4ODIwOTI2N30.GcelpRphmj24YbV1T3ttFNuHSpy6g3t6NE6kIM33T4o";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const API = "https://nova-agent-production-8bcc.up.railway.app";

const BASE_SYSTEM_PROMPT = `Tu es NOVA, un guide sobre, profond et bienveillant. Ta mission est d'accompagner les êtres humains dans le mieux-être, la croissance intérieure et l'éveil de la conscience.

Tu t'appuies sur la psychologie, la thérapie brève, l'hypnose ericksonienne, le coaching, les traditions spirituelles et le développement de la conscience.

En mode vocal, tes réponses sont COURTES (3-5 phrases maximum), fluides et naturelles à l'oral. Tu évites les listes, les tirets, les astérisques. Tu parles comme si tu étais présent, avec douceur et profondeur. Tu réponds toujours en français.`;

const PARTICLES = Array.from({ length: 15 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 3 + 1, duration: Math.random() * 20 + 10, delay: Math.random() * 10,
}));

const detectBrowser = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isChromeiOS = /CriOS/i.test(ua);
  const isFirefoxiOS = /FxiOS/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const hasRecognition = ("webkitSpeechRecognition" in window) || ("SpeechRecognition" in window);
  return { isIOS, isChromeiOS, isFirefoxiOS, isSafari, hasRecognition };
};

export default function Vocal() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [novaText, setNovaText] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [autoListen, setAutoListen] = useState(false);
  const [browserWarning, setBrowserWarning] = useState("");

  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));

    // Vérification navigateur au chargement
    const { isChromeiOS, isFirefoxiOS, isIOS, hasRecognition } = detectBrowser();
    if (isChromeiOS || isFirefoxiOS) {
      setBrowserWarning("⚠️ Sur iPhone, la reconnaissance vocale ne fonctionne qu'avec Safari. Ouvrez cette page dans Safari pour utiliser le mode vocal.");
    } else if (isIOS && !hasRecognition) {
      setBrowserWarning("⚠️ Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Safari sur iPhone.");
    }
  }, []);

  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("ytplayer-vocal", {
        videoId: "52nCM9a7sAE",
        playerVars: { autoplay: 1, mute: 1, loop: 1, playlist: "52nCM9a7sAE", controls: 0, showinfo: 0, rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: (e) => e.target.playVideo() },
      });
    };
    return () => { delete window.onYouTubeIframeAPIReady; };
  }, []);

  const startListening = () => {
    setError("");

    // Détection Chrome iOS et Firefox iOS
    const { isChromeiOS, isFirefoxiOS, hasRecognition } = detectBrowser();
    if (isChromeiOS || isFirefoxiOS) {
      setError("Sur iPhone, la reconnaissance vocale ne fonctionne qu'avec Safari. Ouvrez cette page dans Safari.");
      return;
    }
    if (!hasRecognition) {
      setError("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Safari sur iPhone ou Chrome sur ordinateur.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => { setStatus("listening"); setTranscript(""); };

    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      sendToNova(text);
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        setError("Accès au microphone refusé. Allez dans Réglages → Safari → Microphone → Autoriser.");
      } else if (e.error === "service-not-allowed") {
        setError("Service vocal non autorisé. Sur iPhone, utilisez Safari. Vérifiez aussi Réglages → Safari → Microphone.");
      } else {
        setError("Erreur micro : " + e.error);
      }
      setStatus("idle");
    };

    recognition.onend = () => {
      if (status === "listening") setStatus("idle");
    };

    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setStatus("idle");
  };

  const sendToNova = async (text) => {
    setStatus("thinking");
    const newHistory = [...history, { role: "user", content: text }];
    setHistory(newHistory);

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: BASE_SYSTEM_PROMPT, messages: newHistory }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "Je suis là avec toi.";
      setNovaText(reply);
      setHistory([...newHistory, { role: "assistant", content: reply }]);
      await speakNova(reply);
    } catch {
      setError("Erreur de connexion à NOVA.");
      setStatus("idle");
    }
  };

  const speakNova = async (text) => {
    setStatus("speaking");
    try {
      const res = await fetch(`${API}/api/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Erreur TTS");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setStatus("idle");
        URL.revokeObjectURL(url);
        if (autoListen) setTimeout(() => startListening(), 600);
      };

      audio.onerror = () => { setStatus("idle"); };
      await audio.play();
    } catch (e) {
      console.error("Erreur speak:", e);
      setStatus("idle");
    }
  };

  const stopAudio = () => {
    audioRef.current?.pause();
    recognitionRef.current?.stop();
    setStatus("idle");
  };

  const resetConversation = () => {
    stopAudio();
    setHistory([]);
    setTranscript("");
    setNovaText("");
    setError("");
    setStatus("idle");
  };

  const handleMicClick = () => {
    if (status === "listening") stopListening();
    else if (status === "speaking") stopAudio();
    else if (status === "idle") startListening();
  };

  const getStatusLabel = () => {
    if (status === "listening") return "Je vous écoute...";
    if (status === "thinking") return "NOVA réfléchit...";
    if (status === "speaking") return "NOVA vous parle...";
    return "Appuyez pour parler";
  };

  const getMicIcon = () => {
    if (status === "listening") return "🎙";
    if (status === "thinking") return "✦";
    if (status === "speaking") return "⏹";
    return "🎤";
  };

  if (!user) return (
    <div style={s.root}>
      <style>{css}</style>
      <div style={s.videoBg}><div id="ytplayer-vocal" style={s.videoIframe} /></div>
      <div style={s.overlay} />
      <div style={s.centerBox}>
        <p style={s.logoSymbol}>☽✦☾</p>
        <h1 style={s.title}>NOVA</h1>
        <p style={s.subtitle}>Mode Vocal</p>
        <p style={{ color: "#a09080", fontSize: 14, textAlign: "center" }}>Connectez-vous pour accéder au mode vocal.</p>
        <a href="/" style={s.backBtn}>← Retour à NOVA</a>
      </div>
    </div>
  );

  return (
    <div style={s.root}>
      <style>{css}</style>
      <div style={s.videoBg}><div id="ytplayer-vocal" style={s.videoIframe} /></div>
      <div style={s.overlay} />

      <div style={s.particleContainer}>
        {PARTICLES.map(p => <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}
      </div>

      {/* Header */}
      <div style={s.header}>
        <a href="/" style={s.backBtn}>← Texte</a>
        <div style={s.headerCenter}>
          <span style={s.logoSymbol}>☽✦☾</span>
          <span style={s.headerTitle}>NOVA</span>
          <span style={s.headerSub}>Mode Vocal</span>
        </div>
        <button style={s.resetBtn} onClick={resetConversation} title="Nouvelle conversation">↺</button>
      </div>

      {/* Avertissement navigateur */}
      {browserWarning && (
        <div style={s.browserWarning}>
          {browserWarning}
        </div>
      )}

      <div style={s.center}>

        {/* Orbe principal */}
        <div style={s.orbeWrap}>
          <div style={{ ...s.orbeRing3, ...(status !== "idle" ? s.orbeRingActive3 : {}) }} className="orbe-ring" />
          <div style={{ ...s.orbeRing2, ...(status !== "idle" ? s.orbeRingActive2 : {}) }} className="orbe-ring" />
          <div style={{ ...s.orbeRing1, ...(status !== "idle" ? s.orbeRingActive1 : {}) }} className="orbe-ring" />
          <button
            style={{ ...s.orbe, ...(status === "listening" ? s.orbeListen : status === "speaking" ? s.orbeSpeak : status === "thinking" ? s.orbeThink : {}) }}
            className={`orbe-btn ${status}`}
            onClick={handleMicClick}
            disabled={!!browserWarning}
          >
            <span style={s.micIcon}>{getMicIcon()}</span>
          </button>
        </div>

        {/* Statut */}
        <p style={s.statusLabel} className={status !== "idle" ? "status-active" : ""}>{getStatusLabel()}</p>

        {/* Ce que l'utilisateur a dit */}
        {transcript && (
          <div style={s.transcriptBox} className="fade-in">
            <p style={s.transcriptLabel}>Vous</p>
            <p style={s.transcriptText}>« {transcript} »</p>
          </div>
        )}

        {/* Ce que NOVA a dit */}
        {novaText && (
          <div style={s.novaBox} className="fade-in">
            <p style={s.novaLabel}>✦ Nova</p>
            <p style={s.novaText}>{novaText}</p>
          </div>
        )}

        {error && <p style={s.error} className="fade-in">{error}</p>}

        {/* Auto-écoute */}
        <div style={s.autoRow}>
          <button style={{ ...s.autoBtn, ...(autoListen ? s.autoBtnOn : {}) }} onClick={() => setAutoListen(!autoListen)}>
            {autoListen ? "✦ Conversation continue : ON" : "Conversation continue : OFF"}
          </button>
        </div>

        {/* Compteur échanges */}
        {history.length > 0 && (
          <div style={s.historyWrap}>
            <p style={s.historyLabel}>✦ {Math.floor(history.length / 2)} échange{history.length > 2 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "'Palatino Linotype', serif", color: "#f0e8d8", overflow: "hidden", position: "relative" },
  videoBg: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" },
  videoIframe: { position: "absolute", top: "50%", left: "50%", transform: "translateX(-50%) translateY(-50%)", width: "100vw", height: "56.25vw", minHeight: "100vh", minWidth: "177.77vh", border: "none" },
  overlay: { position: "fixed", inset: 0, zIndex: 1, background: "rgba(0,0,0,0.82)", pointerEvents: "none" },
  particleContainer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 },
  header: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(200,160,80,0.1)" },
  backBtn: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 20, padding: "7px 16px", color: "#d4a84b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1, textDecoration: "none", transition: "all 0.3s" },
  headerCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  logoSymbol: { fontSize: 14, color: "#d4a84b", letterSpacing: 4 },
  headerTitle: { fontFamily: "'Cinzel', serif", fontSize: 16, letterSpacing: 8, color: "#d4a84b" },
  headerSub: { fontSize: 10, letterSpacing: 3, color: "#706050", textTransform: "uppercase" },
  resetBtn: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 20, padding: "7px 14px", color: "#a09080", fontSize: 16, cursor: "pointer", transition: "all 0.3s" },
  browserWarning: { position: "fixed", top: 70, left: 0, right: 0, zIndex: 99, background: "rgba(180,100,20,0.95)", backdropFilter: "blur(10px)", padding: "14px 24px", color: "#fff8e0", fontSize: 13, textAlign: "center", lineHeight: 1.6, borderBottom: "1px solid rgba(200,160,80,0.4)" },
  center: { position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "100px 24px 40px", gap: 24, maxWidth: 600, width: "100%" },
  centerBox: { position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 24, padding: "48px 40px", maxWidth: 400, width: "90%" },
  title: { fontFamily: "'Cinzel', serif", fontSize: 40, fontWeight: 400, letterSpacing: 14, color: "#d4a84b", margin: 0 },
  subtitle: { fontSize: 12, letterSpacing: 4, color: "#706050", textTransform: "uppercase", margin: 0 },
  orbeWrap: { position: "relative", width: 200, height: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  orbeRing3: { position: "absolute", inset: -20, borderRadius: "50%", border: "1px solid rgba(200,160,80,0.1)", transition: "all 0.5s" },
  orbeRing2: { position: "absolute", inset: -8, borderRadius: "50%", border: "1px solid rgba(200,160,80,0.2)", transition: "all 0.5s" },
  orbeRing1: { position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(200,160,80,0.4)", transition: "all 0.5s" },
  orbeRingActive3: { border: "1px solid rgba(200,160,80,0.3)", boxShadow: "0 0 40px rgba(200,160,80,0.1)" },
  orbeRingActive2: { border: "1px solid rgba(200,160,80,0.5)", boxShadow: "0 0 20px rgba(200,160,80,0.2)" },
  orbeRingActive1: { border: "1px solid rgba(200,160,80,0.8)", boxShadow: "0 0 30px rgba(200,160,80,0.4)" },
  orbe: { width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,90,200,0.3) 0%, rgba(200,160,80,0.15) 60%, rgba(0,0,0,0.4) 100%)", border: "2px solid rgba(200,160,80,0.5)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.4s ease", boxShadow: "0 0 40px rgba(200,160,80,0.2)", zIndex: 1 },
  orbeListen: { background: "radial-gradient(circle, rgba(200,60,60,0.4) 0%, rgba(200,100,80,0.2) 60%, rgba(0,0,0,0.4) 100%)", border: "2px solid rgba(220,80,80,0.8)", boxShadow: "0 0 60px rgba(200,60,60,0.4)" },
  orbeThink: { background: "radial-gradient(circle, rgba(139,90,200,0.5) 0%, rgba(100,60,180,0.3) 60%, rgba(0,0,0,0.4) 100%)", border: "2px solid rgba(180,120,220,0.8)", boxShadow: "0 0 60px rgba(139,90,200,0.5)" },
  orbeSpeak: { background: "radial-gradient(circle, rgba(200,160,80,0.5) 0%, rgba(180,130,50,0.3) 60%, rgba(0,0,0,0.4) 100%)", border: "2px solid rgba(200,160,80,0.9)", boxShadow: "0 0 60px rgba(200,160,80,0.5)" },
  micIcon: { fontSize: 48, userSelect: "none" },
  statusLabel: { fontSize: 14, letterSpacing: 2, color: "#a09080", textTransform: "uppercase", transition: "color 0.3s" },
  transcriptBox: { background: "rgba(139,90,200,0.12)", border: "1px solid rgba(139,90,200,0.3)", borderRadius: 16, padding: "16px 20px", maxWidth: 480, width: "100%", textAlign: "center" },
  transcriptLabel: { fontSize: 10, letterSpacing: 3, color: "#9070c0", textTransform: "uppercase", marginBottom: 8 },
  transcriptText: { fontSize: 15, color: "#e0d0f0", lineHeight: 1.6, fontStyle: "italic" },
  novaBox: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: 16, padding: "20px 24px", maxWidth: 480, width: "100%", textAlign: "center" },
  novaLabel: { fontSize: 10, letterSpacing: 3, color: "#d4a84b", textTransform: "uppercase", marginBottom: 10 },
  novaText: { fontSize: 15, color: "#ede0cc", lineHeight: 1.8 },
  error: { color: "#e8a060", fontSize: 13, textAlign: "center", background: "rgba(200,80,20,0.15)", border: "1px solid rgba(200,80,20,0.3)", borderRadius: 12, padding: "12px 20px", maxWidth: 480, width: "100%", lineHeight: 1.6 },
  autoRow: { display: "flex", justifyContent: "center" },
  autoBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 20, padding: "8px 20px", color: "#a09080", fontFamily: "inherit", fontSize: 12, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.3s" },
  autoBtnOn: { background: "rgba(200,160,80,0.15)", border: "1px solid rgba(200,160,80,0.5)", color: "#d4a84b" },
  historyWrap: { textAlign: "center" },
  historyLabel: { fontSize: 11, color: "#504030", letterSpacing: 1 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; }
  .particle { position: absolute; background: radial-gradient(circle, rgba(200,160,80,0.6) 0%, transparent 70%); border-radius: 50%; animation: float linear infinite; }
  @keyframes float { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.5; } 100% { transform: translateY(-100px) translateX(30px); opacity: 0; } }
  .orbe-ring { animation: ringPulse 3s ease-in-out infinite; }
  @keyframes ringPulse { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.04); opacity: 1; } }
  .orbe-btn { animation: orbeIdle 4s ease-in-out infinite; }
  .orbe-btn.listening { animation: orbeListen 0.8s ease-in-out infinite; }
  .orbe-btn.thinking { animation: orbeThink 1.5s ease-in-out infinite; }
  .orbe-btn.speaking { animation: orbeSpeak 1s ease-in-out infinite; }
  @keyframes orbeIdle { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
  @keyframes orbeListen { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(200,60,60,0.3); } 50% { transform: scale(1.06); box-shadow: 0 0 80px rgba(200,60,60,0.6); } }
  @keyframes orbeThink { 0%, 100% { transform: scale(1) rotate(0deg); } 50% { transform: scale(1.04) rotate(5deg); } }
  @keyframes orbeSpeak { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(200,160,80,0.4); } 50% { transform: scale(1.05); box-shadow: 0 0 80px rgba(200,160,80,0.7); } }
  .status-active { color: #d4a84b !important; }
  .fade-in { animation: fadeIn 0.5s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
`;
