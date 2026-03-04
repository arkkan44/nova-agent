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

const loadDirectives = () => {
  try {
    if (fs.existsSync(DIRECTIVES_FILE)) return fs.readFileSync(DIRECTIVES_FILE, "utf8").trim();
  } catch (e) {}
  return "";
};

const saveDirectives = (directives) => {
  try { fs.writeFileSync(DIRECTIVES_FILE, directives, "utf8"); } catch (e) {}
};

// Middleware admin
const requireAdmin = (req, res, next) => {
  const code = req.headers["x-admin-code"];
  if (code !== ADMIN_CODE) return res.status(401).json({ error: "Non autorisé" });
  next();
};

// Route chat
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
    console.error("Erreur API:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Routes directives
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

// ─── ROUTES ADMIN ───────────────────────────────────────

// Vérifier le code admin
app.post("/api/admin/auth", (req, res) => {
  const { code } = req.body;
  if (code === ADMIN_CODE) res.json({ success: true });
  else res.status(401).json({ error: "Code incorrect" });
});

// Liste des utilisateurs
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    const { data, error } = await supabase.from("admin_users").select("*");
    if (error) throw error;
    res.json({ users: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Passer un user en premium
app.post("/api/admin/set-premium", requireAdmin, async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { user_id, plan } = req.body;
    const { error } = await supabase.from("subscriptions").update({ plan }).eq("user_id", user_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Conversations d'un utilisateur
app.get("/api/admin/user-conversations/:userId", requireAdmin, async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", req.params.userId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    res.json({ conversations: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Résumé d'une conversation via Claude
app.get("/api/admin/conversation-summary/:convId", requireAdmin, async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", req.params.convId)
      .order("created_at", { ascending: true });

    if (!msgs || msgs.length === 0) return res.json({ summary: "Conversation vide." });

    const transcript = msgs.map(m => `${m.role === "user" ? "Utilisateur" : "NOVA"}: ${m.content}`).join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [{
        role: "user",
        content: `Fais un résumé très court (3-4 phrases max) de cette conversation entre un utilisateur et NOVA :\n\n${transcript}`
      }]
    });
    const summary = response.content?.[0]?.text || "Résumé indisponible.";
    res.json({ summary, messages: msgs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stats globales
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { count: totalUsers } = await supabase.from("subscriptions").select("*", { count: "exact", head: true });
    const { count: premiumUsers } = await supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("plan", "premium");
    const today = new Date().toISOString().split("T")[0];
    const { data: todayMsgs } = await supabase.from("subscriptions").select("messages_today").eq("last_reset", today);
    const totalToday = todayMsgs?.reduce((sum, s) => sum + (s.messages_today || 0), 0) || 0;
    res.json({ totalUsers, premiumUsers, totalToday });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Serveur NOVA actif sur http://localhost:${PORT}`));
