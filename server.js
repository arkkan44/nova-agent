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

const loadDirectives = () => {
  try {
    if (fs.existsSync(DIRECTIVES_FILE)) return fs.readFileSync(DIRECTIVES_FILE, "utf8").trim();
  } catch (e) {}
  return "";
};

const saveDirectives = (directives) => {
  try { fs.writeFileSync(DIRECTIVES_FILE, directives, "utf8"); } catch (e) {}
};

const requireAdmin = (req, res, next) => {
  if (req.headers["x-admin-code"] !== ADMIN_CODE) return res.status(401).json({ error: "Non autorisé" });
  next();
};

// ─── CHAT ───────────────────────────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Messages invalides" });
    const directives = loadDirectives();
    let finalSystem = system;
    if (directives) finalSystem = system + "\n\n## Directives permanentes :\n" + directives;
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 1000, system: finalSystem, messages,
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ─── DIRECTIVES ─────────────────────────────────────────
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

app.delete("/api/directives", (req, res) => {
  saveDirectives("");
  res.json({ success: true });
});

// ─── RÉSUMÉ + EMAIL ─────────────────────────────────────
app.post("/api/send-summary", async (req, res) => {
  try {
    const { conversation_id, user_email } = req.body;
    if (!conversation_id || !user_email) return res.status(400).json({ error: "Paramètres manquants" });

    const supabase = getSupabase();

    // Récupérer les messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (!msgs || msgs.length === 0) return res.status(400).json({ error: "Conversation vide" });

    // Récupérer le titre
    const { data: conv } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", conversation_id)
      .single();

    const transcript = msgs.map(m =>
      `${m.role === "user" ? "Vous" : "NOVA"}: ${m.content}`
    ).join("\n\n");

    // Générer le résumé avec Claude
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `Tu es NOVA. Un utilisateur souhaite recevoir par email l'essence de sa conversation avec toi.

Voici la conversation :
${transcript}

Rédige un résumé personnel, chaleureux et subtil de cette conversation (10-15 lignes max). 
- Commence par une phrase d'introduction qui rappelle le cœur de ce qui a été exploré
- Mets en valeur les insights les plus profonds qui ont émergé
- Termine par une invitation à continuer ce chemin intérieur
- Écris à la deuxième personne, comme si tu t'adressais directement à la personne
- Ton sobre, profond, sans clichés new age
- En français`
      }]
    });

    const summary = response.content?.[0]?.text || "Résumé indisponible.";

    // Envoyer l'email via Resend
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NOVA <nova@coeurandco.com>",
        to: user_email,
        subject: `✦ L'essence de votre conversation — ${conv?.title || "NOVA"}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#050a0f; color:#e8d8b8; font-family:'Georgia', serif; padding:40px 0; margin:0;">
  <div style="max-width:560px; margin:0 auto; padding:0 24px;">
    
    <div style="text-align:center; margin-bottom:40px;">
      <p style="font-size:20px; color:#c8a050; letter-spacing:8px; margin:0 0 8px;">☽✦☾</p>
      <h1 style="font-size:32px; font-weight:400; letter-spacing:12px; color:#c8a050; margin:0 0 8px;">NOVA</h1>
      <p style="font-size:11px; letter-spacing:4px; color:#706050; margin:0; text-transform:uppercase;">L'essence de votre conversation</p>
    </div>

    <div style="background:rgba(200,160,80,0.05); border:1px solid rgba(200,160,80,0.2); border-radius:16px; padding:32px; margin-bottom:32px;">
      <p style="font-size:11px; letter-spacing:3px; color:#c8a050; margin:0 0 20px; text-transform:uppercase;">✦ Ce qui a émergé</p>
      <div style="font-size:15px; line-height:1.9; color:#d8ccb8; white-space:pre-line;">${summary}</div>
    </div>

    <div style="text-align:center; margin-bottom:40px;">
      <a href="https://nova-agent-mu.vercel.app" style="display:inline-block; background:rgba(200,160,80,0.15); border:1px solid rgba(200,160,80,0.4); border-radius:30px; padding:12px 32px; color:#c8a050; text-decoration:none; font-size:13px; letter-spacing:2px;">Continuer votre voyage ✦</a>
    </div>

    <p style="text-align:center; font-size:11px; color:#3a3030; letter-spacing:1px;">
      Cet email vous a été envoyé depuis NOVA · Agent d'Éveil & de Réalisation de Soi
    </p>
  </div>
</body>
</html>
        `
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.json();
      console.error("Erreur Resend:", err);
      return res.status(500).json({ error: "Erreur envoi email" });
    }

    res.json({ success: true });
  } catch (e) {
    console.error("Erreur send-summary:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── ADMIN ──────────────────────────────────────────────
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
    const { data, error } = await getSupabase()
      .from("conversations").select("*")
      .eq("user_id", req.params.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    res.json({ conversations: data });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/admin/conversation-summary/:convId", requireAdmin, async (req, res) => {
  try {
    const supabase = getSupabase();
    const { data: msgs } = await supabase.from("messages").select("*")
      .eq("conversation_id", req.params.convId).order("created_at", { ascending: true });
    if (!msgs || msgs.length === 0) return res.json({ summary: "Conversation vide." });
    const transcript = msgs.map(m => `${m.role === "user" ? "Utilisateur" : "NOVA"}: ${m.content}`).join("\n");
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514", max_tokens: 300,
      messages: [{ role: "user", content: `Résume en 3-4 phrases cette conversation :\n\n${transcript}` }]
    });
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

app.listen(PORT, () => console.log(`Serveur NOVA actif sur http://localhost:${PORT}`));
