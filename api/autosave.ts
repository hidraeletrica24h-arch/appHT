import { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { category, data, filename } = req.body;

  if (!category || !data) {
    return res.status(400).json({ error: "Category and data are required" });
  }

  const categories = [
    "clientes", "orcamentos", "servicos", "servicos_eletricos",
    "servicos_hidraulicos", "materiais", "materiais_hidraulicos",
    "pacotes_servicos", "outros_servicos", "relatorios", "configuracoes"
  ];

  if (!categories.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  // ATENÇÃO: O Vercel File System é Read-Only (somente leitura), exceto a pasta /tmp
  // Portanto, para a função não quebrar na Vercel, o autosave gravará num arquivo temporário
  // No entanto, esses dados NÃO serão persistidos permanentemente entre as chamadas da API.
  const baseDataDir = '/tmp/autosave';

  if (!fs.existsSync(baseDataDir)) {
    try {
      fs.mkdirSync(baseDataDir, { recursive: true });
    } catch (e) {
      console.error("Could not create /tmp/autosave");
    }
  }

  const targetDir = path.join(baseDataDir, category);
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {
      console.error("Could not create category dir in /tmp");
    }
  }

  const saveFilename = filename || `data_${Date.now()}.json`;
  const filePath = path.join(targetDir, saveFilename);

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`[AutoSave Vercel] Saved ${category}/${saveFilename} to temporary storage`);
    res.status(200).json({ success: true, path: filePath, note: "Saved to /tmp. Data will not persist permanently on Vercel." });
  } catch (err) {
    console.error(`[AutoSave Vercel] Error saving ${category}:`, err);
    res.status(500).json({ error: "Failed to save data" });
  }
}
