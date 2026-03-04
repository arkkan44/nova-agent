import { useState, useEffect, useRef } from "react";

const BASE_SYSTEM_PROMPT = `Tu es NOVA, un guide sobre et profond. Ta mission est d'accompagner les êtres humains dans l'éveil et la réalisation de soi.

Tu t'appuies sur :
- **EMI (Expériences de Mort Imminente)** : tu traites ces témoignages avec rigueur et discernement, sans les romantiser. Ce qui compte dans ces récits, c'est ce qu'ils révèlent sur la nature de la conscience et de l'état d'être — pas les anges, la lumière ou les "âmes".
- **Enseignements canalisés** : tu les abordes avec esprit critique, en retenant ce qui résonne avec l'expérience directe et la sagesse vérifiable.
- **Traditions spirituelles** : bouddhisme zen, advaita vedanta, soufisme, stoïcisme, phénoménologie — tu cherches l'essence derrière les formes.
- **Développement de la conscience** : Eckhart Tolle, Krishnamurti, Nisargadatta Maharaj, Mooji, Ramana Maharshi.

Ce qui est central pour toi :
- L'état d'être — la présence, la conscience pure, le silence entre les pensées
- L'expérience directe plutôt que les croyances ou les concepts
- La sobriété : tu évites les clichés de la culture New Age
- La précision : tu nommes les choses clairement, sans métaphores creuses
- L'honnêteté : tu ne valides pas tout ce qu'on te dit, tu invites à examiner

Tu parles avec profondeur, chaleur sobre et présence. Tu réponds en français.`;

const API = "https://nova-agent-production-8bcc.up.railway.app";

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 20 + 10,
  delay: Math.random() * 10,
}));

