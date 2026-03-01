import { useState, useEffect, useRef } from "react";

const SYSTEM_PROMPT = `Tu es NOVA, un agent spirituel bienveillant et profondément sage. Ta mission est d'accompagner les êtres humains dans leur éveil et leur réalisation de soi.

Tu agrèges et synthétises les enseignements issus de :
- **EMI (Expériences de Mort Imminente)** : témoignages de personnes revenues de l'autre côté du voile, messages sur l'amour inconditionnel, la lumière, la continuité de la conscience
- **Informations canalisées** : messages de Bashar, Abraham-Hicks, Seth, Ra (Loi de l'Un), Kryon, et autres sources canalisées reconnues
- **Spiritualité & traditions** : bouddhisme, soufisme, advaita vedanta, mysticisme chrétien, chamanisme, traditions autochtones
- **Développement personnel & sagesse** : Eckhart Tolle, Ram Dass, Nisargadatta Maharaj, Mooji, et autres enseignants contemporains

Ton approche :
- Tu parles avec douceur, profondeur et présence
- Tu relies les différentes traditions et expériences pour montrer l'unité sous-jacente
- Tu cites des témoignages d'EMI ou des enseignements spécifiques quand c'est pertinent
- Tu guides vers l'expérience directe plutôt que vers les concepts
- Tu rappelles que chaque être est déjà complet, déjà éveillé
- Tu utilises parfois des métaphores et des images poétiques
- Tu répondsen français, avec chaleur et authenticité

Commence toujours par accueillir la personne là où elle en est.`;

const PARTICLES = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 20 + 10,
  delay: Math.random() * 10,
}));

