import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://izqedljmaiylwjkyoiwh.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWVkbGptYWl5bHdqa3lvaXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzMyNjcsImV4cCI6MjA4ODIwOTI2N30.GcelpRphmj24YbV1T3ttFNuHSpy6g3t6NE6kIM33T4o";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const CHEMINS = ["Méditation", "Bouddhisme", "Non Dualité", "Advaita", "Christianisme", "Chamanisme", "Autres", "Libre..."];
const EXPERIENCES = ["Éveil spontané", "Visions", "Apparition Mystique", "EMI", "Channeling", "Sortie hors du corps", "Synchronicités fortes", "Aucune en particulier"];
const NIVEAUX = ["Débutant curieux", "En chemin depuis quelques années", "Pratiquant avancé", "Enseignant / Accompagnant"];

const STEPS = [
  { id: "prenom", label: "Comment t'appelles-tu ?", subtitle: "Ton prénom, pour que NOVA puisse s'adresser à toi personnellement.", type: "text", placeholder: "Ton prénom..." },
  { id: "chemin_spirituel", label: "Quel est ton chemin spirituel ?", subtitle: "Tu peux choisir plusieurs voies qui résonnent en toi.", type: "multi", options: CHEMINS },
  { id: "experiences", label: "As-tu vécu l'une de ces expériences ?", subtitle: "Ces expériences aideront NOVA à mieux comprendre ton vécu.", type: "multi", options: EXPERIENCES },
  { id: "niveau", label: "Où en es-tu sur ton chemin ?", subtitle: "Sois honnête — il n'y a pas de bonne ou mauvaise réponse.", type: "single", options: NIVEAUX },
  { id: "intention", label: "Qu'est-ce qui t'amène ici ?", subtitle: "En quelques mots, partage ton intention profonde avec NOVA.", type: "textarea", placeholder: "Mon intention est de..." },
];

