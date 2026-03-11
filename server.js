const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const DIRECTIVES_FILE = path.join(__dirname, "directives.txt");
const ADMIN_CODE = "NOVA_GENIE-44!/";

app.use(cors({ origin: "*" }));
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const getSupabase = () => {
  const { createClient } = require("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
};

const sendEmail = async ({ to, subject, html }) => {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "NOVA <nova@coeurandco.com>", to, subject, html }),
  });
  if (!res.ok) { const err = await res.json(); console.error("Erreur Resend:", err); throw new Error(err.message); }
  return res.json();
};

const loadDirectives = () => {
  try { if (fs.existsSync(DIRECTIVES_FILE)) return fs.readFileSync(DIRECTIVES_FILE, "utf8").trim(); } catch (e) {}
  return "";
};

const saveDirectives = (d) => { try { fs.writeFileSync(DIRECTIVES_FILE, d, "utf8"); } catch (e) {} };

const requireAdmin = (req, res, next) => {
  if (req.headers["x-admin-code"] !== ADMIN_CODE) return res.status(401).json({ error: "Non autorisé" });
  next();
};

// ─── CHAT ────────────────────────────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages invalides" });
    const directives = loadDirectives();
    let finalSystem = system;
    if (directives) finalSystem = system + "\n\n## Directives permanentes :\n" + directives;
    const response = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: finalSystem, messages });
    res.json(response);
  } catch (error) { console.error("Erreur chat:", error.message); res.status(500).json({ error: "Erreur serveur" }); }
});

// ─── ELEVENLABS TTS ──────────────────────────────────────────────────────────
app.options("/api/speak", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }).sendStatus(204);
});

app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Texte manquant" });

    const voiceId = "HuLbOdhRlvQQN8oPP0AJ";
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true }
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Erreur ElevenLabs:", err);
      return res.status(500).json({ error: "Erreur synthèse vocale" });
    }

    const audioBuffer = await response.arrayBuffer();
    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBuffer.byteLength,
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.send(Buffer.from(audioBuffer));
  } catch (e) { console.error("Erreur /api/speak:", e.message); res.status(500).json({ error: e.message }); }
});

// ─── DIRECTIVES ──────────────────────────────────────────────────────────────
app.get("/api/directives", (req, res) => res.json({ directives: loadDirectives() }));

app.post("/api/directives/add", (req, res) => {
  const { directive } = req.body;
  if (!directive) return res.status(400).json({ error: "Directive manquante" });
  const current = loadDirectives();
  const updated = current ? current + "\n- " + directive : "- " + directive;
  saveDirectives(updated);
  res.json({ success: true, directives: updated });
});

app.post("/api/directives/remove", (req, res) => {
  const { directive } = req.body;
  if (!directive) return res.status(400).json({ error: "Directive manquante" });
  const lines = loadDirectives().split("\n").filter(line => !line.includes(directive));
  saveDirectives(lines.join("\n").trim());
  res.json({ success: true });
});

app.delete("/api/directives", (req, res) => { saveDirectives(""); res.json({ success: true }); });

