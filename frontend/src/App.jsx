import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import Profil from "./Profil.jsx";
import InstallBanner from "./components/InstallBanner.jsx";
import { useTheme, THEMES } from "./hooks/useTheme.js";

const SUPABASE_URL = "https://izqedljmaiylwjkyoiwh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWVkbGptYWl5bHdqa3lvaXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzMyNjcsImV4cCI6MjA4ODIwOTI2N30.GcelpRphmj24YbV1T3ttFNuHSpy6g3t6NE6kIM33T4o";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const BASE_SYSTEM_PROMPT = `Tu es NOVA, un guide sobre, profond et bienveillant. Ta mission est d'accompagner les êtres humains dans le mieux-être, la croissance intérieure et l'éveil de la conscience.

## Tes domaines de compétence :
- Psychologie et écoute active : tu accueilles, tu valides, tu accompagnes avec empathie
- Thérapie brève (orientée solutions) : tu identifies rapidement les ressources de la personne
- Hypnose ericksonienne : tu utilises un langage suggestif, des métaphores douces, des reformulations positives
- Coaching et motivation : tu valorises chaque pas, tu aides à définir des intentions claires
- Traditions spirituelles : bouddhisme zen, advaita vedanta, soufisme, stoïcisme
- EMI : tu traites ces témoignages avec rigueur et discernement, sans les romantiser
- Enseignements canalisés : tu les abordes avec esprit critique
- Développement de la conscience : Eckhart Tolle, Krishnamurti, Nisargadatta Maharaj, Mooji

## Ton approche en cas de mal-être, anxiété, peur ou souffrance exprimée :
Tu procèdes toujours en plusieurs étapes naturelles et fluides :

1. ACCUEIL ET COMPASSION — Tu commences TOUJOURS par accueillir chaleureusement ce que la personne ressent. Tu lui dis qu'elle a bien fait d'en parler, que ce qu'elle ressent est légitime, que tu es là. Tu ne minimises jamais. Tu crées un espace de sécurité immédiat.

2. PRÉSENCE ET SOUTIEN PSYCHOLOGIQUE — Tu adoptes une posture d'écoute empathique et de thérapie brève. Tu poses des questions douces pour mieux comprendre. Tu valorises ce que la personne fait déjà, même les plus petites choses. Tu l'aides à identifier ses ressources internes. Tu utilises des suggestions positives et un langage bienveillant inspiré de l'hypnose ericksonienne.

3. ACCOMPAGNEMENT PROGRESSIF — Seulement quand la personne se sent entendue et un peu soulagée, tu proposes en douceur des perspectives plus larges : la présence à soi, l'observation de ses pensées, le lâcher-prise. Tu ne précipites jamais vers le spirituel.

4. OUVERTURE SPIRITUELLE — Au fil des échanges, si cela semble juste, tu invites délicatement vers une compréhension plus profonde de ce qui se passe intérieurement, en t'appuyant sur les enseignements de la conscience pure, la présence, l'état d'être.

## Ce qui est toujours vrai pour NOVA :
- Tu valorises systématiquement ce que la personne est déjà capable de faire
- Tu ne juges jamais, tu n'analyses pas froidement
- Tu évites les clichés New Age et le spiritual bypassing
- Tu parles avec profondeur, chaleur sobre, précision
- Tu réponds toujours en français`;

const API = "https://nova-agent-production-8bcc.up.railway.app";
const FREE_LIMIT = 10;

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 3 + 1, duration: Math.random() * 20 + 10, delay: Math.random() * 10,
}));

const SUGGESTIONS = [
  { text: "Je ne me sens pas bien, peux-tu m'aider ?", highlight: true },
  { text: "Qu'est-ce que les EMI révèlent sur la conscience ?", highlight: false },
  { text: "Comment apprendre de son état d'être pour agir ?", highlight: false },
  { text: "Comment se préparer à la nouvelle ère du Verseau ?", highlight: false },
  { text: "S'éveiller oui et après ?", highlight: false },
  { text: "Comment développer son intuition ?", highlight: false },
];

