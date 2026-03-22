import { db } from '../db';

export interface GeminiBudgetResponse {
  items: Array<{
    name: string;
    type: 'service' | 'material';
    category: 'eletrico' | 'hidraulico';
    quantity: number;
    unitPrice: number;
  }>;
}

export async function processVoiceBudget(transcript: string): Promise<GeminiBudgetResponse> {
  const config = db.getConfig();
  // Usa a chave configurada pelo usuário, mas com um fallback para a chave fornecida na sessão.
  const apiKey = config.geminiApiKey || 'AIzaSyC5zlHuDBDIxA6KrlFY7hhVieuxp2mNJAw';

  if (!apiKey) {
    throw new Error('Chave da API do Gemini não configurada.');
  }

  const prompt = `Você é um orçamentista profissional especialista em serviços elétricos e hidráulicos trabalhando na região de Alvorada/RS.
  
O cliente enviou um comando de voz, que foi transcrito para texto:
"${transcript}"

Sua tarefa:
Analise o pedido e monte uma lista de itens necessários para esse orçamento.
- Estime o preço de mão de obra e materiais com base no mercado real/regional de Alvorada/RS (em reais). Valores justos.
- O campo "type" deve ser estritamente "service" para mão de obra ou "material" para materiais.
- O campo "category" deve ser obrigatoriamente "eletrico" ou "hidraulico", dependendo da natureza do item.
- Retorne APENAS um JSON válido seguindo exatamente esta estrutura, sem absolutamente nenhum texto extra:
{
  "items": [
    { "name": "Nome do Serviço", "type": "service", "category": "eletrico", "quantity": 1, "unitPrice": 150.00 }
  ]
}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
    })
  });

  if (!response.ok) {
    throw new Error('Erro ao se comunicar com a inteligência artificial do Gemini.');
  }

  const data = await response.json();
  try {
    const textResult = data.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(textResult);
    return parsed as GeminiBudgetResponse;
  } catch (error) {
    console.error("AI Response Parsing Error:", data);
    throw new Error('A resposta gerada pela IA não pôde ser lida.');
  }
}
