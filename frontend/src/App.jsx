import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

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
  const [sendingEmail, setSendingEmail] = useState(null);
  const [emailNotice, setEmailNotice] = useState("");

  const messagesEndRef = useRef(null);
  const conversationHistory = useRef([]);
  const playerRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user || null));
  }, []);

  useEffect(() => {
    if (user) { loadConversations(); loadSubscription(); }
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

  const loadConversations = async () => {
    const { data } = await supabase.from("conversations").select("*").order("updated_at", { ascending: false });
    setConversations(data || []);
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
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: "https://nova.coeurandco.com",
      });
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
        body: JSON.stringify({ system: BASE_SYSTEM_PROMPT, messages: conversationHistory.current }),
      });
      const data = await response.json();
      const assistantText = data.content?.map((b) => b.text || "").join("") || "Je suis là avec toi.";
      conversationHistory.current = [...conversationHistory.current, { role: "assistant", content: assistantText }];
      await saveMessage(convId, "assistant", assistantText);
      loadConversations();

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

  // ─── APP PRINCIPALE ──────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      <style>{css}</style>
      <div style={styles.videoBg}><div id="ytplayer" style={styles.videoIframe} /></div>
      <div style={styles.videoOverlay} />
      <div style={styles.particleContainer}>
        {PARTICLES.map((p) => <div key={p.id} className="particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}
      </div>

      {/* Sidebar */}
      <div style={{ ...styles.sidebar, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarTitle}>Conversations</span>
          <button style={styles.sidebarClose} onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <button style={styles.newConvBtn} className="new-conv-btn" onClick={() => { handleHome(); setSidebarOpen(false); }}>+ Nouvelle conversation</button>
        {emailNotice && <div style={styles.emailNotice}>{emailNotice}</div>}
        <div style={styles.convList}>
          {conversations.map(c => (
            <div key={c.id} style={{ ...styles.convItem, ...(c.id === currentConvId ? styles.convItemActive : {}) }} className="conv-item" onClick={() => loadConversation(c.id)}>
              <div style={styles.convInfo}>
                <span style={styles.convTitle}>{c.title}</span>
                <span style={styles.convDate}>{new Date(c.updated_at).toLocaleDateString("fr-FR")}</span>
              </div>
              <div style={styles.convActions}>
                <button style={{ ...styles.emailBtn, opacity: sendingEmail === c.id ? 0.5 : 1 }} className="email-btn" onClick={(e) => handleSendSummaryEmail(e, c.id)} disabled={sendingEmail === c.id} title="Recevoir l'essence par email">
                  {sendingEmail === c.id ? "…" : "✉"}
                </button>
                <button style={styles.deleteBtn} className="delete-btn" onClick={(e) => deleteConversation(e, c.id)} title="Supprimer cette conversation">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={styles.sidebarFooter}>
          <span style={styles.planBadge}>{subscription?.plan === "premium" ? "✦ Premium" : `Gratuit · ${FREE_LIMIT - (subscription?.messages_today || 0)} msg restants`}</span>
          <button style={styles.logoutBtn} onClick={handleLogout}>Déconnexion</button>
        </div>
      </div>
      {sidebarOpen && <div style={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />}

      <button style={styles.menuBtn} className="menu-btn" onClick={() => setSidebarOpen(true)}>☰</button>
      {started && <button style={styles.homeBtnFixed} className="home-btn" onClick={handleHome}>↩ Accueil</button>}

      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.logoWrap}><div style={styles.logoRing} className="ring-pulse" /><div style={styles.logoInner}><span style={styles.logoSymbol}>☽✦☾</span></div></div>
          {!started && (<><h1 style={styles.title}>NOVA</h1><p style={styles.subtitle}>Agent d'Éveil & de Réalisation de Soi</p><p style={styles.desc}>Explorez les enseignements des EMI, du channeling, des traditions spirituelles et de la sagesse universelle.</p></>)}
          {started && <h2 style={styles.titleSmall}>NOVA</h2>}
        </div>

        {adminNotice && <div style={styles.adminNotice}>{adminNotice}</div>}

        {!started && (
          <div style={styles.suggestions}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} style={s.highlight ? styles.suggestionHighlight : styles.suggestion} className={s.highlight ? "suggestion-highlight" : "suggestion-btn"} onClick={() => sendMessage(s.text)}>
                {s.text}
              </button>
            ))}
          </div>
        )}

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
                  {streamText ? <>{streamText.split("\n").map((line, j) => (<span key={j}>{line}{j < streamText.split("\n").length - 1 && <br />}</span>))}<span className="cursor-blink">|</span></> : <div style={styles.dots}><span className="dot" /><span className="dot" style={{ animationDelay: "0.2s" }} /><span className="dot" style={{ animationDelay: "0.4s" }} /></div>}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div style={styles.inputArea}>
          <div style={styles.inputWrap} className="input-glow">
            <textarea style={styles.textarea} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Posez votre question ou partagez ce qui vous habite..." rows={2} disabled={loading} />
            <button style={{ ...styles.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }} className="send-btn" onClick={() => sendMessage()} disabled={!input.trim() || loading}>✦</button>
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
  authBox: { position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 24, padding: "48px 40px", maxWidth: 400, width: "90%" },
  authTabs: { display: "flex", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 30, padding: 4, width: "100%" },
  authTab: { flex: 1, padding: "8px 0", border: "none", borderRadius: 26, background: "transparent", color: "#a09080", cursor: "pointer", fontFamily: "inherit", fontSize: 13, letterSpacing: 1, transition: "all 0.3s" },
  authTabActive: { background: "rgba(200,160,80,0.2)", color: "#d4a84b", border: "1px solid rgba(200,160,80,0.3)" },
  authInput: { width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: 12, padding: "12px 16px", color: "#f0e8d8", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" },
  authError: { color: "#d4a84b", fontSize: 13, textAlign: "center", margin: 0 },
  authBtn: { width: "100%", background: "radial-gradient(circle, rgba(200,160,80,0.3) 0%, rgba(139,90,200,0.2) 100%)", border: "1px solid rgba(200,160,80,0.4)", borderRadius: 30, padding: "12px 0", color: "#d4a84b", fontFamily: "inherit", fontSize: 14, letterSpacing: 2, cursor: "pointer", transition: "all 0.3s" },
  forgotBtn: { background: "none", border: "none", color: "#706050", fontSize: 12, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5, textDecoration: "underline", padding: 0, transition: "color 0.2s" },
  resetInfo: { fontSize: 13, color: "#a09080", textAlign: "center", lineHeight: 1.6, margin: 0 },
  sidebar: { position: "fixed", top: 0, left: 0, width: 300, height: "100vh", background: "rgba(5,5,10,0.97)", backdropFilter: "blur(20px)", borderRight: "1px solid rgba(200,160,80,0.15)", zIndex: 200, display: "flex", flexDirection: "column", transition: "transform 0.3s ease" },
  sidebarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 20px 16px" },
  sidebarTitle: { fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: 4, color: "#d4a84b" },
  sidebarClose: { background: "none", border: "none", color: "#a09080", cursor: "pointer", fontSize: 16 },
  newConvBtn: { margin: "0 16px 12px", background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 20, padding: "10px 16px", color: "#d4a84b", fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.3s", letterSpacing: 0.5 },
  emailNotice: { margin: "0 16px 12px", background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 10, padding: "10px 14px", color: "#d4a84b", fontSize: 12, letterSpacing: 0.5 },
  convList: { flex: 1, overflowY: "auto", padding: "0 8px" },
  convItem: { background: "transparent", border: "1px solid transparent", borderRadius: 12, padding: "10px 12px", color: "#c8bcac", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.2s", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  convItemActive: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.2)" },
  convInfo: { display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 },
  convTitle: { fontSize: 13, lineHeight: 1.4, color: "#e8d8b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  convDate: { fontSize: 11, color: "#706050" },
  convActions: { display: "flex", gap: 4, flexShrink: 0 },
  emailBtn: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#d4a84b", fontSize: 13, flexShrink: 0, transition: "all 0.2s" },
  deleteBtn: { background: "rgba(200,60,60,0.08)", border: "1px solid rgba(200,60,60,0.2)", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#c06060", fontSize: 11, flexShrink: 0, transition: "all 0.2s" },
  sidebarFooter: { padding: "16px 20px", borderTop: "1px solid rgba(200,160,80,0.1)", display: "flex", flexDirection: "column", gap: 10 },
  planBadge: { fontSize: 12, color: "#d4a84b", letterSpacing: 0.5 },
  logoutBtn: { background: "none", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 20, padding: "8px 16px", color: "#a09080", fontFamily: "inherit", fontSize: 12, cursor: "pointer", transition: "all 0.3s" },
  sidebarOverlay: { position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,0.4)" },
  menuBtn: { position: "fixed", top: 20, left: 20, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 30, padding: "8px 14px", color: "#d4a84b", fontSize: 16, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s" },
  homeBtnFixed: { position: "fixed", top: 20, right: 20, zIndex: 100, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(10px)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 30, padding: "8px 18px", color: "#d4a84b", fontSize: 12, cursor: "pointer", fontFamily: "'Palatino Linotype', serif", letterSpacing: 1, transition: "all 0.3s" },
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
  suggestionHighlight: { background: "linear-gradient(135deg, #b8860b 0%, #c8a050 50%, #a0720a 100%)", border: "1px solid #d4a84b", borderRadius: 24, padding: "10px 22px", color: "#0a0800", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s ease", letterSpacing: 0.5, fontWeight: "700", boxShadow: "0 0 24px rgba(200,160,80,0.6)" },
  messages: { flex: 1, width: "100%", overflowY: "auto", paddingBottom: 20, display: "flex", flexDirection: "column", gap: 20 },
  userBubble: { display: "flex", flexDirection: "column", alignItems: "flex-end" },
  aiBubble: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  aiLabel: { fontSize: 11, letterSpacing: 3, color: "#d4a84b", marginBottom: 6, textTransform: "uppercase" },
  userText: { background: "rgba(139,90,200,0.25)", border: "1px solid rgba(139,90,200,0.4)", borderRadius: "20px 20px 4px 20px", padding: "14px 18px", fontSize: 15, lineHeight: 1.7, maxWidth: "80%", color: "#f0e8d8" },
  aiText: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: "4px 20px 20px 20px", padding: "16px 20px", fontSize: 15, lineHeight: 1.9, maxWidth: "90%", color: "#ede0cc" },
  dots: { display: "flex", gap: 6, alignItems: "center", height: 20 },
  inputArea: { width: "100%", paddingTop: 20 },
  inputWrap: { display: "flex", alignItems: "flex-end", gap: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(200,160,80,0.35)", borderRadius: 16, padding: "12px 16px" },
  textarea: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#ffffff", fontFamily: "inherit", fontSize: 15, lineHeight: 1.7, resize: "none", padding: 0 },
  sendBtn: { background: "radial-gradient(circle, rgba(200,160,80,0.4) 0%, rgba(139,90,200,0.3) 100%)", border: "1px solid rgba(200,160,80,0.5)", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", color: "#d4a84b", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s ease", flexShrink: 0 },
  hint: { textAlign: "center", fontSize: 11, color: "#c8bcac", marginTop: 8, letterSpacing: 1 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; }
  .particle { position: absolute; background: radial-gradient(circle, rgba(200,160,80,0.6) 0%, transparent 70%); border-radius: 50%; animation: float linear infinite; }
  @keyframes float { 0% { transform: translateY(0) translateX(0); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 0.5; } 100% { transform: translateY(-100px) translateX(30px); opacity: 0; } }
  .ring-pulse { animation: ringPulse 3s ease-in-out infinite; }
  @keyframes ringPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 20px 4px rgba(200,160,80,0.3); } }
  .suggestion-btn:hover { background: rgba(200,160,80,0.2) !important; border-color: rgba(200,160,80,0.6) !important; transform: translateY(-2px); }
  .suggestion-highlight:hover { background: linear-gradient(135deg, #d4a84b 0%, #e8c060 50%, #b8860b 100%) !important; transform: translateY(-2px); box-shadow: 0 0 32px rgba(200,160,80,0.8) !important; }
  .home-btn:hover, .menu-btn:hover { background: rgba(200,160,80,0.15) !important; }
  .auth-btn:hover { background: radial-gradient(circle, rgba(200,160,80,0.5) 0%, rgba(139,90,200,0.4) 100%) !important; }
  .new-conv-btn:hover { background: rgba(200,160,80,0.2) !important; }
  .conv-item:hover { background: rgba(200,160,80,0.07) !important; }
  .email-btn:hover { background: rgba(200,160,80,0.25) !important; border-color: rgba(200,160,80,0.5) !important; transform: scale(1.1); }
  .delete-btn:hover { background: rgba(200,60,60,0.25) !important; border-color: rgba(200,60,60,0.5) !important; transform: scale(1.1); }
  .send-btn:hover:not(:disabled) { transform: scale(1.1); }
  .input-glow:focus-within { border-color: rgba(200,160,80,0.6) !important; box-shadow: 0 0 24px rgba(200,160,80,0.15); }
  .msg-fade-in { animation: fadeIn 0.4s ease-out; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #d4a84b; display: inline-block; animation: dotPulse 1.2s ease-in-out infinite; }
  @keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
  .cursor-blink { animation: blink 0.8s step-end infinite; color: #d4a84b; }
  @keyframes blink { from, to { opacity: 1; } 50% { opacity: 0; } }
  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.45); }
  input:focus { border-color: rgba(200,160,80,0.5) !important; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,160,80,0.4); border-radius: 2px; }
`;
