import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://izqedljmaiylwjkyoiwh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWVkbGptYWl5bHdqa3lvaXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzMyNjcsImV4cCI6MjA4ODIwOTI2N30.GcelpRphmj24YbV1T3ttFNuHSpy6g3t6NE6kIM33T4o";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const API = "https://nova-agent-production-8bcc.up.railway.app";

const ETATS = ["Anxieux / Stressé", "Triste ou lourd", "Agité / Dispersé", "Fatigué", "En quête de clarté", "Bien, je veux approfondir"];
const STYLES = ["Pleine conscience", "Visualisation", "Non-dualité / Présence", "Souffle & Corps", "Lâcher-prise"];

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2 + 1, duration: Math.random() * 20 + 10, delay: Math.random() * 10,
}));

export default function Meditation() {
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [step, setStep] = useState("intro"); // intro | form | generating | player
  const [etat, setEtat] = useState("");
  const [style, setStyle] = useState("");
  const [intention, setIntention] = useState("");
  const [meditationText, setMeditationText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [convId, setConvId] = useState(null);
  const [loadingReplay, setLoadingReplay] = useState(false);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u) loadProfil(u.id);
    });

    // Charger une méditation existante si ?id= dans l'URL
    const params = new URLSearchParams(window.location.search);
    const medId = params.get("id");
    if (medId) loadExistingMeditation(medId);
  }, []);

  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player("ytplayer-med", {
        videoId: "52nCM9a7sAE",
        playerVars: { autoplay: 1, mute: 1, loop: 1, playlist: "52nCM9a7sAE", controls: 0, showinfo: 0, rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: (e) => e.target.playVideo() },
      });
    };
    return () => { delete window.onYouTubeIframeAPIReady; };
  }, []);

  const loadProfil = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data?.completed) setProfil(data);
  };

  const loadExistingMeditation = async (id) => {
    setStep("generating");
    const { data: msgs } = await supabase.from("messages").select("content").eq("conversation_id", id).single();
    if (msgs?.content) {
      const text = msgs.content;
      setMeditationText(text);
      const wordCount = text.split(/\s+/).length;
      const estimatedSeconds = Math.round((wordCount / 100) * 60);
      setTotalTime(estimatedSeconds);
      setTimeLeft(estimatedSeconds);
      setConvId(id);
      setStep("player");
    } else {
      setStep("intro");
    }
  };

  const saveMeditation = async (text, etatChoisi, styleChoisi) => {
    if (!user || user.isAdminPreview) return null;
    const title = "🧘 " + etatChoisi + " — " + styleChoisi;
    const { data: conv } = await supabase.from("conversations").insert({ user_id: user.id, title }).select().single();
    if (!conv) return null;
    setConvId(conv.id);
    await supabase.from("messages").insert({ conversation_id: conv.id, role: "assistant", content: text });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
    return conv.id;
  };

  const generateMeditation = async () => {
    setIsLoading(true);
    setStep("generating");
    setError("");
    stoppedRef.current = false;

    const profilInfo = profil ? `L'utilisateur s'appelle ${profil.prenom}. Son chemin spirituel : ${profil.chemin_spirituel?.join(", ") || "non précisé"}. Ses expériences : ${profil.experiences?.join(", ") || "non précisé"}.` : "";

    const prompt = `Tu es NOVA, guide spirituel profond et bienveillant. Génère une méditation guidée personnalisée.

${profilInfo}

État actuel de la personne : ${etat}
Style de méditation souhaité : ${style}
Intention : ${intention || "s'ouvrir à la paix intérieure"}

Génère une méditation guidée complète en français. NOVA décide de la durée selon l'état (entre 5 et 15 minutes de lecture à voix haute).

Règles absolues :
- Commence directement par guider, sans introduction
- Utilise "vous" pour s'adresser à la personne
- Ton doux, profond, enveloppant — comme une voix qui guide dans l'obscurité douce
- Inclus des pauses naturelles (indique-les avec "...")
- Adapte la profondeur spirituelle au profil
- Termine par un retour doux à la conscience ordinaire
- Pas de listes, pas de tirets — uniquement du texte fluide comme une rivière
- Ne mentionne jamais de durée dans le texte`;

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: "Tu es NOVA, un guide spirituel. Tu génères des méditations guidées profondes et personnalisées en français.",
          messages: [{ role: "user", content: prompt }]
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";

      const wordCount = text.split(/\s+/).length;
      const estimatedSeconds = Math.round((wordCount / 100) * 60);
      setTotalTime(estimatedSeconds);
      setTimeLeft(estimatedSeconds);
      setMeditationText(text);

      await saveMeditation(text, etat, style);
      setStep("player");
      await playMeditation(text, estimatedSeconds);
    } catch {
      setError("Erreur lors de la génération. Réessaie.");
      setStep("form");
    }
    setIsLoading(false);
  };

  // ─── LECTURE AUDIO SANS BLANCS ────────────────────────────────────────────
  // On envoie le texte complet en une seule requête ElevenLabs (max ~4500 chars)
  // Si le texte est plus long, on découpe en 2-3 paragraphes naturels (pas de phrases)
  const playMeditation = async (text, duration) => {
    try {
      setIsPlaying(true);
      stoppedRef.current = false;

      // Décompte
      if (timerRef.current) clearInterval(timerRef.current);
      const startTime = Date.now();
      const totalSec = duration || totalTime;
      timerRef.current = setInterval(() => {
        if (stoppedRef.current) { clearInterval(timerRef.current); return; }
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, totalSec - elapsed);
        setTimeLeft(remaining);
        setProgress(Math.min(100, Math.round((elapsed / totalSec) * 100)));
        if (remaining === 0) clearInterval(timerRef.current);
      }, 1000);

      // Découpage en gros blocs par paragraphes (pas par phrases)
      const chunks = splitByParagraphs(text, 4500);

      for (let i = 0; i < chunks.length; i++) {
        if (stoppedRef.current) break;

        const res = await fetch(`${API}/api/speak-meditation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: chunks[i] }),
        });
        if (!res.ok) continue;

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        await new Promise((resolve) => {
          if (stoppedRef.current) { resolve(); return; }
          const audio = new Audio(url);
          audioRef.current = audio;
          audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
          audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          audio.play().catch(() => resolve());
        });
      }

      if (!stoppedRef.current) {
        setProgress(100);
        setTimeLeft(0);
      }
      if (timerRef.current) clearInterval(timerRef.current);
      setIsPlaying(false);
    } catch {
      setIsPlaying(false);
    }
  };

  // Découpage par paragraphes entiers pour éviter les coupures de ton
  const splitByParagraphs = (text, maxLen) => {
    const paragraphs = text.split(/\n\n+/);
    const chunks = [];
    let current = "";
    for (const p of paragraphs) {
      if ((current + "\n\n" + p).length > maxLen && current) {
        chunks.push(current.trim());
        current = p;
      } else {
        current += (current ? "\n\n" : "") + p;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [text];
  };

  const stopMeditation = () => {
    stoppedRef.current = true;
    audioRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
  };

  const replayMeditation = async () => {
    setProgress(0);
    setTimeLeft(totalTime);
    stoppedRef.current = false;
    await playMeditation(meditationText, totalTime);
  };

  const reset = () => {
    stopMeditation();
    setStep("intro");
    setEtat(""); setStyle(""); setIntention("");
    setMeditationText(""); setProgress(0); setTimeLeft(0); setTotalTime(0); setConvId(null);
    window.history.replaceState({}, "", "/meditation");
  };

  return (
    <div style={s.root}>
      <style>{css}</style>
      <div style={s.videoBg}><div id="ytplayer-med" style={s.videoIframe} /></div>
      <div style={s.overlay} />
      <div style={s.particleContainer}>
        {PARTICLES.map(p => <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}
      </div>

      <div style={s.header}>
        <a href="/" style={s.backBtn}>← NOVA</a>
        <div style={s.headerCenter}>
          <span style={s.logoSymbol}>☽✦☾</span>
          <span style={s.headerTitle}>Méditation</span>
        </div>
        <div style={{ width: 80 }} />
      </div>

      <div style={s.center}>

        {step === "intro" && (
          <div style={s.card} className="fade-in">
            <div style={s.orbeSmall} className="orbe-idle"><span style={{ fontSize: 32 }}>🧘</span></div>
            <h1 style={s.title}>Méditation Guidée</h1>
            <p style={s.subtitle}>NOVA crée pour vous une méditation unique,<br />adaptée à votre état et votre chemin.</p>
            <button style={s.startBtn} className="start-btn" onClick={() => setStep("form")}>Commencer ✦</button>
          </div>
        )}

        {step === "form" && (
          <div style={s.card} className="fade-in">
            <h2 style={s.formTitle}>Comment vous sentez-vous<br />en ce moment ?</h2>
            <div style={s.optionsWrap}>
              {ETATS.map(e => (
                <button key={e} style={{ ...s.optionBtn, ...(etat === e ? s.optionBtnActive : {}) }} className="option-btn" onClick={() => setEtat(e)}>
                  {etat === e && "✦ "}{e}
                </button>
              ))}
            </div>
            <h2 style={{ ...s.formTitle, marginTop: 28 }}>Quel style de méditation ?</h2>
            <div style={s.optionsWrap}>
              {STYLES.map(st => (
                <button key={st} style={{ ...s.optionBtn, ...(style === st ? s.optionBtnActive : {}) }} className="option-btn" onClick={() => setStyle(st)}>
                  {style === st && "✦ "}{st}
                </button>
              ))}
            </div>
            <h2 style={{ ...s.formTitle, marginTop: 28 }}>Une intention ? <span style={{ color: "#706050", fontSize: 13 }}>(optionnel)</span></h2>
            <textarea style={s.textarea} placeholder="Ex: trouver la paix, lâcher le mental, m'ouvrir à l'amour..."
              value={intention} onChange={e => setIntention(e.target.value)} rows={2} />
            {error && <p style={s.error}>{error}</p>}
            <button style={{ ...s.startBtn, opacity: etat && style ? 1 : 0.4, marginTop: 28 }} className={etat && style ? "start-btn" : ""} onClick={generateMeditation} disabled={!etat || !style}>
              Générer ma méditation ✦
            </button>
          </div>
        )}

        {step === "generating" && (
          <div style={s.card} className="fade-in">
            <div style={s.orbeSmall} className="orbe-think"><span style={{ fontSize: 28 }}>✦</span></div>
            <p style={s.generatingText}>NOVA prépare votre méditation...</p>
            <p style={s.generatingSubText}>Un espace sacré se crée pour vous</p>
          </div>
        )}

        {step === "player" && (
          <div style={s.playerCard} className="fade-in">
            <div style={s.orbe} className={isPlaying ? "orbe-speak" : "orbe-idle"}>
              <span style={{ fontSize: 36 }}>{isPlaying ? "✦" : "🧘"}</span>
            </div>
            <p style={s.playerStatus}>{isPlaying ? "NOVA vous guide..." : progress === 100 ? "Méditation terminée ✦" : "Prêt à commencer"}</p>

            {totalTime > 0 && (
              <div style={s.timerWrap}>
                <span style={s.timerText}>
                  {progress === 100 ? "✦ Terminée" : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")} restantes`}
                </span>
                <span style={s.timerTotal}> / {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")}</span>
              </div>
            )}

            <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${progress}%` }} /></div>

            <div style={s.textScroll}>
              <p style={s.meditationText}>{meditationText}</p>
            </div>

            <div style={s.controls}>
              {isPlaying
                ? <button style={s.controlBtn} className="control-btn" onClick={stopMeditation}>⏸ Pause</button>
                : <button style={s.controlBtn} className="control-btn" onClick={replayMeditation}>{progress > 0 && progress < 100 ? "▶ Reprendre" : "▶ Écouter"}</button>
              }
              <button style={s.controlBtnSecondary} onClick={reset}>↺ Nouvelle</button>
            </div>
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
  overlay: { position: "fixed", inset: 0, zIndex: 1, background: "rgba(0,0,0,0.85)", pointerEvents: "none" },
  particleContainer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 },
  header: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(200,160,80,0.1)" },
  backBtn: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 20, padding: "7px 16px", color: "#d4a84b", fontSize: 12, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1, textDecoration: "none" },
  headerCenter: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  logoSymbol: { fontSize: 12, color: "#d4a84b", letterSpacing: 4 },
  headerTitle: { fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: 6, color: "#d4a84b" },
  center: { position: "relative", zIndex: 3, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "100px 24px 40px", width: "100%", maxWidth: 600 },
  card: { background: "rgba(0,0,0,0.55)", backdropFilter: "blur(24px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 28, padding: "40px 36px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 },
  playerCard: { background: "rgba(0,0,0,0.55)", backdropFilter: "blur(24px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 28, padding: "36px 28px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 },
  orbeSmall: { width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,90,200,0.3) 0%, rgba(200,160,80,0.15) 100%)", border: "1px solid rgba(200,160,80,0.4)", display: "flex", alignItems: "center", justifyContent: "center" },
  orbe: { width: 140, height: 140, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,90,200,0.3) 0%, rgba(200,160,80,0.15) 100%)", border: "2px solid rgba(200,160,80,0.5)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.5s" },
  title: { fontFamily: "'Cinzel', serif", fontSize: 28, fontWeight: 400, letterSpacing: 8, color: "#d4a84b", margin: 0, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#a09080", lineHeight: 1.8, textAlign: "center", margin: 0 },
  startBtn: { background: "linear-gradient(135deg, #b8860b 0%, #d4a84b 50%, #a0720a 100%)", border: "none", borderRadius: 30, padding: "14px 36px", color: "#0a0800", fontFamily: "inherit", fontSize: 15, fontWeight: "700", cursor: "pointer", letterSpacing: 2, boxShadow: "0 0 24px rgba(200,160,80,0.5)", transition: "all 0.3s" },
  formTitle: { fontSize: 17, color: "#e8d8b8", textAlign: "center", margin: 0, lineHeight: 1.5 },
  optionsWrap: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", width: "100%" },
  optionBtn: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: 24, padding: "10px 16px", color: "#c8bcac", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.25s", letterSpacing: 0.3 },
  optionBtnActive: { background: "rgba(200,160,80,0.2)", border: "1px solid rgba(200,160,80,0.7)", color: "#d4a84b", fontWeight: "600" },
  textarea: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: 14, padding: "12px 16px", color: "#fff", fontFamily: "inherit", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.7 },
  error: { color: "#e8a060", fontSize: 13, textAlign: "center" },
  generatingText: { fontSize: 18, color: "#d4a84b", letterSpacing: 2, textAlign: "center", margin: 0 },
  generatingSubText: { fontSize: 13, color: "#706050", letterSpacing: 1, textAlign: "center", margin: 0 },
  playerStatus: { fontSize: 14, letterSpacing: 2, color: "#d4a84b", textTransform: "uppercase", margin: 0 },
  timerWrap: { display: "flex", alignItems: "center", gap: 4 },
  timerText: { fontSize: 16, color: "#d4a84b", letterSpacing: 1, fontVariantNumeric: "tabular-nums" },
  timerTotal: { fontSize: 12, color: "#706050", letterSpacing: 0.5 },
  progressBar: { width: "100%", height: 3, background: "rgba(200,160,80,0.15)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #b8860b, #d4a84b)", borderRadius: 2, transition: "width 1s ease" },
  textScroll: { width: "100%", maxHeight: 220, overflowY: "auto", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,160,80,0.1)", borderRadius: 16, padding: "20px" },
  meditationText: { fontSize: 14, lineHeight: 2, color: "#c8bcac", margin: 0, whiteSpace: "pre-wrap" },
  controls: { display: "flex", gap: 12, alignItems: "center" },
  controlBtn: { background: "linear-gradient(135deg, #b8860b, #d4a84b)", border: "none", borderRadius: 24, padding: "12px 28px", color: "#0a0800", fontFamily: "inherit", fontSize: 14, fontWeight: "700", cursor: "pointer", letterSpacing: 1, boxShadow: "0 0 20px rgba(200,160,80,0.4)", transition: "all 0.3s" },
  controlBtnSecondary: { background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 24, padding: "12px 24px", color: "#d4a84b", fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.3s" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; }
  .particle { position: absolute; background: radial-gradient(circle, rgba(200,160,80,0.5) 0%, transparent 70%); border-radius: 50%; animation: float linear infinite; }
  @keyframes float { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.4; } 100% { transform: translateY(-80px); opacity: 0; } }
  .fade-in { animation: fadeIn 0.6s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  .orbe-idle { animation: orbeIdle 4s ease-in-out infinite; }
  @keyframes orbeIdle { 0%,100% { transform: scale(1); box-shadow: 0 0 20px rgba(200,160,80,0.2); } 50% { transform: scale(1.04); box-shadow: 0 0 40px rgba(200,160,80,0.4); } }
  .orbe-think { animation: orbeThink 1.5s ease-in-out infinite; background: radial-gradient(circle, rgba(139,90,200,0.5) 0%, rgba(100,60,180,0.3) 100%) !important; border-color: rgba(180,120,220,0.8) !important; }
  @keyframes orbeThink { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
  .orbe-speak { background: radial-gradient(circle, rgba(200,160,80,0.5) 0%, rgba(180,130,50,0.3) 100%) !important; border-color: rgba(200,160,80,0.9) !important; animation: orbeSpeak 1.2s ease-in-out infinite; box-shadow: 0 0 60px rgba(200,160,80,0.5) !important; }
  @keyframes orbeSpeak { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
  .option-btn:hover { background: rgba(200,160,80,0.18) !important; border-color: rgba(200,160,80,0.5) !important; color: #e8d8b8 !important; }
  .start-btn:hover { box-shadow: 0 0 40px rgba(200,160,80,0.8) !important; transform: translateY(-2px); }
  .control-btn:hover { box-shadow: 0 0 32px rgba(200,160,80,0.7) !important; transform: translateY(-1px); }
  textarea::placeholder { color: rgba(255,255,255,0.3); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(200,160,80,0.4); border-radius: 2px; }
`;