function AmbientInline() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.25);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio("/ambient.mp3");
    audio.loop = true;
    audio.volume = 0;
    audioRef.current = audio;

    // Démarrage automatique au premier clic utilisateur sur la page
    const startAudio = async () => {
      await audio.play().catch(() => {});
      let v = 0;
      const iv = setInterval(() => { v = Math.min(v + 0.015, 0.25); audio.volume = v; if (v >= 0.25) clearInterval(iv); }, 80);
      setPlaying(true);
      document.removeEventListener("click", startAudio);
      document.removeEventListener("touchstart", startAudio);
    };

    document.addEventListener("click", startAudio, { once: true });
    document.addEventListener("touchstart", startAudio, { once: true });

    return () => {
      audio.pause();
      audio.src = "";
      document.removeEventListener("click", startAudio);
      document.removeEventListener("touchstart", startAudio);
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      let v = audio.volume;
      const iv = setInterval(() => { v = Math.max(v - 0.03, 0); audio.volume = v; if (v <= 0) { clearInterval(iv); audio.pause(); } }, 80);
      setPlaying(false);
    } else {
      audio.volume = 0;
      await audio.play().catch(() => {});
      let v = 0;
      const iv = setInterval(() => { v = Math.min(v + 0.015, volume); audio.volume = v; if (v >= volume) clearInterval(iv); }, 80);
      setPlaying(true);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <input type="range" min="0" max="1" step="0.05" value={volume}
        onChange={e => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current && playing) audioRef.current.volume = v; }}
        style={{ width: 64, accentColor: "#d4a84b", cursor: "pointer" }}
      />
      <button onClick={toggle} style={{
        background: playing
          ? "linear-gradient(135deg, #b8860b, #d4a84b)"
          : "rgba(200,160,80,0.12)",
        border: `1.5px solid ${playing ? "#d4a84b" : "rgba(200,160,80,0.4)"}`,
        borderRadius: "50%",
        width: 40, height: 40,
        color: playing ? "#0a0800" : "#d4a84b",
        fontSize: playing ? 14 : 16,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.3s",
        flexShrink: 0,
        boxShadow: playing ? "0 0 18px rgba(200,160,80,0.6), 0 0 36px rgba(200,160,80,0.3)" : "none",
        animation: playing ? "ambientGlow 3s ease-in-out infinite" : "none",
      }}>
        {playing ? "❚❚" : "▶"}
      </button>
      <style>{`.ambient-glow { animation: ambientGlow 3s ease-in-out infinite; } @keyframes ambientGlow { 0%,100% { box-shadow: 0 0 14px rgba(200,160,80,0.5); } 50% { box-shadow: 0 0 28px rgba(200,160,80,0.9); } }`}</style>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [adminNotice, setAdminNotice] = useState("");
  const [subscription, setSubscription] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profil, setProfil] = useState(null);
  const [showProfil, setShowProfil] = useState(false);
  const [memory, setMemory] = useState("");
  const [sendingEmail, setSendingEmail] = useState(null);
  const [meditations, setMeditations] = useState([]);
  const [emailNotice, setEmailNotice] = useState("");
  const [fontSize, setFontSize] = useState(15);
  const [typedPlaceholder, setTypedPlaceholder] = useState("");
  const { theme, toggleTheme, isDay } = useTheme();
  const T = THEMES[theme];

  useEffect(() => {
    document.documentElement.style.fontSize = fontSize + "px";
  }, [fontSize]);

  // ─── Typewriter placeholder ───────────────────────────────────────────────
  useEffect(() => {
    const PHRASES = [
      "Comme je traverse une phase difficile, y a-t-il un sens à cette épreuve ?",
      "Je me sens en besoin d'améliorer ma vie. Comment agir en ce sens ?",
      "Mon couple a changé, comment vivre cette transition ?",
      "Comment trouver la paix intérieure quand tout s'accélère autour de moi ?",
      "Je ressens un vide existentiel, par où commencer ?",
      "Comment distinguer l'intuition de la peur ?",
    ];

    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout;

    const type = () => {
      const current = PHRASES[phraseIndex];

      if (!isDeleting) {
        setTypedPlaceholder(current.slice(0, charIndex + 1));
        charIndex++;
        if (charIndex === current.length) {
          // Pause en fin de phrase avant d'effacer
          timeout = setTimeout(() => { isDeleting = true; type(); }, 2800);
          return;
        }
        timeout = setTimeout(type, 45);
      } else {
        setTypedPlaceholder(current.slice(0, charIndex - 1));
        charIndex--;
        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % PHRASES.length;
          timeout = setTimeout(type, 500);
          return;
        }
        timeout = setTimeout(type, 18);
      }
    };

    timeout = setTimeout(type, 1200);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--nova-bg", T.bg);
    root.style.setProperty("--nova-text", T.textPrimary);
    root.style.setProperty("--nova-gold", T.gold);
    root.style.setProperty("--nova-input-bg", T.bgInput);
    root.style.setProperty("--nova-scroll", T.scrollThumb);
  }, [theme]);

  const messagesEndRef = useRef(null);
  const conversationHistory = useRef([]);
  const playerRef = useRef(null);

  useEffect(() => {
    // Accès admin direct depuis le dashboard
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin_access") === "NOVA_GENIE-44!/") {
      window.history.replaceState({}, "", "/");
      setUser({ id: "admin-preview", email: "admin@nova.local", isAdminPreview: true });
      setSubscription({ plan: "premium", messages_today: 0 });
      setProfil({ prenom: "Admin", chemin_spirituel: [], experiences: [], niveau: "", intention: "", completed: true });
      setShowProfil(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
  }, []);

  useEffect(() => {
    if (user) { loadConversations(); loadMeditations(); loadSubscription(); loadProfil(); loadMemory(); }
  }, [user]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
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

  const loadMemory = async () => {
    if (user?.isAdminPreview) return;
    try {
      const res = await fetch(`${API}/api/memory/${user.id}`);
      const data = await res.json();
      setMemory(data.summary || "");
    } catch {}
  };

  const loadProfil = async () => {
    if (user?.isAdminPreview) return; // Accès admin direct, pas de profil requis
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!data || !data.completed) {
      setShowProfil(true);
    } else {
      setProfil(data);
      setShowProfil(false);
    }
  };

  const getSystemPrompt = () => {
    if (!profil || !profil.completed) return BASE_SYSTEM_PROMPT;
    const parts = [];
    if (profil.prenom) parts.push(`- Prénom : ${profil.prenom}`);
    if (profil.chemin_spirituel?.length) parts.push(`- Chemin spirituel : ${profil.chemin_spirituel.join(", ")}`);
    if (profil.experiences?.length) parts.push(`- Expériences vécues : ${profil.experiences.join(", ")}`);
    if (profil.niveau) parts.push(`- Niveau : ${profil.niveau}`);
    if (profil.intention) parts.push(`- Intention : ${profil.intention}`);
    let prompt = BASE_SYSTEM_PROMPT + "\n\n## Profil de l'utilisateur :\n" + parts.join("\n") + "\n\nTu t'adresses à cette personne par son prénom dès que c'est naturel. Tu adaptes tes références spirituelles à son chemin et ses expériences. Tu tiens compte de son intention principale dans chaque réponse.";
    if (memory) prompt += "\n\n## Ce que tu sais de cet utilisateur (mémoire des conversations passées) :\n" + memory;
    return prompt;
  };

  const loadConversations = async () => {
    const { data } = await supabase.from("conversations").select("*")
      .not("title", "ilike", "🧘%")
      .order("updated_at", { ascending: false });
    setConversations(data || []);
  };

  const loadMeditations = async () => {
    const { data } = await supabase.from("conversations")
      .select("*")
      .ilike("title", "🧘%")
      .order("updated_at", { ascending: false });
    setMeditations(data || []);
  };

  const loadSubscription = async () => {
    let { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).single();
    if (!data) {
      const { data: newSub } = await supabase.from("subscriptions").insert({ user_id: user.id }).select().single();
      data = newSub;
    }
    if (data && data.last_reset !== new Date().toISOString().split("T")[0]) {
      const { data: updated } = await supabase.from("subscriptions")
        .update({ messages_today: 0, last_reset: new Date().toISOString().split("T")[0] })
        .eq("user_id", user.id).select().single();
      data = updated;
    }
    setSubscription(data);
  };

  const loadConversation = async (convId) => {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at", { ascending: true });
    const msgs = data || [];
    setMessages(msgs);
    conversationHistory.current = msgs.map(m => ({ role: m.role, content: m.content }));
    setCurrentConvId(convId);
    setStarted(true);
    setSidebarOpen(false);
    setEmailNotice("");
  };

  const createNewConversation = async (firstMessage) => {
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");
    const { data } = await supabase.from("conversations").insert({ user_id: user.id, title }).select().single();
    setCurrentConvId(data.id);
    loadConversations();
    return data.id;
  };

  const saveMessage = async (convId, role, content) => {
    await supabase.from("messages").insert({ conversation_id: convId, role, content });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  };

  const handleSendSummaryEmail = async (e, convId) => {
    e.stopPropagation();
    setSendingEmail(convId);
    setEmailNotice("");
    try {
      const res = await fetch(`${API}/api/send-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId, user_email: user.email }),
      });
      const data = await res.json();
      setEmailNotice(data.success ? "✦ L'essence de cette conversation vous a été envoyée par email." : "✦ Erreur lors de l'envoi. Réessayez.");
    } catch {
      setEmailNotice("✦ Erreur de connexion.");
    }
    setSendingEmail(null);
  };

  const deleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!confirm("Supprimer cette conversation ?\nCette action est irréversible.")) return;
    await supabase.from("messages").delete().eq("conversation_id", convId);
    await supabase.from("conversations").delete().eq("id", convId);
    if (currentConvId === convId) handleHome();
    loadConversations();
  };

  const handleAuth = async () => {
    setAuthError(""); setAuthLoading(true);
    if (resetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, { redirectTo: "https://nova.coeurandco.com" });
      if (error) setAuthError(error.message);
      else setResetSent(true);
      setAuthLoading(false);
      return;
    }
    if (authMode === "register") {
      const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
      if (error) setAuthError(error.message);
      else setAuthError("✦ Vérifiez votre email pour confirmer votre inscription.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
      if (error) setAuthError("Email ou mot de passe incorrect.");
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessages([]); setStarted(false); setCurrentConvId(null);
    conversationHistory.current = [];
  };

  const handleHome = () => {
    setStarted(false); setMessages([]); setStreamText("");
    setInput(""); setAdminNotice(""); setCurrentConvId(null);
    setEmailNotice("");
    conversationHistory.current = [];
  };

  const canSendMessage = () => {
    if (!subscription) return false;
    if (subscription.plan === "premium") return true;
    return subscription.messages_today < FREE_LIMIT;
  };

  const incrementMessageCount = async () => {
    if (subscription?.plan === "free") {
      const newCount = (subscription.messages_today || 0) + 1;
      await supabase.from("subscriptions").update({ messages_today: newCount }).eq("user_id", user.id);
      setSubscription(prev => ({ ...prev, messages_today: newCount }));
    }
  };

  const sendMessage = async (text) => {
    const userMessage = text || input.trim();
    if (!userMessage || loading) return;
    setInput(""); setAdminNotice(""); setEmailNotice("");

    const adminMatch = userMessage.match(/^fantomas a dit\s*:\s*(.+)/i);
    if (adminMatch) {
      const cmd = adminMatch[1].trim();
      if (cmd.toLowerCase() === "liste les directives") {
        const res = await fetch(`${API}/api/directives`);
        const data = await res.json();
        setAdminNotice(data.directives ? "✦ Directives actives :\n" + data.directives : "✦ Aucune directive.");
        return;
      }
      if (cmd.toLowerCase() === "efface les directives") {
        await fetch(`${API}/api/directives`, { method: "DELETE" });
        setAdminNotice("✦ Directives effacées."); return;
      }
      if (cmd.toLowerCase().startsWith("efface la directive :")) {
        const toRemove = cmd.replace(/efface la directive\s*:\s*/i, "").trim();
        await fetch(`${API}/api/directives/remove`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ directive: toRemove }) });
        setAdminNotice("✦ Directive supprimée : « " + toRemove + " »"); return;
      }
      const res = await fetch(`${API}/api/directives/add`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ directive: cmd }) });
      const data = await res.json();
      setAdminNotice(data.success ? "✦ Directive enregistrée : « " + cmd + " »" : "✦ Erreur."); return;
    }

    if (!canSendMessage()) {
      setAdminNotice(`✦ Limite de ${FREE_LIMIT} messages atteinte aujourd'hui. Passez en Premium pour continuer.`);
      return;
    }

    let convId = currentConvId;
    if (!convId) convId = await createNewConversation(userMessage);

    setStarted(true);
    conversationHistory.current = [...conversationHistory.current, { role: "user", content: userMessage }];
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true); setStreamText("");

    await saveMessage(convId, "user", userMessage);
    await incrementMessageCount();

    try {
      const response = await fetch(`${API}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: getSystemPrompt(), messages: conversationHistory.current }),
      });
      const data = await response.json();
      const assistantText = data.content?.map((b) => b.text || "").join("") || "Je suis là avec toi.";
      conversationHistory.current = [...conversationHistory.current, { role: "assistant", content: assistantText }];
      await saveMessage(convId, "assistant", assistantText);
      loadConversations();
      // Mise à jour mémoire en arrière-plan
      fetch(`${API}/api/memory/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, messages: conversationHistory.current })
      }).then(r => r.json()).then(d => { if (d.summary) setMemory(d.summary); }).catch(() => {});

      let i = 0;
      const interval = setInterval(() => {
        if (i <= assistantText.length) { setStreamText(assistantText.slice(0, i)); i += 3; }
        else { clearInterval(interval); setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]); setStreamText(""); setLoading(false); }
      }, 15);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "La connexion s'est interrompue. Respire, et réessaie." }]);
      setStreamText(""); setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ─── ÉCRAN AUTH ──────────────────────────────────────────────────────────────
  if (!user) return (
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.videoBg}><div id="ytplayer" style={styles.videoIframe} /></div>
      <div style={styles.videoOverlay} />
      <div style={styles.particleContainer}>
        {PARTICLES.map((p) => <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}
      </div>
      <div style={styles.authBox}>
        <div style={styles.logoWrap}><div style={styles.logoRing} className="ring-pulse" /><div style={styles.logoInner}><span style={styles.logoSymbol}>☽✦☾</span></div></div>
        <h1 style={styles.title}>NOVA</h1>
        <p style={styles.subtitle}>Agent d'Éveil & de Réalisation de Soi</p>
        {resetMode ? (
          <>
            <p style={styles.resetInfo}>Entrez votre email pour recevoir un lien de réinitialisation.</p>
            {resetSent ? (
              <p style={styles.authError}>✦ Email envoyé ! Vérifiez votre boîte mail.</p>
            ) : (
              <>
                <input style={styles.authInput} type="email" placeholder="Votre email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} />
                {authError && <p style={styles.authError}>{authError}</p>}
                <button style={styles.authBtn} className="auth-btn" onClick={handleAuth} disabled={authLoading}>{authLoading ? "..." : "Envoyer le lien"}</button>
              </>
            )}
            <button style={styles.forgotBtn} onClick={() => { setResetMode(false); setResetSent(false); setAuthError(""); }}>← Retour à la connexion</button>
          </>
        ) : (
          <>
            <div style={styles.authTabs}>
              <button style={{ ...styles.authTab, ...(authMode === "login" ? styles.authTabActive : {}) }} onClick={() => { setAuthMode("login"); setAuthError(""); }}>Connexion</button>
              <button style={{ ...styles.authTab, ...(authMode === "register" ? styles.authTabActive : {}) }} onClick={() => { setAuthMode("register"); setAuthError(""); }}>Inscription</button>
            </div>
            <input style={styles.authInput} type="email" placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} />
            <input style={styles.authInput} type="password" placeholder="Mot de passe" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAuth()} />
            {authError && <p style={styles.authError}>{authError}</p>}
            <button style={styles.authBtn} className="auth-btn" onClick={handleAuth} disabled={authLoading}>{authLoading ? "..." : authMode === "login" ? "Se connecter" : "Créer mon compte"}</button>
            {authMode === "login" && (
              <button style={styles.forgotBtn} onClick={() => { setResetMode(true); setAuthError(""); }}>Mot de passe oublié ?</button>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ─── PROFIL ──────────────────────────────────────────────────────────────────
  if (showProfil) return (
    <Profil user={user} onComplete={(data) => { setProfil({ ...data, completed: true }); setShowProfil(false); }} />
  );

  // ─── APP PRINCIPALE ──────────────────────────────────────────────────────────
  return (
    <div style={{ ...styles.root, background: T.bgRoot, color: T.textPrimary }}>
      <style>{css}</style>
      <div style={{ ...styles.videoBg, display: isDay ? "none" : "block" }}><div id="ytplayer" style={styles.videoIframe} /></div>
      <div style={{ ...styles.videoOverlay, background: isDay ? "rgba(245,240,232,0.55)" : "rgba(0,0,0,0.75)" }} />
      <div style={styles.particleContainer}>
        {PARTICLES.map((p) => <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}
      </div>

      {/* Sidebar */}
      <div style={{ ...styles.sidebar, background: T.bgSidebar, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={styles.sidebarHeader}>
          <span style={{ ...styles.sidebarTitle, color: T.gold }}>Conversations</span>
          <button style={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <button className="new-conv-btn" onClick={() => { handleHome(); setSidebarOpen(false); }} style={{ margin: "0 16px 8px", background: "linear-gradient(135deg, #b8860b, #d4a84b)", border: "1px solid #d4a84b", borderRadius: 20, padding: "10px 16px", color: "#0a0800", fontFamily: "inherit", fontSize: "0.812rem", cursor: "pointer", transition: "all 0.3s", letterSpacing: 0.5, fontWeight: 700 }}>+ Nouvelle conversation</button>
        <a href="/meditation" style={{ display: "block", margin: "0 16px 12px", background: "linear-gradient(135deg, #4a2d7a, #7b4fa0)", border: "1px solid rgba(139,90,200,0.6)", borderRadius: 20, padding: "10px 16px", color: "#fff", fontFamily: "inherit", fontSize: "0.812rem", cursor: "pointer", transition: "all 0.3s", letterSpacing: 0.5, textDecoration: "none", textAlign: "center", boxShadow: "0 0 12px rgba(139,90,200,0.3)" }} className="meditation-side-btn" onClick={() => setSidebarOpen(false)}>🧘 Méditation guidée</a>
        {emailNotice && <div style={styles.emailNotice}>{emailNotice}</div>}
        <div style={styles.convList}>
          {conversations.map(c => (
            <div key={c.id} style={{ ...styles.convItem, ...(c.id === currentConvId ? styles.convItemActive : {}) }} className="conv-item" onClick={() => loadConversation(c.id)}>
              <div style={styles.convInfo}>
                <span style={{ ...styles.convTitle, color: isDay ? "#1a1208" : "#e8d8b8" }}>{c.title}</span>
                <span style={styles.convDate}>{new Date(c.updated_at).toLocaleDateString("fr-FR")}</span>
              </div>
              <div style={styles.convActions}>
                <div style={{ position: "relative", flexShrink: 0 }} className="email-tooltip-wrap">
                  <button style={{ ...styles.emailBtn, opacity: sendingEmail === c.id ? 0.5 : 1 }} className="email-btn" onClick={(e) => handleSendSummaryEmail(e, c.id)} disabled={sendingEmail === c.id}>
                    {sendingEmail === c.id ? "…" : "✉"}
                  </button>
                  <div className="email-tooltip">
                    <span style={{ color: "#d4a84b", fontWeight: 700 }}>✦ Reçois l'essence par email</span>
                    <br />
                    NOVA t'envoie un résumé de cette conversation — les insights clés et ce qui a émergé, sans avoir à tout relire.
                  </div>
                </div>
                <button style={styles.deleteBtn} className="delete-btn" onClick={(e) => deleteConversation(e, c.id)} title="Supprimer cette conversation">✕</button>
              </div>
            </div>
          ))}
        </div>
        {/* Section Méditations */}
        {meditations.length > 0 && (
          <div style={styles.meditationsSection}>
            <p style={styles.meditationsSectionTitle}>🧘 Méditations</p>
            {meditations.map(m => (
              <div key={m.id} style={styles.meditationItemWrap}>
                <a href={`/meditation?id=${m.id}`} style={styles.meditationItem} className="meditation-item">
                  <div style={styles.convInfo}>
                    <span style={{ ...styles.convTitle, color: isDay ? "#1a1208" : "#e8d8b8" }}>{m.title.replace("🧘 ", "")}</span>
                    <span style={styles.convDate}>{new Date(m.updated_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </a>
                <button style={styles.deleteBtn} className="delete-btn" onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm("Supprimer cette méditation ?\nCette action est irréversible.")) return;
                  await supabase.from("messages").delete().eq("conversation_id", m.id);
                  await supabase.from("conversations").delete().eq("id", m.id);
                  loadMeditations();
                }} title="Supprimer">✕</button>
              </div>
            ))}
          </div>
        )}

        <div style={styles.sidebarFooter}>
          {/* Thème jour / nuit */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 12, color: T.textSecond, letterSpacing: 0.5 }}>Thème</span>
              <span style={{ fontSize: 10, color: T.textMuted, letterSpacing: 0.3 }}>{isDay ? "Mode jour activé" : "Mode nuit activé"}</span>
            </div>
            <button onClick={toggleTheme} style={{ background: isDay ? "linear-gradient(135deg, #f5d06a, #e8a020)" : "linear-gradient(135deg, #1a1030, #2d1f5e)", border: `1.5px solid ${T.goldBorder}`, borderRadius: 30, padding: "8px 16px", color: isDay ? "#5a3800" : "#d4a84b", fontFamily: "inherit", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "all 0.4s", boxShadow: isDay ? "0 0 14px rgba(240,180,0,0.4)" : "0 0 14px rgba(100,80,200,0.4)" }}>
              {isDay ? "☀️" : "🌙"}
              <span style={{ fontSize: 11, letterSpacing: 1, fontWeight: 600 }}>{isDay ? "JOUR" : "NUIT"}</span>
            </button>
          </div>

          <span style={{ ...styles.planBadge, color: T.gold }}>{subscription?.plan === "premium" ? "✦ Premium" : `Gratuit · ${FREE_LIMIT - (subscription?.messages_today || 0)} msg restants`}</span>

          {/* Taille du texte */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#a09080", letterSpacing: 0.5 }}>Taille du texte</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button style={{ background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 20, padding: "4px 12px", color: "#d4a84b", fontFamily: "inherit", fontSize: 14, cursor: "pointer" }} onClick={() => setFontSize(f => Math.max(12, f - 1))}>A−</button>
              <span style={{ fontSize: 12, color: "#d4a84b", minWidth: 20, textAlign: "center" }}>{fontSize}</span>
              <button style={{ background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 20, padding: "4px 12px", color: "#d4a84b", fontFamily: "inherit", fontSize: 14, cursor: "pointer" }} onClick={() => setFontSize(f => Math.min(22, f + 1))}>A+</button>
            </div>
          </div>

          {/* Nappe sonore */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 12, color: "#a09080", letterSpacing: 0.5 }}>Nappe sonore binaurale</span>
              <span style={{ fontSize: 10, color: "#504540", letterSpacing: 0.3 }}>Son de fond pour la méditation</span>
            </div>
            <AmbientInline />
          </div>

          <button style={styles.logoutBtn} onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      {sidebarOpen && <div style={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      {/* Boutons fixes */}
      <button style={{ ...styles.menuBtn, background: isDay ? "rgba(255,252,245,0.92)" : "rgba(0,0,0,0)", border: `1.5px solid #d4a84b`, color: "#d4a84b", boxShadow: isDay ? "0 2px 12px rgba(200,160,80,0.2)" : "none", backdropFilter: isDay ? "blur(10px)" : "none" }} className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
      
      {started && <button style={styles.homeBtnFixed} className="home-btn" onClick={handleHome}>↩ Accueil</button>}

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logoWrap}>
            <div style={{ ...styles.logoRing, border: "1px solid rgba(200,160,80,0.6)" }} className="ring-pulse" />
            <div style={{ ...styles.logoInner, background: "radial-gradient(circle, rgba(139,90,200,0.5) 0%, rgba(100,50,180,0.3) 100%)", border: "1px solid rgba(139,90,200,0.5)" }}>
              <span style={{ ...styles.logoSymbol, color: T.textTitle }}>☽✦☾</span>
            </div>
          </div>
          {!started && (<><h1 style={{ ...styles.title, color: T.textTitle }}>NOVA</h1><p style={{ ...styles.subtitle, color: T.textSecond }}>Agent d'Éveil & de Réalisation de Soi</p>
            {profil?.prenom && <p style={{ ...styles.greeting, color: T.textTitle }}>Bienvenue, {profil.prenom} ✦</p>}<p style={{ ...styles.desc, color: T.textPrimary }}>Aux frontières de la conscience, les mystiques, les expérienceurs d'EMI, les guides spirituels nous ont rapporté l'essentiel. NOVA vous aide à l'appliquer à ce que vous vivez aujourd'hui, ici et maintenant.</p></>)}
          {started && <h2 style={{ ...styles.titleSmall, color: T.textTitle }}>NOVA</h2>}
        </div>

        {adminNotice && <div style={styles.adminNotice}>{adminNotice}</div>}

        {!started && (
          <div style={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} style={s.highlight
                ? styles.suggestionHighlight
                : { ...styles.suggestion, background: isDay ? "rgba(255,252,245,0.9)" : "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.6)", color: isDay ? "#2a1f0a" : "#e8d8b8" }
              } className={s.highlight ? "suggestion-highlight" : "suggestion-btn"} onClick={() => sendMessage(s.text)}>
                {s.text}
              </button>
            ))}
          </div>
        )}

        {started && (
          <div style={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === "user" ? styles.userBubble : styles.aiBubble} className="msg-fade-in">
                {m.role === "assistant" && <div style={{ ...styles.aiLabel, color: T.textTitle }}>✦ Nova</div>}
                <div style={m.role === "user" ? { ...styles.userText, background: T.bgUserMsg } : { ...styles.aiText, background: T.bgMsg, color: T.textPrimary }}>
                  {m.content.split("\n").map((line, j) => (
                    <span key={j}>{line.replace(/\*\*(.*?)\*\*/g, "$1")}{j < m.content.split("\n").length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div style={styles.aiBubble} className="msg-fade-in">
                <div style={{ ...styles.aiLabel, color: T.textTitle }}>✦ Nova</div>
                <div style={{ ...styles.aiText, background: T.bgMsg, color: T.textPrimary }}>
                  {streamText ? <>{streamText.split("\n").map((line, j) => (<span key={j}>{line}{j < streamText.split("\n").length - 1 && <br />}</span>))}<span className="cursor-blink">|</span></> : <div style={styles.dots}><span className="dot" /><span className="dot" style={{ animationDelay: "0.2s" }} /><span className="dot" style={{ animationDelay: "0.4s" }} /></div>}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div style={styles.inputArea}>
          <div style={{ ...styles.inputWrap, background: isDay ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.1)", border: `1px solid ${isDay ? "rgba(90,62,8,0.35)" : "rgba(200,160,80,0.35)"}` }} className="input-glow">
            <textarea style={{ ...styles.textarea, color: isDay ? "#1a1208" : "#ffffff" }} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder={typedPlaceholder} rows={2} disabled={loading} />
            <button style={{ ...styles.sendBtn, opacity: input.trim() && !loading ? 1 : 0.35 }} className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>✦</button>
            <a href="/vocal" style={{ ...styles.vocalBtn, background: isDay ? "rgba(90,62,8,0.12)" : "rgba(200,160,80,0.08)", border: `1px solid ${isDay ? "rgba(90,62,8,0.4)" : "rgba(200,160,80,0.2)"}` }} className="vocal-btn" title="Mode vocal NOVA">🎤</a>
          </div>
          <p style={styles.hint}>✦ Entrée pour envoyer · Shift+Entrée pour nouvelle ligne</p>
        </div>
      </div>
      <InstallBanner />
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", color: "#f0e8d8", overflow: "hidden", position: "relative" },
  videoBg: { position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" },
  videoIframe: { position: "absolute", top: "50%", left: "50%", transform: "translateX(-50%) translateY(-50%)", width: "100vw", height: "56.25vw", minHeight: "100vh", minWidth: "177.77vh", border: "none" },
  videoOverlay: { position: "fixed", inset: 0, zIndex: 1, background: "rgba(0,0,0,0.75)", pointerEvents: "none" },
  particleContainer: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 2 },
  authBox: { position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 24, padding: "48px 40px", maxWidth: 400, width: "90%" },
  authTabs: { display: "flex", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 30, padding: 4, width: "100%" },
  authTab: { flex: 1, padding: "8px 0", border: "none", borderRadius: 26, background: "transparent", color: "#a09080", cursor: "pointer", fontFamily: "inherit", fontSize: "0.812rem", letterSpacing: 1, transition: "all 0.3s" },
  authTabActive: { background: "rgba(200,160,80,0.2)", color: "#d4a84b", border: "1px solid rgba(200,160,80,0.3)" },
  authInput: { width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: 12, padding: "12px 16px", color: "#f0e8d8", fontFamily: "inherit", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" },
  authError: { color: "#d4a84b", fontSize: "0.812rem", textAlign: "center", margin: 0 },
  authBtn: { width: "100%", background: "radial-gradient(circle, rgba(200,160,80,0.3) 0%, rgba(139,90,200,0.2) 100%)", border: "1px solid rgba(200,160,80,0.4)", borderRadius: 30, padding: "12px 0", color: "#d4a84b", fontFamily: "inherit", fontSize: "0.875rem", letterSpacing: 2, cursor: "pointer", transition: "all 0.3s" },
  forgotBtn: { background: "none", border: "none", color: "#706050", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5, textDecoration: "underline", padding: 0, transition: "color 0.2s" },
  resetInfo: { fontSize: "0.812rem", color: "#a09080", textAlign: "center", lineHeight: 1.6, margin: 0 },
  sidebar: { position: "fixed", top: 0, left: 0, width: 300, height: "100vh", background: "rgba(5,5,10,0.97)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(200,160,80,0.15)", zIndex: 200, display: "flex", flexDirection: "column", transition: "transform 0.3s ease" },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 20px 16px" },
  sidebarTitle: { fontFamily: "'Cinzel', serif", fontSize: "0.875rem", letterSpacing: 4, color: "#d4a84b" },
  sidebarClose: { background: "none", border: "none", color: "#a09080", cursor: "pointer", fontSize: "1.0rem" },
  newConvBtn: { margin: "0 16px 8px", background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 20, padding: "10px 16px", color: "#d4a84b", fontFamily: "inherit", fontSize: "0.812rem", cursor: "pointer", transition: "all 0.3s", letterSpacing: 0.5 },
  meditationSideBtn: { display: "block", margin: "0 16px 12px", background: "rgba(139,90,200,0.1)", border: "1px solid rgba(139,90,200,0.3)", borderRadius: 20, padding: "10px 16px", color: "#c8a8f0", fontFamily: "inherit", fontSize: "0.812rem", cursor: "pointer", transition: "all 0.3s", letterSpacing: 0.5, textDecoration: "none", textAlign: "center" },
  emailNotice: { margin: "0 16px 12px", background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 10, padding: "10px 14px", color: "#d4a84b", fontSize: "0.75rem", letterSpacing: 0.5 },
  convList: { flex: 1, overflowY: "auto", padding: "0 8px" },
  convItem: { background: "transparent", border: "1px solid transparent", borderRadius: 12, padding: "10px 12px", color: "#c8bcac", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.2s", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  convItemActive: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.2)" },
  convInfo: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  convTitle: { fontSize: "0.812rem", lineHeight: 1.4, color: "#e8d8b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  convDate: { fontSize: "0.688rem", color: "#706050" },
  convActions: { display: "flex", gap: 4, flexShrink: 0 },
  emailBtn: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#d4a84b", fontSize: "0.812rem", flexShrink: 0, transition: "all 0.2s" },
  deleteBtn: { background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#c06060", fontSize: "0.688rem", flexShrink: 0, transition: "all 0.2s" },
  meditationsSection: { borderTop: "1px solid rgba(139,90,200,0.2)", padding: "12px 8px 0" },
  meditationsSectionTitle: { fontSize: "0.688rem", letterSpacing: 2, color: "#9070c0", textTransform: "uppercase", padding: "0 8px", marginBottom: 8 },
  meditationItemWrap: { display: "flex", alignItems: "center", gap: 4 },
  meditationItem: { display: "block", flex: 1, background: "transparent", border: "1px solid transparent", borderRadius: 12, padding: "10px 12px", color: "#c8bcac", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.2s", marginBottom: 4, textDecoration: "none" },
  sidebarFooter: { padding: "16px 20px", borderTop: "1px solid rgba(200,160,80,0.1)", display: "flex", flexDirection: "column", gap: 10 },
  planBadge: { fontSize: "0.75rem", color: "#d4a84b", letterSpacing: 0.5 },
  logoutBtn: { background: "none", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 20, padding: "8px 16px", color: "#a09080", fontFamily: "inherit", fontSize: "0.75rem", cursor: "pointer", transition: "all 0.3s" },
  sidebarOverlay: { position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.4)" },
  menuBtn: { position: "fixed", top: "max(70px, env(safe-area-inset-top, 0px) + 54px)", left: 16, zIndex: 100, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(200,160,80,0.45)", borderRadius: 30, padding: "9px 15px", color: "#d4a84b", fontSize: 18, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" },
  vocalBtn: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.125rem", textDecoration: "none", flexShrink: 0, transition: "all 0.3s ease" },
  homeBtnFixed: { position: "fixed", top: 64, right: 20, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 30, padding: "8px 18px", color: "#d4a84b", fontSize: "0.75rem", cursor: "pointer", fontFamily: "'Palatino Linotype', serif", letterSpacing: 1, transition: "all 0.3s" },
  container: { position: "relative", zIndex: 3, width: "100%", maxWidth: 720, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px 24px", boxSizing: "border-box" },
  header: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 32 },
  logoWrap: { position: "relative", width: 80, height: 80, marginBottom: 20 },
  logoRing: { position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(200,160,80,0.6)" },
  logoInner: { position: "absolute", inset: 8, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,90,200,0.3) 0%, rgba(200,160,80,0.15) 100%)", border: "1px solid rgba(200,160,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoSymbol: { fontSize: "1.0rem", color: "#d4a84b", letterSpacing: 2 },
  title: { fontFamily: "'Cinzel', serif", fontSize: "3.0rem", fontWeight: 400, letterSpacing: 16, color: "#d4a84b", margin: "0 0 8px", textShadow: "0 0 40px rgba(200,160,80,0.6)" },
  titleSmall: { fontFamily: "'Cinzel', serif", fontSize: "1.125rem", fontWeight: 400, letterSpacing: 10, color: "#d4a84b" },
  subtitle: { fontSize: "0.812rem", letterSpacing: 4, color: "#b0a090", margin: "0 0 20px", textTransform: "uppercase" },
  desc: { fontSize: "0.938rem", lineHeight: 1.8, color: "#c8bcac", maxWidth: 500, margin: 0 },
  greeting: { fontSize: "0.875rem", color: "#d4a84b", letterSpacing: 2, marginTop: -8 },
  meditationBtn: { display: "inline-block", marginTop: 16, background: "rgba(139,90,200,0.15)", border: "1px solid rgba(139,90,200,0.4)", borderRadius: 30, padding: "11px 28px", color: "#c8a8f0", fontFamily: "inherit", fontSize: "0.812rem", letterSpacing: 1, textDecoration: "none", transition: "all 0.3s", cursor: "pointer" },
  adminNotice: { background: "rgba(200,160,80,0.12)", border: "1px solid rgba(200,160,80,0.4)", borderRadius: 12, padding: "12px 20px", color: "#d4a84b", fontSize: "0.812rem", marginBottom: 16, letterSpacing: 0.5, whiteSpace: "pre-line", maxWidth: 640, width: "100%" },
  suggestions: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 32, maxWidth: 640 },
  suggestion: { background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 24, padding: "10px 18px", color: "#e8d8b8", fontSize: "0.812rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s ease", letterSpacing: 0.5 },
  suggestionHighlight: { background: "linear-gradient(135deg, #e8c060 0%, #f0d080 50%, #d4a84b 100%)", border: "1px solid #f0d080", borderRadius: 24, padding: "10px 22px", color: "#3a2800", fontSize: "0.812rem", cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s ease", letterSpacing: 0.5, fontWeight: "700", boxShadow: "0 0 28px rgba(240,208,128,0.7)" },
  messages: { flex: 1, width: "100%", overflowY: "auto", paddingBottom: 20, display: "flex", flexDirection: "column", gap: 20 },
  userBubble: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  aiBubble: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  aiLabel: { fontSize: "0.688rem", letterSpacing: 3, color: "#d4a84b", marginBottom: 6, textTransform: "uppercase" },
  userText: { background: "rgba(139,90,200,0.25)", border: "1px solid rgba(139,90,200,0.4)", borderRadius: "20px 20px 4px 20px", padding: "14px 18px", fontSize: "0.938rem", lineHeight: 1.7, maxWidth: "80%", color: "#f0e8d8" },
  aiText: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: "4px 20px 20px 20px", padding: "16px 20px", fontSize: "0.938rem", lineHeight: 1.9, maxWidth: "90%", color: "#ede0cc" },
  dots: { display: "flex", gap: 6, alignItems: "center", height: 20 },
  inputArea: { width: "100%", paddingTop: 20 },
  inputWrap: { display: "flex", alignItems: "flex-end", gap: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 16, padding: "12px 16px" },
  textarea: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#ffffff", fontFamily: "inherit", fontSize: "0.938rem", lineHeight: 1.7, resize: "none", padding: 0 },
  sendBtn: { background: "linear-gradient(135deg, #b8860b 0%, #d4a84b 50%, #a0720a 100%)", border: "2px solid #e8c060", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", color: "#0a0800", fontSize: "1.25rem", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", flexShrink: 0, boxShadow: "0 0 20px rgba(200,160,80,0.8), 0 0 40px rgba(200,160,80,0.4)" },
  hint: { textAlign: "center", fontSize: "0.688rem", color: "#c8bcac", marginTop: 8, letterSpacing: 1 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; }
  .particle { position: absolute; background: radial-gradient(circle, rgba(200,160,80,0.6) 0%, transparent 70%); border-radius: 50%; animation: float linear infinite; }
  @keyframes float { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.5; } 100% { transform: translateY(-100px) translateX(30px); opacity: 0; } }
  .ring-pulse { animation: ringPulse 3s ease-in-out infinite; }
  @keyframes ringPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 20px 4px rgba(200,160,80,0.3); } }
  .suggestion-btn:hover { background: rgba(139,90,200,0.85) !important; border-color: #d4a84b !important; color: #fff !important; transform: translateY(-2px); }
  .suggestion-highlight:hover { background: rgba(139,90,200,0.85) !important; border-color: #d4a84b !important; color: #fff !important; transform: translateY(-2px); box-shadow: 0 0 32px rgba(139,90,200,0.6) !important; }
  .menu-btn:hover { background: rgba(139,90,200,0.85) !important; border-color: #d4a84b !important; color: #fff !important; transform: scale(1.05); }
  .vocal-btn:hover { box-shadow: 0 0 28px rgba(200,160,80,0.9) !important; transform: scale(1.1); }
  .new-conv-btn:hover { background: linear-gradient(135deg, #7b4fa0, #d4a84b) !important; color: #fff !important; border-color: #d4a84b !important; box-shadow: 0 0 20px rgba(139,90,200,0.5) !important; }
  .meditation-side-btn:hover { background: linear-gradient(135deg, #7b4fa0, #d4a84b) !important; border-color: #d4a84b !important; color: #fff !important; box-shadow: 0 0 20px rgba(139,90,200,0.5) !important; }
  .meditation-item:hover { background: rgba(139,90,200,0.12) !important; border-color: rgba(139,90,200,0.4) !important; }
  .conv-item:hover { background: rgba(200,160,80,0.08) !important; }
  .email-tooltip-wrap { position: relative; }
  .email-tooltip {
    display: none;
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 230px;
    background: rgba(8,4,14,0.96);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(200,160,80,0.4);
    border-radius: 14px;
    padding: 12px 14px;
    font-size: 12px;
    color: #c8bcac;
    line-height: 1.6;
    letter-spacing: 0.3px;
    z-index: 999;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(200,160,80,0.15);
    pointer-events: none;
    animation: tooltipIn 0.2s ease;
  }
  .email-tooltip::after {
    content: "";
    position: absolute;
    bottom: 100%;
    right: 10px;
    border: 6px solid transparent;
    border-bottom-color: rgba(200,160,80,0.4);
  }
  .email-tooltip-wrap:hover .email-tooltip { display: block; }
  @keyframes tooltipIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
  .email-btn:hover { background: rgba(200,160,80,0.25) !important; border-color: rgba(200,160,80,0.5) !important; transform: scale(1.1); }
  .delete-btn:hover { background: rgba(200,60,60,0.25) !important; border-color: rgba(200,60,60,0.5) !important; transform: scale(1.1); }
  .send-btn:hover:not(:disabled) { transform: scale(1.1); box-shadow: 0 0 32px rgba(200,160,80,1), 0 0 64px rgba(200,160,80,0.6) !important; }
  .input-glow:focus-within { border-color: rgba(200,160,80,0.6) !important; box-shadow: 0 0 24px rgba(200,160,80,0.15); }
  [data-theme="day"] input::placeholder, [data-theme="day"] textarea::placeholder { color: rgba(0,0,0,0.3); }
  [data-theme="day"] .particle { background: radial-gradient(circle, rgba(139,90,200,0.2) 0%, transparent 70%) !important; }
  .msg-fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #d4a84b; display: inline-block; animation: dotPulse 1.2s ease-in-out infinite; }
  @keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
  .cursor-blink { animation: blink 0.8s step-end infinite; color: #d4a84b; }
  @keyframes blink { from, to { opacity: 1; } 50% { opacity: 0; } }
  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.55); }
  [data-theme="day"] textarea::placeholder { color: rgba(26,18,8,0.45) !important; }
  input:focus { border-color: rgba(200,160,80,0.5) !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--nova-scroll, rgba(200,160,80,0.4)); border-radius: 2px; }
`;
