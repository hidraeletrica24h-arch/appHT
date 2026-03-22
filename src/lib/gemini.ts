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

export async function processVoiceCommand(transcript: string, context: 'client' | 'service' | 'material' | 'package' | 'budget'): Promise<any> {
  const config = db.getConfig();
  const apiKey = config.geminiApiKey || 'AIzaSyAdIL15Br_qY88uWlgQ4oac61dWAV6Zm5U';

  if (!apiKey) {
    throw new Error('Chave da API do Gemini não configurada.');
  }

  let prompt = '';

  if (context === 'budget') {
    prompt = `Você é um orçamentista profissional especialista em serviços elétricos e hidráulicos da região de Alvorada/RS.
O cliente enviou um comando de voz: "${transcript}"
Sua tarefa: Monte uma lista de itens necessários para esse orçamento.
- Estime o preço base no mercado de Alvorada/RS. Valores justos.
- O campo "type" deve ser estritamente "service" (mão de obra) ou "material" (materiais).
- O campo "category" deve ser obrigatoriamente "eletrico" ou "hidraulico".
Emita APENAS O JSON, sem blocos markdown:
{ "items": [ { "name": "Nome", "type": "service", "category": "eletrico", "quantity": 1, "unitPrice": 150.00 } ] }`;
  }
  
  else if (context === 'client') {
    prompt = `Você é uma IA de cadastro de clientes. Transforme o comando de voz no formato JSON.
Comando: "${transcript}"
- Tente extrair informações como nome, telefone, documento (CPF/CNPJ), cidade e endereço.
- Se a cidade não for mencionada, coloque "Alvorada".
- Deixe vazio ("") o que não foi mencionado.
Emita APENAS O JSON, sem blocos markdown:
{ "name": "Nome", "phone": "Telefone", "document": "CPF", "address": "Endereço", "city": "Alvorada", "observations": "Detalhes" }`;
  }

  else if (context === 'service') {
    prompt = `Você é uma IA de cadastro de serviços de mão de obra elétrica/hidráulica em Alvorada/RS.
Comando: "${transcript}"
- Crie um título profissional para o serviço. Ex: "Instalação de Tomada 220v".
- Defina se é da "category": "eletrico" ou "hidraulico".
- Defina um "basePrice" numérico realista para a região.
Emita APENAS O JSON, sem blocos markdown:
{ "name": "Nome", "category": "eletrico", "basePrice": 80.00 }`;
  }

  else if (context === 'material') {
    prompt = `Você é uma IA de cadastro de materiais elétricos/hidráulicos em Alvorada/RS.
Comando: "${transcript}"
- Crie um nome profissional para o material.
- Defina "category": "eletrico" ou "hidraulico".
- Sugira o "price" de mercado numérico.
- Identifique a unidade correta "unit" (ex: "un", "m", "kg", "cx", "rl"). Padrão é "un".
Emita APENAS O JSON, sem blocos markdown:
{ "name": "Nome", "category": "eletrico", "price": 15.50, "unit": "un" }`;
  }

  else if (context === 'package') {
    prompt = `Você é uma IA de criação de pacotes/combos de serviços em Alvorada/RS.
Comando: "${transcript}"
- Crie um "name" para o pacote.
- Defina "category": "eletrico" ou "hidraulico".
- Estabeleça um "price" total fechado.
- Crie um array "items" (strings) listando 3 a 5 itens e vantagens do pacote para o cliente.
Emita APENAS O JSON, sem blocos markdown:
{ "name": "Nome", "category": "eletrico", "price": 500.00, "items": ["Item 1", "Item 2"] }`;
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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
    return JSON.parse(textResult);
  } catch (error) {
    console.error("AI Response Parsing Error:", data);
    throw new Error('A resposta gerada pela IA não pôde ser lida.');
  }
}