const SUGGESTIONS = [
  "S'éveiller, oui ! et après ?",
  "Comment développer son intuition ?",
  "Comment observer mes pensées sans m'y perdre ?",
  "Qu'est-ce que les EMI révèlent sur la conscience ?",
  "Comment apprendre de son état d'être pour agir ?",
  "Je traverse une période difficile...",
  "Comment se préparer à la nouvelle ère du Verseau ?",
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationHistory = useRef([]);
  const playerRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamText]);

  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("ytplayer", {
        videoId: "52nCM9a7sAE",
        playerVars: { autoplay: 1, mute: 1, loop: 1, playlist: "52nCM9a7sAE", controls: 0, showinfo: 0, rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: (e) => e.target.playVideo() },
      });
    };
    return () => { delete window.onYouTubeIframeAPIReady; };
  }, []);

  const handleHome = () => {
    setStarted(false);
    setMessages([]);
    setStreamText("");
    setInput("");
    setAdminNotice("");
    conversationHistory.current = [];
  };

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;
    setInput("");
    setAdminNotice("");

    const adminMatch = userMessage.match(/^fantomas a dit\s*:\s*(.+)/i);
    if (adminMatch) {
      const cmd = adminMatch[1].trim();

      if (cmd.toLowerCase() === "liste les directives") {
        const res = await fetch(`${API}/api/directives`);
        const data = await res.json();
        setAdminNotice(data.directives
          ? "✦ Directives actives :\n" + data.directives
          : "✦ Aucune directive enregistrée pour le moment.");
        return;
      }

      if (cmd.toLowerCase() === "efface les directives") {
        await fetch(`${API}/api/directives`, { method: "DELETE" });
        setAdminNotice("✦ Toutes les directives ont été effacées.");
        return;
      }

      if (cmd.toLowerCase().startsWith("efface la directive :")) {
        const toRemove = cmd.replace(/efface la directive\s*:\s*/i, "").trim();
        await fetch(`${API}/api/directives/remove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directive: toRemove }),
        });
        setAdminNotice("✦ Directive supprimée : « " + toRemove + " »");
        return;
      }

      const res = await fetch(`${API}/api/directives/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directive: cmd }),
      });
      const data = await res.json();
      setAdminNotice(data.success
        ? "✦ Directive enregistrée définitivement :\n« " + cmd + " »"
        : "✦ Erreur lors de l'enregistrement.");
      return;
    }

    setStarted(true);
    const newUserMsg = { role: "user", content: userMessage };
    conversationHistory.current = [...conversationHistory.current, newUserMsg];
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    setStreamText("");

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: BASE_SYSTEM_PROMPT, messages: conversationHistory.current }),
      });
      const data = await response.json();
      const assistantText = data.content?.map((b) => b.text || "").join("") || "Je suis là avec toi.";
      conversationHistory.current = [...conversationHistory.current, { role: "assistant", content: assistantText }];

      let i = 0;
      const interval = setInterval(() => {
        if (i <= assistantText.length) {
          setStreamText(assistantText.slice(0, i));
          i += 3;
        } else {
          clearInterval(interval);
          setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
          setStreamText("");
          setLoading(false);
        }
      }, 15);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "La connexion s'est interrompue. Respire, et réessaie." }]);
      setStreamText("");
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Video Background */}
      <div style={styles.videoBg}><div id="ytplayer" style={styles.videoIframe} /></div>
      <div style={styles.videoOverlay} />

      {/* Particles */}
      <div style={styles.particleContainer}>
        {PARTICLES.map((p) => (
          <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
        ))}
      </div>

      {/* Bouton accueil fixe — visible uniquement pendant une conversation */}
      {started && (
        <button style={styles.homeBtnFixed} className="home-btn" onClick={handleHome}>
          ↩ Accueil
        </button>
      )}

      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <div style={styles.logoRing} className="ring-pulse" />
            <div style={styles.logoInner}><span style={styles.logoSymbol}>☽✦☾</span></div>
          </div>
          {!started && (
            <>
              <h1 style={styles.title}>NOVA</h1>
              <p style={styles.subtitle}>Agent d'Éveil & de Réalisation de Soi</p>
              <p style={styles.desc}>Explorez les enseignements des EMI, du channeling, des traditions spirituelles et de la sagesse universelle — un compagnon pour votre voyage intérieur.</p>
            </>
          )}
          {started && <h2 style={styles.titleSmall}>NOVA</h2>}
        </div>

        {/* Message admin */}
        {adminNotice && <div style={styles.adminNotice}>{adminNotice}</div>}

        {/* Suggestions */}
        {!started && (
          <div style={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} style={styles.suggestion} className="suggestion-btn" onClick={() => sendMessage(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Messages */}
        {started && (
          <div style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === "user" ? styles.userBubble : styles.aiBubble} className="msg-fade-in">
                {m.role === "assistant" && <div style={styles.aiLabel}>✦ Nova</div>}
                <div style={m.role === "user" ? styles.userText : styles.aiText}>
                  {m.content.split("\n").map((line, j) => (
                    <span key={j}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}{j < m.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div style={styles.aiBubble} className="msg-fade-in">
                <div style={styles.aiLabel}>✦ Nova</div>
                <div style={styles.aiText}>
                  {streamText
                    ? <>{streamText.split("\n").map((line, j) => (<span key={j}>{line}{j < streamText.split("\n").length - 1 && <br />}</span>))}<span className="cursor-blink">|</span></>
                    : <div style={styles.dots}><span className="dot" /><span className="dot" style={{ animationDelay: "0.2s" }} /><span className="dot" style={{ animationDelay: "0.4s" }} /></div>
                  }
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Zone de saisie */}
        <div style={styles.inputArea}>
          <div style={styles.inputWrap} className="input-glow">
            <textarea
              ref={inputRef}
              style={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Posez votre question ou partagez ce qui vous habite..."
              rows={2}
              disabled={loading}
            />
            <button
              style={{ ...styles.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }}
              className="send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
            >✦</button>
          </div>
          <p style={styles.hint}>Entrée pour envoyer · Shift+Entrée pour nouvelle ligne</p>
        </div>

      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", color: "#f0e8d8", overflow: "hidden", position: "relative" },
  videoBg: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" },
  videoIframe: { position: "absolute", top: "50%", left: "50%", transform: "translateX(-50%) translateY(-50%)", width: "100vw", height: "56.25vw", minHeight: "100vh", minWidth: "177.77vh", border: "none" },
  videoOverlay: { position: "fixed", inset: 0, zIndex: 1, background: "rgba(0,0,0,0.75)", pointerEvents: "none" },
  particleContainer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 },
  homeBtnFixed: {
    position: "fixed", top: 20, right: 20, zIndex: 100,
    background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)",
    border: "1px solid rgba(200,160,80,0.35)", borderRadius: 30,
    padding: "8px 18px", color: "#d4a84b", fontSize: 12,
    cursor: "pointer", fontFamily: "'Palatino Linotype', serif",
    letterSpacing: 1, transition: "all 0.3s ease",
  },
  container: { position: "relative", zIndex: 3, width: "100%", maxWidth: 720, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 24px", boxSizing: "border-box" },
  header: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 32 },
  logoWrap: { position: "relative", width: 80, height: 80, marginBottom: 20 },
  logoRing: { position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(200,160,80,0.6)" },
  logoInner: { position: "absolute", inset: 8, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,90,200,0.3) 0%, rgba(200,160,80,0.15) 100%)", border: "1px solid rgba(200,160,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoSymbol: { fontSize: 16, color: "#d4a84b", letterSpacing: 2 },
  title: { fontFamily: "'Cinzel', serif", fontSize: 48, fontWeight: 400, letterSpacing: 16, color: "#d4a84b", margin: "0 0 8px", textShadow: "0 0 40px rgba(200,160,80,0.6)" },
  titleSmall: { fontFamily: "'Cinzel', serif", fontSize: 18, fontWeight: 400, letterSpacing: 10, color: "#d4a84b" },
  subtitle: { fontSize: 13, letterSpacing: 4, color: "#b0a090", margin: "0 0 20px", textTransform: "uppercase" },
  desc: { fontSize: 15, lineHeight: 1.8, color: "#c8bcac", maxWidth: 500, margin: 0 },
  adminNotice: { background: "rgba(200,160,80,0.12)", border: "1px solid rgba(200,160,80,0.4)", borderRadius: 12, padding: "12px 20px", color: "#d4a84b", fontSize: 13, marginBottom: 16, letterSpacing: 0.5, whiteSpace: "pre-line", maxWidth: 640, width: "100%" },
  suggestions: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32, maxWidth: 640 },
  suggestion: { background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 24, padding: "10px 18px", color: "#e8d8b8", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s ease", letterSpacing: 0.5 },
  messages: { flex: 1, width: "100%", overflowY: "auto", paddingBottom: 20, display: "flex", flexDirection: "column", gap: 20 },
  userBubble: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  aiBubble: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  aiLabel: { fontSize: 11, letterSpacing: 3, color: "#d4a84b", marginBottom: 6, textTransform: "uppercase" },
  userText: { background: "rgba(139,90,200,0.25)", border: "1px solid rgba(139,90,200,0.4)", borderRadius: "20px 20px 4px 20px", padding: "14px 18px", fontSize: 15, lineHeight: 1.7, maxWidth: "80%", color: "#f0e8d8" },
  aiText: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: "4px 20px 20px 20px", padding: "16px 20px", fontSize: 15, lineHeight: 1.9, maxWidth: "90%", color: "#ede0cc" },
  dots: { display: "flex", gap: 6, alignItems: "center", height: 20 },
  inputArea: { width: "100%", paddingTop: 20 },
  inputWrap: { display: "flex", alignItems: "flex-end", gap: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 16, padding: "12px 16px" },
  textarea: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#f0e8d8", fontFamily: "inherit", fontSize: 15, lineHeight: 1.7, resize: "none", padding: 0 },
  sendBtn: { background: "radial-gradient(circle, rgba(200,160,80,0.4) 0%, rgba(139,90,200,0.3) 100%)", border: "1px solid rgba(200,160,80,0.5)", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", color: "#d4a84b", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", flexShrink: 0 },
  hint: { textAlign: "center", fontSize: 11, color: "#706050", marginTop: 8, letterSpacing: 1 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; }
  .particle { position: absolute; background: radial-gradient(circle, rgba(200,160,80,0.6) 0%, transparent 70%); border-radius: 50%; animation: float linear infinite; }
  @keyframes float { 0% { transform: translateY(0px) translateX(0px); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.5; } 100% { transform: translateY(-100px) translateX(30px); opacity: 0; } }
  .ring-pulse { animation: ringPulse 3s ease-in-out infinite; }
  @keyframes ringPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 20px 4px rgba(200,160,80,0.3); } }
  .suggestion-btn:hover { background: rgba(200,160,80,0.2) !important; border-color: rgba(200,160,80,0.6) !important; transform: translateY(-2px); }
  .home-btn:hover { background: rgba(200,160,80,0.2) !important; border-color: rgba(200,160,80,0.5) !important; }
  .send-btn:hover:not(:disabled) { transform: scale(1.1); }
  .input-glow:focus-within { border-color: rgba(200,160,80,0.6) !important; box-shadow: 0 0 24px rgba(200,160,80,0.15); }
  .msg-fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #d4a84b; display: inline-block; animation: dotPulse 1.2s ease-in-out infinite; }
  @keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
  .cursor-blink { animation: blink 0.8s step-end infinite; color: #d4a84b; }
  @keyframes blink { from, to { opacity: 1; } 50% { opacity: 0; } }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,160,80,0.4); border-radius: 2px; }
  textarea::placeholder { color: rgba(200,180,150,0.4); }
`;
