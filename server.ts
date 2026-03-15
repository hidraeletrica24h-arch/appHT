import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Ensure data directories exist
  const baseDataDir = path.join(__dirname, "data", "autosave");
  const categories = [
    "clientes",
    "orcamentos",
    "servicos",
    "servicos_eletricos",
    "servicos_hidraulicos",
    "materiais",
    "materiais_hidraulicos",
    "pacotes_servicos",
    "outros_servicos",
    "relatorios",
    "configuracoes"
  ];

  if (!fs.existsSync(baseDataDir)) {
    fs.mkdirSync(baseDataDir, { recursive: true });
  }

  categories.forEach(cat => {
    const dir = path.join(baseDataDir, cat);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      // Create .gitkeep
      fs.writeFileSync(path.join(dir, ".gitkeep"), `# Auto-save for ${cat}\n`);
    }
  });

  // API Route for Auto-save
  app.post("/api/autosave", (req, res) => {
    const { category, data, filename } = req.body;

    if (!category || !data) {
      return res.status(400).json({ error: "Category and data are required" });
    }

    if (!categories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const targetDir = path.join(baseDataDir, category);
    const saveFilename = filename || `data_${Date.now()}.json`;
    const filePath = path.join(targetDir, saveFilename);

    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[AutoSave] Saved ${category}/${saveFilename}`);
      res.json({ success: true, path: filePath });
    } catch (err) {
      console.error(`[AutoSave] Error saving ${category}:`, err);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
