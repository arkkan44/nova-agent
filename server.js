const express = require("express");
const cors = require("cors");
const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;
const DIRECTIVES_FILE = path.join(__dirname, "directives.txt");

app.use(cors({ origin: "*" }));
app.use(express.json());

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Lire les directives sauvegardées
const loadDirectives = () => {
  try {
    if (fs.existsSync(DIRECTIVES_FILE)) {
      return fs.readFileSync(DIRECTIVES_FILE, "utf8").trim();
    }
  } catch (e) {
    console.error("Erreur lecture directives:", e.message);
  }
  return "";
};

// Sauvegarder les directives
const saveDirectives = (directives) => {
  try {
    fs.writeFileSync(DIRECTIVES_FILE, directives, "utf8");
  } catch (e) {
    console.error("Erreur sauvegarde directives:", e.message);
  }
};

// Route chat principal
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages invalides" });
    }
    const directives = loadDirectives();
    let finalSystem = system;
    if (directives) {
      finalSystem = system + "\n\n## Directives permanentes (prioritaires) :\n" + directives;
    }
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: finalSystem,
      messages,
    });
    res.json(response);
  } catch (error) {
    console.error("Erreur API Anthropic:", error.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Route pour lire les directives
app.get("/api/directives", (req, res) => {
  const directives = loadDirectives();
  res.json({ directives });
});

// Route pour ajouter une directive
app.post("/api/directives/add", (req, res) => {
  try {
    const { directive } = req.body;
    if (!directive) return res.status(400).json({ error: "Directive manquante" });
    const current = loadDirectives();
    const updated = current ? current + "\n- " + directive : "- " + directive;
    saveDirectives(updated);
    res.json({ success: true, directives: updated });
  } catch (e) {
    console.error("Erreur ajout directive:", e.message);
    res.status(500).json({ error: "Erreur sauvegarde" });
  }
});

// Route pour effacer une directive précise
app.post("/api/directives/remove", (req, res) => {
  try {
    const { directive } = req.body;
    if (!directive) return res.status(400).json({ error: "Directive manquante" });
    const current = loadDirectives();
    const lines = current.split("\n").filter(line => !line.includes(directive));
    saveDirectives(lines.join("\n").trim());
    res.json({ success: true });
  } catch (e) {
    console.error("Erreur suppression directive:", e.message);
    res.status(500).json({ error: "Erreur suppression" });
  }
});

// Route pour effacer toutes les directives
app.delete("/api/directives", (req, res) => {
  try {
    saveDirectives("");
    res.json({ success: true });
  } catch (e) {
    console.error("Erreur effacement directives:", e.message);
    res.status(500).json({ error: "Erreur effacement" });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur NOVA actif sur http://localhost:${PORT}`);
});