// ─── RÉSUMÉ + EMAIL ──────────────────────────────────────────────────────────
app.post("/api/send-summary", async (req, res) => {
  try {
    const { conversation_id, user_email } = req.body;
    if (!conversation_id || !user_email) return res.status(400).json({ error: "Paramètres manquants" });
    const supabase = getSupabase();
    const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", conversation_id).order("created_at", { ascending: true });
    if (!msgs || msgs.length === 0) return res.status(400).json({ error: "Conversation vide" });
    const { data: conv } = await supabase.from("conversations").select("title").eq("id", conversation_id).single();
    const transcript = msgs.map(m => `${m.role === "user" ? "Vous" : "NOVA"}: ${m.content}`).join("\n\n");
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 500,
      messages: [{ role: "user", content: `Tu es NOVA. Un utilisateur souhaite recevoir par email l'essence de sa conversation avec toi.\n\nVoici la conversation :\n${transcript}\n\nRédige un résumé personnel, chaleureux et subtil (10-15 lignes max).\n- Commence par une phrase qui rappelle le cœur de ce qui a été exploré\n- Mets en valeur les insights les plus profonds qui ont émergé\n- Termine par une invitation à continuer ce chemin intérieur\n- Écris à la deuxième personne\n- Ton sobre, profond, sans clichés new age\n- En français` }]
    });
    const summary = response.content?.[0]?.text || "Résumé indisponible.";
    await sendEmail({
      to: user_email,
      subject: `✦ L'essence de votre conversation — ${conv?.title || "NOVA"}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="background:#050a0f; color:#e8d8b8; font-family:'Georgia', serif; padding:40px 0; margin:0;"><div style="max-width:560px; margin:0 auto; padding:0 24px;"><div style="text-align:center; margin-bottom:40px;"><p style="font-size:20px; color:#c8a050; letter-spacing:8px; margin:0 0 8px;">☽✦☾</p><h1 style="font-size:32px; font-weight:400; letter-spacing:12px; color:#c8a050; margin:0 0 8px;">NOVA</h1><p style="font-size:11px; letter-spacing:4px; color:#706050; margin:0; text-transform:uppercase;">L'essence de votre conversation</p></div><div style="background:rgba(200,160,80,0.05); border:1px solid rgba(200,160,80,0.2); border-radius:16px; padding:32px; margin-bottom:32px;"><p style="font-size:11px; letter-spacing:3px; color:#c8a050; margin:0 0 20px; text-transform:uppercase;">✦ Ce qui a émergé</p><div style="font-size:15px; line-height:1.9; color:#d8ccb8; white-space:pre-line;">${summary}</div></div><div style="text-align:center; margin-bottom:40px;"><a href="https://nova.coeurandco.com" style="display:inline-block; background:rgba(200,160,80,0.15); border:1px solid rgba(200,160,80,0.4); border-radius:30px; padding:12px 32px; color:#c8a050; text-decoration:none; font-size:13px; letter-spacing:2px;">Continuer votre voyage ✦</a></div><p style="text-align:center; font-size:11px; color:#3a3030; letter-spacing:1px;">Cet email vous a été envoyé depuis NOVA · Agent d'Éveil & de Réalisation de Soi</p></div></body></html>`
    });
    res.json({ success: true });
  } catch (e) { console.error("Erreur send-summary:", e.message); res.status(500).json({ error: e.message }); }
});