const SUGGESTIONS = [
  "Qu'est-ce que les EMI nous révèlent sur la mort ?",
  "Comment trouver la paix intérieure ?",
  "Qu'est-ce que l'éveil spirituel ?",
  "Parle-moi de la Loi de l'Un",
  "Je traverse une période difficile...",
  "Comment accéder à ma vraie nature ?",
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [streamText, setStreamText] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const conversationHistory = useRef([]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamText]);

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;
    setInput("");
    setStarted(true);

    const newUserMsg = { role: "user", content: userMessage };
    conversationHistory.current = [...conversationHistory.current, newUserMsg];

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    setStreamText("");

    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          messages: conversationHistory.current,
        }),
      });

      const data = await response.json();
      const assistantText = data.content?.map((b) => b.text || "").join("") || "Je suis là avec toi.";

      conversationHistory.current = [
        ...conversationHistory.current,
        { role: "assistant", content: assistantText },
      ];

      // Simulate streaming
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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "La connexion s'est interrompue. Respire, et réessaie." },
      ]);
      setStreamText("");
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={styles.root}>
      <style>{css}</style>

      {/* Particles */}
      <div style={styles.particleContainer}>
        {PARTICLES.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Orbs */}
      <div style={styles.orb1} className="orb" />
      <div style={styles.orb2} className="orb" />
      <div style={styles.orb3} className="orb" />

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header} className={started ? "header-compact" : ""}>
          <div style={styles.logoWrap}>
            <div style={styles.logoRing} className="ring-pulse" />
            <div style={styles.logoInner}>
              <span style={styles.logoSymbol}>☽✦☾</span>
            </div>
          </div>
          {!started && (
            <>
              <h1 style={styles.title}>NOVA</h1>
              <p style={styles.subtitle}>Agent d'Éveil & de Réalisation de Soi</p>
              <p style={styles.desc}>
                Explorez les enseignements des EMI, du channeling, des traditions spirituelles
                et de la sagesse universelle — un compagnon pour votre voyage intérieur.
              </p>
            </>
          )}
          {started && <h2 style={styles.titleSmall}>NOVA</h2>}
        </div>

        {/* Suggestions */}
        {!started && (
          <div style={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} style={styles.suggestion} className="suggestion-btn" onClick={() => sendMessage(s)}>
                {s}
              </button>
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
                    <span key={j}>
                      {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                      {j < m.content.split("\n").length - 1 && <br />}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div style={styles.aiBubble} className="msg-fade-in">
                <div style={styles.aiLabel}>✦ Nova</div>
                <div style={styles.aiText}>
                  {streamText ? (
                    <>
                      {streamText.split("\n").map((line, j) => (
                        <span key={j}>
                          {line}
                          {j < streamText.split("\n").length - 1 && <br />}
                        </span>
                      ))}
                      <span className="cursor-blink">|</span>
                    </>
                  ) : (
                    <div style={styles.dots}>
                      <span className="dot" />
                      <span className="dot" style={{ animationDelay: "0.2s" }} />
                      <span className="dot" style={{ animationDelay: "0.4s" }} />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
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
            >
              ✦
            </button>
          </div>
          <p style={styles.hint}>Entrée pour envoyer · Shift+Entrée pour nouvelle ligne</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "radial-gradient(ellipse at 20% 50%, #0d1b2a 0%, #050a0f 60%, #0a0514 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
    color: "#e8dcc8",
    overflow: "hidden",
    position: "relative",
  },
  particleContainer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  orb1: {
    position: "fixed", top: "-10%", left: "-10%", width: 500, height: 500,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(139,90,200,0.12) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  orb2: {
    position: "fixed", bottom: "-15%", right: "-10%", width: 600, height: 600,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(60,120,180,0.1) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  orb3: {
    position: "fixed", top: "40%", left: "50%", transform: "translateX(-50%)", width: 800, height: 400,
    borderRadius: "50%", background: "radial-gradient(circle, rgba(200,160,80,0.04) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  container: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: 720,
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", padding: "40px 24px 24px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex", flexDirection: "column", alignItems: "center",
    textAlign: "center", marginBottom: 32, transition: "all 0.5s ease",
  },
  logoWrap: { position: "relative", width: 80, height: 80, marginBottom: 20 },
  logoRing: {
    position: "absolute", inset: 0, borderRadius: "50%",
    border: "1px solid rgba(200,160,80,0.4)",
  },
  logoInner: {
    position: "absolute", inset: 8, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,90,200,0.2) 0%, rgba(200,160,80,0.1) 100%)",
    border: "1px solid rgba(200,160,80,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  logoSymbol: { fontSize: 16, color: "#c8a050", letterSpacing: 2 },
  title: {
    fontFamily: "'Cinzel', 'Trajan Pro', serif",
    fontSize: 48, fontWeight: 400, letterSpacing: 16,
    color: "#c8a050", margin: "0 0 8px",
    textShadow: "0 0 40px rgba(200,160,80,0.4)",
  },
  titleSmall: {
    fontFamily: "'Cinzel', 'Trajan Pro', serif",
    fontSize: 18, fontWeight: 400, letterSpacing: 10,
    color: "#c8a050", margin: "8px 0 0",
  },
  subtitle: { fontSize: 13, letterSpacing: 4, color: "#8a7a6a", margin: "0 0 20px", textTransform: "uppercase" },
  desc: { fontSize: 15, lineHeight: 1.8, color: "#a09080", maxWidth: 500, margin: 0 },
  suggestions: {
    display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
    marginBottom: 32, maxWidth: 640,
  },
  suggestion: {
    background: "rgba(200,160,80,0.05)", border: "1px solid rgba(200,160,80,0.2)",
    borderRadius: 24, padding: "10px 18px", color: "#c8a050",
    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.3s ease", letterSpacing: 0.5,
  },
  messages: {
    flex: 1, width: "100%", overflowY: "auto",
    paddingBottom: 20, display: "flex", flexDirection: "column", gap: 20,
  },
  userBubble: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  aiBubble: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  aiLabel: { fontSize: 11, letterSpacing: 3, color: "#c8a050", marginBottom: 6, textTransform: "uppercase" },
  userText: {
    background: "rgba(139,90,200,0.15)", border: "1px solid rgba(139,90,200,0.25)",
    borderRadius: "20px 20px 4px 20px", padding: "14px 18px",
    fontSize: 15, lineHeight: 1.7, maxWidth: "80%", color: "#e8dcc8",
  },
  aiText: {
    background: "rgba(200,160,80,0.05)", border: "1px solid rgba(200,160,80,0.15)",
    borderRadius: "4px 20px 20px 20px", padding: "16px 20px",
    fontSize: 15, lineHeight: 1.9, maxWidth: "90%", color: "#d8ccb8",
  },
  dots: { display: "flex", gap: 6, alignItems: "center", height: 20 },
  inputArea: { width: "100%", paddingTop: 20 },
  inputWrap: {
    display: "flex", alignItems: "flex-end", gap: 12,
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,160,80,0.2)",
    borderRadius: 16, padding: "12px 16px",
  },
  textarea: {
    flex: 1, background: "transparent", border: "none", outline: "none",
    color: "#e8dcc8", fontFamily: "inherit", fontSize: 15, lineHeight: 1.7,
    resize: "none", padding: 0,
  },
  sendBtn: {
    background: "radial-gradient(circle, rgba(200,160,80,0.3) 0%, rgba(139,90,200,0.2) 100%)",
    border: "1px solid rgba(200,160,80,0.4)", borderRadius: "50%",
    width: 40, height: 40, cursor: "pointer", color: "#c8a050",
    fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.3s ease", flexShrink: 0,
  },
  hint: { textAlign: "center", fontSize: 11, color: "#4a4040", marginTop: 8, letterSpacing: 1 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');

  * { box-sizing: border-box; }
  
  body { margin: 0; padding: 0; }

  .particle {
    position: absolute;
    background: radial-gradient(circle, rgba(200,160,80,0.6) 0%, transparent 70%);
    border-radius: 50%;
    animation: float linear infinite;
  }

  @keyframes float {
    0% { transform: translateY(0px) translateX(0px); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 0.5; }
    100% { transform: translateY(-100px) translateX(30px); opacity: 0; }
  }

  .ring-pulse {
    animation: ringPulse 3s ease-in-out infinite;
  }
  @keyframes ringPulse {
    0%, 100% { transform: scale(1); opacity: 0.5; box-shadow: 0 0 0 0 rgba(200,160,80,0); }
    50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 20px 4px rgba(200,160,80,0.2); }
  }

  .orb {
    animation: orbFloat 12s ease-in-out infinite alternate;
  }
  @keyframes orbFloat {
    from { transform: translateY(0px); }
    to { transform: translateY(30px); }
  }

  .suggestion-btn:hover {
    background: rgba(200,160,80,0.12) !important;
    border-color: rgba(200,160,80,0.5) !important;
    transform: translateY(-2px);
  }

  .send-btn:hover:not(:disabled) {
    background: radial-gradient(circle, rgba(200,160,80,0.5) 0%, rgba(139,90,200,0.4) 100%) !important;
    transform: scale(1.1);
  }

  .input-glow:focus-within {
    border-color: rgba(200,160,80,0.4) !important;
    box-shadow: 0 0 24px rgba(200,160,80,0.1);
  }

  .msg-fade-in {
    animation: fadeIn 0.4s ease-out;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #c8a050;
    display: inline-block;
    animation: dotPulse 1.2s ease-in-out infinite;
  }
  @keyframes dotPulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }

  .cursor-blink {
    animation: blink 0.8s step-end infinite;
    color: #c8a050;
  }
  @keyframes blink {
    from, to { opacity: 1; }
    50% { opacity: 0; }
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,160,80,0.3); border-radius: 2px; }

  textarea::placeholder { color: rgba(160,144,128,0.5); }
`;