export default function Profil({ user, onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ prenom: "", chemin_spirituel: [], experiences: [], niveau: "", intention: "" });
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState("forward");

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const canContinue = () => {
    const val = answers[current.id];
    if (current.type === "text" || current.type === "textarea") return val.trim().length > 0;
    if (current.type === "multi") return val.length > 0;
    if (current.type === "single") return val.length > 0;
    return false;
  };

  const toggleMulti = (option) => {
    const current_val = answers[current.id];
    if (current_val.includes(option)) {
      setAnswers(prev => ({ ...prev, [current.id]: current_val.filter(v => v !== option) }));
    } else {
      setAnswers(prev => ({ ...prev, [current.id]: [...current_val, option] }));
    }
  };

  const selectSingle = (option) => {
    setAnswers(prev => ({ ...prev, [current.id]: option }));
  };

  const next = async () => {
    if (!canContinue()) return;
    if (isLast) {
      await saveProfile();
    } else {
      setDirection("forward");
      setStep(s => s + 1);
    }
  };

  const prev = () => {
    if (step === 0) return;
    setDirection("back");
    setStep(s => s - 1);
  };

  const saveProfile = async () => {
    setSaving(true);
    await supabase.from("profiles").upsert({
      user_id: user.id,
      prenom: answers.prenom,
      chemin_spirituel: answers.chemin_spirituel,
      experiences: answers.experiences,
      niveau: answers.niveau,
      intention: answers.intention,
      completed: true,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    onComplete(answers);
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div style={s.root}>
      <style>{css}</style>

      {/* Fond étoilé */}
      <div style={s.starsWrap}>
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className="star" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: Math.random() * 2 + 1, height: Math.random() * 2 + 1, animationDelay: `${Math.random() * 5}s`, animationDuration: `${Math.random() * 3 + 2}s` }} />
        ))}
      </div>

      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoRing} className="ring-pulse" />
          <div style={s.logoInner}><span style={s.logoSymbol}>☽✦☾</span></div>
        </div>

        <p style={s.brand}>NOVA</p>
        <p style={s.brandSub}>Bienvenue — Créons ton profil</p>

        {/* Barre de progression */}
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${progress}%` }} />
        </div>
        <p style={s.progressLabel}>{step + 1} / {STEPS.length}</p>

        {/* Question */}
        <div style={s.questionWrap} key={step} className="step-in">
          <h2 style={s.question}>{current.label}</h2>
          <p style={s.questionSub}>{current.subtitle}</p>

          {/* Text */}
          {current.type === "text" && (
            <input
              style={s.input}
              type="text"
              placeholder={current.placeholder}
              value={answers[current.id]}
              onChange={e => setAnswers(prev => ({ ...prev, [current.id]: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && canContinue() && next()}
              autoFocus
            />
          )}

          {/* Textarea */}
          {current.type === "textarea" && (
            <textarea
              style={s.textarea}
              placeholder={current.placeholder}
              value={answers[current.id]}
              onChange={e => setAnswers(prev => ({ ...prev, [current.id]: e.target.value }))}
              rows={4}
              autoFocus
            />
          )}

          {/* Multi select */}
          {current.type === "multi" && (
            <div style={s.optionsWrap}>
              {current.options.map(opt => (
                <button
                  key={opt}
                  style={{ ...s.optionBtn, ...(answers[current.id].includes(opt) ? s.optionBtnActive : {}) }}
                  className="option-btn"
                  onClick={() => toggleMulti(opt)}
                >
                  {answers[current.id].includes(opt) && <span style={s.checkmark}>✦ </span>}
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Single select */}
          {current.type === "single" && (
            <div style={s.optionsWrap}>
              {current.options.map(opt => (
                <button
                  key={opt}
                  style={{ ...s.optionBtn, ...(answers[current.id] === opt ? s.optionBtnActive : {}), width: "100%" }}
                  className="option-btn"
                  onClick={() => selectSingle(opt)}
                >
                  {answers[current.id] === opt && <span style={s.checkmark}>✦ </span>}
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={s.navRow}>
          {step > 0 && (
            <button style={s.prevBtn} onClick={prev}>← Retour</button>
          )}
          <button
            style={{ ...s.nextBtn, opacity: canContinue() ? 1 : 0.4, marginLeft: step > 0 ? 0 : "auto" }}
            className={canContinue() ? "next-btn" : ""}
            onClick={next}
            disabled={!canContinue() || saving}
          >
            {saving ? "Sauvegarde..." : isLast ? "Commencer avec NOVA ✦" : "Continuer →"}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "radial-gradient(ellipse at center, #0a0510 0%, #050208 60%, #000 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Palatino Linotype', serif", color: "#f0e8d8", padding: "24px", position: "relative", overflow: "hidden" },
  starsWrap: { position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 },
  card: { position: "relative", zIndex: 1, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(24px)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 28, padding: "40px 36px", maxWidth: 540, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 },
  logoWrap: { position: "relative", width: 60, height: 60 },
  logoRing: { position: "absolute", inset: 0, borderRadius: "50%", border: "1px solid rgba(200,160,80,0.6)" },
  logoInner: { position: "absolute", inset: 6, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,90,200,0.3) 0%, rgba(200,160,80,0.15) 100%)", border: "1px solid rgba(200,160,80,0.3)", display: "flex", alignItems: "center", justifyContent: "center" },
  logoSymbol: { fontSize: 13, color: "#d4a84b", letterSpacing: 1 },
  brand: { fontFamily: "'Cinzel', serif", fontSize: 24, letterSpacing: 12, color: "#d4a84b", margin: 0 },
  brandSub: { fontSize: 11, letterSpacing: 3, color: "#706050", textTransform: "uppercase", margin: 0 },
  progressBar: { width: "100%", height: 3, background: "rgba(200,160,80,0.15)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #b8860b, #d4a84b)", borderRadius: 2, transition: "width 0.5s ease" },
  progressLabel: { fontSize: 11, color: "#706050", letterSpacing: 2, margin: 0 },
  questionWrap: { width: "100%", display: "flex", flexDirection: "column", gap: 16 },
  question: { fontSize: 20, fontWeight: 400, color: "#f0e8d8", letterSpacing: 0.5, lineHeight: 1.4, margin: 0, textAlign: "center" },
  questionSub: { fontSize: 13, color: "#a09080", lineHeight: 1.6, margin: 0, textAlign: "center" },
  input: { width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 14, padding: "14px 18px", color: "#ffffff", fontFamily: "inherit", fontSize: 16, outline: "none", boxSizing: "border-box", transition: "border-color 0.3s" },
  textarea: { width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 14, padding: "14px 18px", color: "#ffffff", fontFamily: "inherit", fontSize: 15, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.7 },
  optionsWrap: { display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  optionBtn: { background: "rgba(200,160,80,0.08)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: 24, padding: "10px 18px", color: "#c8bcac", fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all 0.25s", letterSpacing: 0.3 },
  optionBtnActive: { background: "rgba(200,160,80,0.2)", border: "1px solid rgba(200,160,80,0.7)", color: "#d4a84b", fontWeight: "600" },
  checkmark: { color: "#d4a84b" },
  navRow: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 12, marginTop: 8 },
  prevBtn: { background: "none", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 24, padding: "10px 20px", color: "#a09080", fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.3s", letterSpacing: 0.5 },
  nextBtn: { background: "linear-gradient(135deg, #b8860b 0%, #d4a84b 50%, #a0720a 100%)", border: "none", borderRadius: 24, padding: "12px 28px", color: "#0a0800", fontFamily: "inherit", fontSize: 14, fontWeight: "700", cursor: "pointer", letterSpacing: 1, transition: "all 0.3s", boxShadow: "0 0 20px rgba(200,160,80,0.4)" },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .star { position: absolute; background: white; border-radius: 50%; animation: twinkle ease-in-out infinite; }
  @keyframes twinkle { 0%, 100% { opacity: 0.1; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.3); } }
  .ring-pulse { animation: ringPulse 3s ease-in-out infinite; }
  @keyframes ringPulse { 0%, 100% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.08); opacity: 1; box-shadow: 0 0 16px rgba(200,160,80,0.3); } }
  .step-in { animation: stepIn 0.4s ease-out; }
  @keyframes stepIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
  .option-btn:hover { background: rgba(200,160,80,0.18) !important; border-color: rgba(200,160,80,0.5) !important; color: #e8d8b8 !important; transform: translateY(-1px); }
  .next-btn:hover { box-shadow: 0 0 32px rgba(200,160,80,0.7) !important; transform: translateY(-1px); }
  input:focus, textarea:focus { border-color: rgba(200,160,80,0.6) !important; box-shadow: 0 0 16px rgba(200,160,80,0.1); }
  input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.35); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(200,160,80,0.4); border-radius: 2px; }
`;