// ─── WEBHOOK NOUVEL UTILISATEUR ──────────────────────────────────────────────
app.post("/api/webhook/new-user", async (req, res) => {
  try {
    const record = req.body?.record;
    if (!record) return res.status(400).json({ error: "Pas de données" });
    const supabase = getSupabase();
    const { data: userData } = await supabase.auth.admin.getUserById(record.user_id);
    const userEmail = userData?.user?.email || "Email inconnu";
    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    await sendEmail({
      to: "benoitpro@gmail.com",
      subject: "✦ Nouvel inscrit sur NOVA",
      html: `<!DOCTYPE html><html><body style="background:#050a0f; color:#e8d8b8; font-family:'Georgia', serif; padding:40px 24px; margin:0;"><div style="max-width:480px; margin:0 auto;"><div style="text-align:center; margin-bottom:32px;"><h1 style="font-size:28px; font-weight:400; letter-spacing:10px; color:#c8a050; margin:0;">NOVA</h1><p style="font-size:11px; letter-spacing:3px; color:#706050; margin:8px 0 0; text-transform:uppercase;">Nouvel inscrit</p></div><div style="background:rgba(200,160,80,0.06); border:1px solid rgba(200,160,80,0.2); border-radius:16px; padding:28px;"><p style="font-size:13px; color:#a09080; margin:0 0 12px; letter-spacing:1px; text-transform:uppercase;">✦ Un nouvel être a rejoint NOVA</p><p style="font-size:18px; color:#d4a84b; margin:0 0 20px;">${userEmail}</p><p style="font-size:13px; color:#706050; margin:0;">Inscrit le ${dateStr} à ${timeStr}</p></div><div style="text-align:center; margin-top:28px;"><a href="https://nova.coeurandco.com/admin" style="display:inline-block; background:rgba(200,160,80,0.15); border:1px solid rgba(200,160,80,0.4); border-radius:30px; padding:10px 28px; color:#c8a050; text-decoration:none; font-size:12px; letter-spacing:2px;">Voir le bureau admin ✦</a></div></div></body></html>`
    });
    res.json({ success: true });
  } catch (e) { console.error("Erreur webhook new-user:", e.message); res.status(500).json({ error: e.message }); }
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────
app.post("/api/admin/auth", (req, res) => {
  if (req.body.code === ADMIN_CODE) res.json({ success: true });
  else res.status(401).json({ error: "Code incorrect" });
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await getSupabase().from("admin_users").select("*");
    if (error) throw error;
    res.json({ users: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/admin/set-premium", requireAdmin, async (req, res) => {
  try {
    const { user_id, plan } = req.body;
    const { error } = await getSupabase().from("subscriptions").update({ plan }).eq("user_id", user_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/user-conversations/:userId", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await getSupabase().from("conversations").select("*").eq("user_id", req.params.userId).order("updated_at", { ascending: false });
    if (error) throw error;
    res.json({ conversations: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/conversation-summary/:convId", requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: msgs } = await supabase.from("messages").select("*").eq("conversation_id", req.params.convId).order("created_at", { ascending: true });
    if (!msgs || msgs.length === 0) return res.json({ summary: "Conversation vide.", messages: [] });
    const transcript = msgs.map(m => `${m.role === "user" ? "Utilisateur" : "NOVA"}: ${m.content}`).join("\n");
    const response = await client.messages.create({ model: "claude-sonnet-4-20250514", max_tokens: 300, messages: [{ role: "user", content: `Résume en 3-4 phrases cette conversation :\n\n${transcript}` }] });
    res.json({ summary: response.content?.[0]?.text || "Résumé indisponible.", messages: msgs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { count: totalUsers } = await supabase.from("subscriptions").select("*", { count: "exact", head: true });
    const { count: premiumUsers } = await supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("plan", "premium");
    const today = new Date().toISOString().split("T")[0];
    const { data: todayMsgs } = await supabase.from("subscriptions").select("messages_today").eq("last_reset", today);
    const totalToday = todayMsgs?.reduce((sum, s) => sum + (s.messages_today || 0), 0) || 0;
    res.json({ totalUsers, premiumUsers, totalToday });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ─── MÉMOIRE LONGUE DURÉE ────────────────────────────────────────────────────
app.post("/api/memory/update", async (req, res) => {
  try {
    const { user_id, messages } = req.body;
    if (!user_id || !messages?.length) return res.status(400).json({ error: "Paramètres manquants" });

    const supabase = getSupabase();

    // Récupère la mémoire existante
    const { data: existing } = await supabase.from("memories").select("summary").eq("user_id", user_id).single();

    const transcript = messages.slice(-20).map(m => `${m.role === "user" ? "Utilisateur" : "NOVA"}: ${m.content}`).join("\n");

    const prompt = existing?.summary
      ? "Voici ce que tu sais déjà sur cet utilisateur :\n" + existing.summary + "\n\nVoici la nouvelle conversation :\n" + transcript + "\n\nMets à jour le résumé en intégrant les nouvelles informations. Garde uniquement ce qui est utile pour personnaliser les futures conversations : sujets importants, émotions exprimées, questions récurrentes, évolutions spirituelles, préoccupations. Maximum 15 lignes. En français."
      : "Voici une conversation avec un utilisateur de NOVA :\n" + transcript + "\n\nRésume ce qui est utile pour personnaliser les futures conversations : sujets importants, émotions exprimées, questions récurrentes, évolutions spirituelles, préoccupations. Maximum 15 lignes. En français.";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 400,
      messages: [{ role: "user", content: prompt }]
    });

    const summary = response.content?.[0]?.text || "";

    await supabase.from("memories").upsert({
      user_id,
      summary,
      updated_at: new Date().toISOString()
    });

    res.json({ success: true, summary });
  } catch (e) { console.error("Erreur memory/update:", e.message); res.status(500).json({ error: e.message }); }
});

app.get("/api/memory/:userId", async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.from("memories").select("summary").eq("user_id", req.params.userId).single();
    res.json({ summary: data?.summary || "" });
  } catch (e) { res.json({ summary: "" }); }
});

// ─── START ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`Serveur NOVA actif sur http://localhost:${PORT}`));