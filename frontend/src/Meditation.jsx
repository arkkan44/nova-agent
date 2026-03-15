import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://izqedljmaiylwjkyoiwh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWVkbGptYWl5bHdqa3lvaXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzMyNjcsImV4cCI6MjA4ODIwOTI2N30.GcelpRphmj24YbV1T3ttFNuHSpy6g3t6NE6kIM33T4o";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const API = "https://nova-agent-production-8bcc.up.railway.app";

const ETATS = ["Anxieux / Stressé", "Triste ou lourd", "Agité / Dispersé", "Fatigué", "Désorienté.e", "Bien, je veux approfondir"];
const STYLES = ["Pleine conscience", "Visualisation", "Non-dualité / Présence", "Souffle & Corps", "Lâcher-prise", "Psychologie"];
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 2 + 1, duration: Math.random() * 20 + 10, delay: Math.random() * 10 }));

export default function Meditation() {
  const [user, setUser] = useState(null);
  const [profil, setProfil] = useState(null);
  const [step, setStep] = useState("intro");
  const [etat, setEtat] = useState("");
  const [style, setStyle] = useState("");
  const [intention, setIntention] = useState("");
  const [meditationText, setMeditationText] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [wasPaused, setWasPaused] = useState(false);
  const audioChunksRef = useRef([]);
  const ambientRef = useRef(null);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const stoppedRef = useRef(false);
  const playerRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u) loadProfil(u.id);
    });
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

  // ─── Musique d'ambiance pendant génération + lecture ──────────────────────
  useEffect(() => {
    const shouldPlay = step === "generating" || step === "player";
    if (shouldPlay) {
      if (!ambientRef.current) {
        const audio = new Audio("/meditation-ambient.mp3");
        audio.loop = true;
        audio.volume = 0;
        ambientRef.current = audio;
      }
      const audio = ambientRef.current;
      audio.play().catch(() => {});
      let v = audio.volume;
      const iv = setInterval(() => {
        v = Math.min(v + 0.01, 0.2);
        audio.volume = v;
        if (v >= 0.2) clearInterval(iv);
      }, 80);
    } else {
      if (ambientRef.current) {
        const audio = ambientRef.current;
        let v = audio.volume;
        const iv = setInterval(() => {
          v = Math.max(v - 0.02, 0);
          audio.volume = v;
          if (v <= 0) { clearInterval(iv); audio.pause(); ambientRef.current = null; }
        }, 80);
      }
    }
  }, [step]);

  const loadProfil = async (userId) => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).single();
    if (data?.completed) setProfil(data);
  };

  const loadExistingMeditation = async (id) => {
    setStep("generating");
    const { data: msgs } = await supabase.from("messages").select("content").eq("conversation_id", id).single();
    if (msgs?.content) {
      const text = msgs.content;
      const secs = Math.round((text.split(/\s+/).length / 100) * 60);
      setMeditationText(text);
      setTotalTime(secs);
      setTimeLeft(secs);
      setProgress(0);
      setStep("player");
      await playMeditation(text, secs);
    } else {
      setStep("intro");
    }
  };

  const saveMeditation = async (text, etatChoisi, styleChoisi) => {
    if (!user || user.isAdminPreview) return;
    const title = "🧘 " + etatChoisi + " — " + styleChoisi;
    const { data: conv } = await supabase.from("conversations").insert({ user_id: user.id, title }).select().single();
    if (!conv) return;
    await supabase.from("messages").insert({ conversation_id: conv.id, role: "assistant", content: text });
    await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
  };

  // ─── Jouer un chunk audio via URL directe ─────────────────────────────────
  const playAudioUrl = (url) => new Promise((resolve) => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = resolve;
    audio.onerror = resolve;
    audio.play().catch(resolve);
  });

  // ─── TTS un chunk ─────────────────────────────────────────────────────────
  const speakChunk = async (text) => {
    const res = await fetch(`${API}/api/speak-meditation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("TTS error " + res.status);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  };

  // ─── Lecture principale ────────────────────────────────────────────────────
  const startTimer = (totalSec) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const startTime = Date.now();
    if (totalSec > 0) {
      timerRef.current = setInterval(() => {
        if (stoppedRef.current) return;
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeLeft(Math.max(0, totalSec - elapsed));
      }, 1000);
    }
  };

  const playChunksSequentially = async (urls, totalSec) => {
    stoppedRef.current = false;
    setIsPlaying(true);
    setWasPaused(false);
    setProgress(0);
    startTimer(totalSec);

    for (let i = 0; i < urls.length; i++) {
      if (stoppedRef.current) break;
      setProgress(Math.round((i / urls.length) * 95));
      await playAudioUrl(urls[i]);
      // Ne pas révoquer pour permettre de réécouter
    }

    if (timerRef.current) clearInterval(timerRef.current);
    if (!stoppedRef.current) { setProgress(100); setTimeLeft(0); setAudioReady(true); }
    setIsPlaying(false);
    // Ne pas vider audioChunksRef pour permettre de rejouer
  };

  const playMeditation = async (text, duration) => {
    const chunks = splitText(text, 2000);
    const totalSec = duration || totalTime;

    setAudioReady(false);
    setProgress(0);

    // Simulation du chargement : ~3 secondes par chunk en moyenne
    const estimatedMs = 30000;
    const startTime = Date.now();
    const simInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(95, Math.round((elapsed / estimatedMs) * 100));
      setProgress(pct);
    }, 200);

    const urls = [];
    for (let i = 0; i < chunks.length; i++) {
      try {
        const url = await speakChunk(chunks[i]);
        urls.push(url);
      } catch (e) { console.error("chunk fetch error:", e); }
    }
    audioChunksRef.current = urls;

    // Attendre que la simulation atteigne 100% avant d'activer le bouton
    const waitForSim = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= estimatedMs) {
        clearInterval(simInterval);
        clearInterval(waitForSim);
        setProgress(100);
        setTimeout(() => {
          setAudioReady(true);
          setTotalTime(totalSec);
          setTimeLeft(totalSec);
        }, 300);
      }
    }, 200);
  };

  // Bouton ▶ : écouter / reprendre / réécouter
  const launchMobileAudio = async () => {
    setProgress(0);
    setWasPaused(false);
    // Si on a déjà les chunks en cache, jouer directement
    if (audioChunksRef.current.length > 0) {
      await playChunksSequentially(audioChunksRef.current, totalTime);
      return;
    }
    // Sinon re-télécharger
    await playMeditation(meditationText, totalTime);
  };

  const splitText = (text, maxLen) => {
    if (text.length <= maxLen) return [text];
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
      if (remaining.length <= maxLen) { chunks.push(remaining); break; }
      let cut = maxLen;
      const d = remaining.lastIndexOf("...", maxLen);
      const p = remaining.lastIndexOf(". ", maxLen);
      if (d > maxLen * 0.6) cut = d + 3;
      else if (p > maxLen * 0.6) cut = p + 1;
      chunks.push(remaining.substring(0, cut).trim());
      remaining = remaining.substring(cut).trim();
    }
    return chunks;
  };

  const stopMeditation = () => {
    stoppedRef.current = true;
    audioRef.current?.pause();
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
    setWasPaused(true);
    setAudioReady(true); // Garder le bouton actif
  };



  const generateMeditation = async () => {
    // Débloquer AudioContext iOS au moment du clic
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination); src.start(0);
      setTimeout(() => ctx.close(), 500);
    } catch {}

    setStep("generating");
    setError("");
    stoppedRef.current = false;

    // Intro audio en parallèle
    fetch(`${API}/api/speak-meditation-intro`)
      .then(r => r.ok ? r.blob() : null)
      .then(blob => { if (!blob) return; const url = URL.createObjectURL(blob); playAudioUrl(url).then(() => URL.revokeObjectURL(url)); })
      .catch(() => {});

    // Décompte affiché PENDANT la génération
    setCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(countdownRef.current); return 0; } return prev - 1; });
    }, 1000);

    const profilInfo = profil ? `L'utilisateur s'appelle ${profil.prenom}. Chemin : ${profil.chemin_spirituel?.join(", ")||"libre"}. Expériences : ${profil.experiences?.join(", ")||"aucune précisée"}.` : "";
    const isPsycho = style === "Psychologie";
    const intentionFinale = isPsycho
      ? "Je veux qu'on m'aide à travailler à calmer la résurgence de mes traumas d'attachement ou de négligence, avec toutes les dernières découvertes dans ce domaine."
      : (intention || "s'ouvrir à la paix intérieure");

    const prompt = isPsycho
      ? `Tu es NOVA, un accompagnant psychologique doux, chaleureux et profondément bienveillant. Tu t'appuies sur les dernières découvertes en psychothérapie de l'attachement, des traumas, la théorie polyvagale, l'EMDR, la thérapie des schémas et la pleine conscience trauma-sensible.

${profilInfo}
État : ${etat}
Intention : ${intentionFinale}

Génère un moment de soutien psychologique doux de 10 minutes en français.
Règles :
- Commence directement par accueillir la personne avec chaleur et douceur
- Utilise "vous"
- Valide les émotions sans les amplifier
- Guide doucement vers la sécurité intérieure et la régulation du système nerveux
- Utilise "..." ABONDAMMENT après chaque idée, chaque mot clé, chaque invitation — au moins toutes les 5 à 8 mots
- Phrases très courtes, jamais plus de 10 mots par phrase
- Ton enveloppant et sécurisant
- Intègre des ancrages corporels doux (respiration, sensation des pieds au sol, chaleur dans la poitrine)
- Rappelle doucement que ces réactions sont normales et que la guérison est possible
- Termine par un retour doux vers le présent et un ancrage de sécurité
- Texte fluide, pas de listes, ne mentionne pas la durée`
      : `Tu es NOVA, guide spirituel profond et bienveillant. Génère une méditation guidée personnalisée en français.

${profilInfo}
État : ${etat}
Style : ${style}
Intention : ${intentionFinale}

Règles :
- Commence directement par guider, sans introduction
- Utilise "vous"
- Ton doux, profond, enveloppant
- Utilise "..." ABONDAMMENT après chaque idée, chaque mot clé, chaque invitation — au moins toutes les 5 à 8 mots
- Phrases très courtes, jamais plus de 10 mots, séparées par des "..."
- Adapte au profil spirituel
- Termine par un retour doux
- Texte fluide, pas de listes
- Ne mentionne pas la durée`;

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: isPsycho
            ? "Tu es NOVA, un accompagnant psychologique doux et bienveillant spécialisé en psychothérapie de l'attachement et des traumas. Tu génères des moments de soutien psy chaleureux en français."
            : "Tu es NOVA, guide spirituel. Tu génères des méditations guidées profondes en français.",
          messages: [{ role: "user", content: prompt }]
        }),
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      if (!text) throw new Error("Texte vide");

      const secs = isPsycho ? 600 : Math.round((text.split(/\s+/).length / 100) * 60);
      setTotalTime(secs);
      setTimeLeft(secs);
      setMeditationText(text);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(0);

      await saveMeditation(text, etat, style);
      setStep("player");
      await playMeditation(text, secs);
    } catch (e) {
      console.error("generate error:", e);
      setError("Erreur lors de la génération. Réessaie.");
      setStep("form");
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  };

  const reset = () => {
    stopMeditation();
    if (countdownRef.current) clearInterval(countdownRef.current);
    setStep("intro"); setEtat(""); setStyle(""); setIntention("");
    setMeditationText(""); setProgress(0); setTimeLeft(0); setTotalTime(0); setCountdown(0); setAudioReady(false); setWasPaused(false); audioChunksRef.current = [];
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

        {/* INTRO */}
        {step === "intro" && (
          <div style={s.card} className="fade-in">
            <div style={s.orbeSmall} className="orbe-idle"><span style={{ fontSize: 32 }}>🧘</span></div>
            <h1 style={s.title}>Méditation Guidée</h1>
            <p style={s.subtitle}>NOVA crée pour vous une méditation unique,<br />adaptée à votre état et votre chemin.</p>
            <button style={s.startBtn} className="start-btn" onClick={() => setStep("form")}>Commencer ✦</button>
          </div>
        )}

        {/* FORM */}
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
            <textarea style={s.textarea} placeholder="Ex: trouver la paix, lâcher le mental..." value={intention} onChange={e => setIntention(e.target.value)} rows={2} />
            {error && <p style={s.error}>{error}</p>}
            <button style={{ ...s.startBtn, opacity: etat && style ? 1 : 0.4, marginTop: 28 }} className={etat && style ? "start-btn" : ""} onClick={generateMeditation} disabled={!etat || !style}>
              Générer ma méditation ✦
            </button>
          </div>
        )}

        {/* GENERATING */}
        {step === "generating" && (
          <div style={s.card} className="fade-in">
            <div style={s.orbeSmall} className="orbe-think"><span style={{ fontSize: 28 }}>✦</span></div>
            <p style={s.generatingText}>NOVA prépare votre méditation...</p>
            {countdown > 0 && (
              <div style={s.countdownWrap}>
                <p style={s.countdownLabel}>La méditation commencera dans</p>
                <p style={s.countdownNumber}>{countdown}</p>
                <p style={s.countdownSub}>secondes</p>
              </div>
            )}
          </div>
        )}

        {/* PLAYER */}
        {step === "player" && (
          <div style={s.playerCard} className="fade-in">
            <div style={s.orbe} className={isPlaying ? "orbe-speak" : "orbe-idle"}>
              <span style={{ fontSize: 36 }}>{isPlaying ? "✦" : "🧘"}</span>
            </div>

            <p style={s.playerStatus}>
              {isPlaying
                ? "NOVA vous guide..."
                : progress === 100
                  ? "Méditation terminée ✦"
                  : wasPaused
                    ? "Méditation en pause"
                    : audioReady
                      ? "Méditation prête ✦"
                      : "Chargement de votre méditation..."}
            </p>

            {/* Barre chargement OU barre lecture */}
            {!audioReady && !wasPaused && (
              <div style={s.loadingSection}>
                <div style={s.loadingBarWrap}>
                  <div style={{ ...s.loadingBarFill, width: `${progress}%` }} />
                </div>
                <p style={s.loadingPct}>Chargement : <span style={s.loadingPctNum}>{progress}%</span></p>
              </div>
            )}
            {/* Barre progression lecture */}
            {(isPlaying || wasPaused || progress === 100) && (
              <div style={s.loadingSection}>
                <div style={s.loadingBarWrap}>
                  <div style={{ ...s.progressFill, width: `${totalTime > 0 ? Math.round(((totalTime - timeLeft) / totalTime) * 100) : 0}%` }} />
                </div>
                {isPlaying && totalTime > 0 && (
                  <p style={s.loadingPct}>
                    <span style={s.timerText}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</span>
                    <span style={s.timerTotal}> restantes / {Math.floor(totalTime / 60)}:{String(totalTime % 60).padStart(2, "0")}</span>
                  </p>
                )}
              </div>
            )}


            {/* Texte */}
            <div style={s.textScroll}>
  

              <p style={s.meditationText}>{meditationText}</p>
            </div>

            {/* UN SEUL bouton contrôle */}
            <div style={s.controls}>
              {isPlaying
                ? <button style={s.controlBtn} className="control-btn" onClick={stopMeditation}>⏸ Pause</button>
                : progress === 100
                  ? <button style={s.controlBtn} className="control-btn" onClick={launchMobileAudio}>▶ Réécouter</button>
                  : <button
                      style={{ ...s.controlBtn, opacity: audioReady ? 1 : 0.4 }}
                      className={audioReady ? "control-btn" : ""}
                      onClick={audioReady ? launchMobileAudio : undefined}
                      disabled={!audioReady}
                    >
                      {!audioReady ? "⏳ Chargement..." : wasPaused ? "▶ Reprendre" : "▶ Écouter"}
                    </button>
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
  playerCard: { background: "rgba(0,0,0,0.55)", backdropFilter: "blur(24px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 28, padding: "36px 28px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 },
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
  countdownWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 8 },
  countdownLabel: { fontSize: 13, color: "#a09080", letterSpacing: 1, textAlign: "center", margin: 0 },
  countdownNumber: { fontSize: 56, color: "#d4a84b", fontFamily: "'Cinzel', serif", lineHeight: 1, margin: "4px 0" },
  countdownSub: { fontSize: 11, color: "#706050", letterSpacing: 3, textTransform: "uppercase", margin: 0 },
  playerStatus: { fontSize: 13, letterSpacing: 2, color: "#d4a84b", textTransform: "uppercase", margin: 0 },
  timerWrap: { display: "flex", alignItems: "baseline", gap: 4 },
  timerInText: { display: "flex", alignItems: "baseline", gap: 4, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid rgba(200,160,80,0.15)" },
  mobileReadyWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 16, padding: "14px", background: "rgba(200,160,80,0.08)", borderRadius: 12, border: "1px solid rgba(200,160,80,0.3)" },
  mobileReadyText: { fontSize: 13, color: "#d4a84b", letterSpacing: 1, margin: 0 },
  mobilePlayBtn: { background: "linear-gradient(135deg, #b8860b, #d4a84b)", border: "none", borderRadius: 24, padding: "12px 28px", color: "#0a0800", fontFamily: "inherit", fontSize: 14, fontWeight: "700", cursor: "pointer", letterSpacing: 1 },
  mobileLoadingText: { fontSize: 13, color: "#a09080", textAlign: "center", marginBottom: 12, letterSpacing: 1 },
  timerText: { fontSize: 16, color: "#d4a84b", letterSpacing: 1, fontVariantNumeric: "tabular-nums" },
  timerTotal: { fontSize: 12, color: "#706050" },
  loadingSection: { width: "100%", display: "flex", flexDirection: "column", gap: 6 },
  loadingBarWrap: { width: "100%", height: 4, background: "rgba(200,160,80,0.15)", borderRadius: 2, overflow: "hidden" },
  loadingBarFill: { height: "100%", background: "linear-gradient(90deg, #8b5ac8, #d4a84b)", borderRadius: 2, transition: "width 0.8s ease" },
  loadingPct: { fontSize: 12, color: "#a09080", textAlign: "center", letterSpacing: 1, margin: 0 },
  loadingPctNum: { color: "#d4a84b", fontWeight: "600" },
  progressBar: { width: "100%", height: 3, background: "rgba(200,160,80,0.15)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #b8860b, #d4a84b)", borderRadius: 2, transition: "width 1.5s ease" },
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
