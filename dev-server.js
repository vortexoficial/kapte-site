/* eslint-disable no-console */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;

const KNOWLEDGE_FILE = process.env.KAPTA_CHAT_KNOWLEDGE_FILE || 'chat-knowledge.md';
const MAX_CONTEXT_CHARS = Number(process.env.KAPTA_CHAT_MAX_CONTEXT_CHARS || 12000);
const MAX_TOKENS = Number(process.env.KAPTA_CHAT_MAX_TOKENS || 160);
const WHATSAPP_NUMBER = process.env.KAPTA_WHATSAPP || '5513997668787';
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;

const warnedModels = new Set();

function normalizeGroqModel(requestedModel) {
  const fallbackDefault = 'llama-3.1-8b-instant';
  const model = String(requestedModel || '').trim();
  if (!model) return { model: fallbackDefault, normalizedFrom: '' };

  // Mapeia modelos antigos/descontinuados para um modelo suportado.
  // Isso evita tentar o modelo inválido em TODA requisição (spam de log + latência).
  const deprecatedToSupported = {
    'llama3-8b-8192': fallbackDefault,
    'llama3-70b-8192': fallbackDefault,
  };

  const mapped = deprecatedToSupported[model];
  if (mapped) return { model: mapped, normalizedFrom: model };
  return { model, normalizedFrom: '' };
}

function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readOptionalTextFile(relativePath) {
  try {
    const fullPath = path.join(ROOT_DIR, relativePath);
    if (!fs.existsSync(fullPath)) return '';
    if (fs.statSync(fullPath).isDirectory()) return '';
    return fs.readFileSync(fullPath, 'utf8');
  } catch (_) {
    return '';
  }
}

function stripHtmlToText(html) {
  let out = String(html || '');
  out = out.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
  out = out.replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  out = out.replace(/<[^>]+>/g, ' ');

  // Decodificações simples
  out = out
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#039;', "'");

  // Normaliza espaços
  out = out.replace(/\s+/g, ' ').trim();
  return out;
}

function buildChatContext() {
  const indexHtml = readOptionalTextFile('index.html');
  const privHtml = readOptionalTextFile('privacidade.html');
  const termosHtml = readOptionalTextFile('termos.html');

  const siteText = stripHtmlToText([indexHtml, privHtml, termosHtml].filter(Boolean).join('\n\n'));
  const knowledgeText = readOptionalTextFile(KNOWLEDGE_FILE);

  const merged = [
    knowledgeText ? `\n\n# Conhecimento adicional\n${knowledgeText}` : '',
    siteText ? `\n\n# Conteúdo do site\n${siteText}` : '',
  ].join('');

  const normalized = merged.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.slice(0, MAX_CONTEXT_CHARS);
}

function normalizeForIntent(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function shouldRouteToWhatsApp(message) {
  const text = normalizeForIntent(message);
  if (!text) return false;

  // Encaminha quando o atendimento passa do básico (diagnóstico/estratégia/orçamento/contratação etc.).
  return (
    text.includes('diagnostico') ||
    text.includes('avaliacao') ||
    text.includes('analise') ||
    text.includes('consultoria') ||
    text.includes('auditoria') ||
    text.includes('mentoria') ||
    text.includes('proposta') ||
    text.includes('briefing') ||
    text.includes('reuniao') ||
    text.includes('call') ||
    text.includes('agendar') ||
    text.includes('orcamento') ||
    text.includes('preco') ||
    text.includes('quanto custa') ||
    text.includes('valor') ||
    text.includes('contratar') ||
    text.includes('fechar com') ||
    text.includes('campanha') ||
    text.includes('gestao') ||
    text.includes('meu instagram') ||
    text.includes('meu perfil') ||
    text.includes('meu negocio')
  );
}

function buildWhatsAppRoutingReply() {
  return (
    `Por aqui eu consigo só tirar dúvidas rápidas. Pra atendimento completo, chama a Kapte Mídia no WhatsApp: ${WHATSAPP_NUMBER} (${WHATSAPP_LINK}).\n` +
    'Quer que eu te encaminhe pra lá agora?'
  );
}

function sanitizeAssistantReply(text, maxChars) {
  let out = String(text || '').trim();

  // Remove formatações comuns de Markdown que aparecem como ?asteriscosó no chat.
  out = out.replaceAll('**', '');
  out = out.replaceAll('__', '');
  out = out.replaceAll('`', '');
  out = out.replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)'); // links do tipo [texto](url)
  out = out.replace(/\s+\n/g, '\n');
  out = out.replace(/\n{3,}/g, '\n\n');
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = out.trim();

  // Limita tamanho (evita textão mesmo se o modelo extrapolar)
  const limit = Number.isFinite(Number(maxChars)) ? Math.max(220, Math.min(900, Math.trunc(Number(maxChars)))) : 420;
  if (out.length > limit) {
    let sliced = out.slice(0, limit).trim();
    const lastPunct = Math.max(sliced.lastIndexOf('.'), sliced.lastIndexOf('!'), sliced.lastIndexOf('?'));
    if (lastPunct >= Math.max(40, sliced.length - 80)) sliced = sliced.slice(0, lastPunct + 1).trim();
    else {
      const lastSpace = sliced.lastIndexOf(' ');
      if (lastSpace > 40) sliced = sliced.slice(0, lastSpace).trim();
    }
    sliced = sliced.replace(/[\s,.!?:;]+$/g, '').trim();
    out = sliced + '?';
  }

  return out;
}

function enforceTwoSentencesPlusQuestion(text) {
  let out = sanitizeAssistantReply(text, 420);
  if (!out) return out;

  // Normaliza quebras
  out = out.replace(/\s*\n\s*/g, ' ').trim();

  // Divide em sentenças de forma simples
  const parts = out
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const questionCandidate = [...parts].reverse().find((p) => p.includes('?')) || '';
  const contentCandidates = parts
    .map((p) => (p.includes('?') ? p.replace(/\?+/g, '.').trim() : p))
    .map((p) => p.replace(/\.+$/g, '.').trim())
    .filter(Boolean);

  // Pega as 2 primeiras sentenças conteúdo (curtas)
  const kept = [];
  for (const p of contentCandidates) {
    if (kept.length >= 2) break;
    // Evita sentenças muito grandes
    const trimmed = p.length > 200 ? p.slice(0, 200).replace(/[\s,.!?:;]+$/g, '') + '?' : p;
    kept.push(trimmed);
  }

  const fallbackQuestion = 'O que você quer resolver hoje: contato, dica rápida ou falar no WhatsApp?';
  let question = questionCandidate ? sanitizeAssistantReply(questionCandidate, 260) : '';
  question = question.replace(/\s+/g, ' ').trim();
  if (question && !question.endsWith('?')) question = question.replace(/[.!]+$/g, '').trim() + '?';
  if (!question) question = fallbackQuestion;
  if (question.length > 180) question = question.slice(0, 180).replace(/[\s,.!?:;]+$/g, '') + '?';

  if (!kept.length) kept.push('Certo.');

  const joined = kept.join(' ');
  const final = `${joined} ${question}`.replace(/\s+/g, ' ').trim();
  return sanitizeAssistantReply(final, 420);
}

function coerceIncomingMessages(body) {
  const raw = body && body.messages;
  if (!Array.isArray(raw)) return [];

  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role;
    const content = typeof item.content === 'string' ? item.content.trim() : '';
    if (!content) continue;
    if (role !== 'user' && role !== 'assistant') continue;
    out.push({ role, content: content.slice(0, 1200) });
  }

  // Mantém só um histórico curto.
  return out.slice(-12);
}

function getLastUserMessage(messages, fallbackMessage) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && messages[i].content) return messages[i].content;
  }
  return typeof fallbackMessage === 'string' ? fallbackMessage.trim() : '';
}

async function handleChat(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  const { model, normalizedFrom } = normalizeGroqModel(process.env.GROQ_MODEL);
  const baseSystemPrompt =
    process.env.GROQ_SYSTEM_PROMPT ||
    'Você é o atendente virtual (balconista) do site da Kapte Mídia. Fale em pt-BR, de forma bem humana, curta e direta.';

  if (normalizedFrom && !warnedModels.has(normalizedFrom)) {
    warnedModels.add(normalizedFrom);
    console.warn(
      `Modelo Groq '${normalizedFrom}' está descontinuado. Usando '${model}' como padrão. Atualize GROQ_MODEL no .env para remover este aviso.`
    );
  }

  const context = buildChatContext();
  const systemPrompt = [
    baseSystemPrompt,
    'Regras (balconista):',
    '- Seu papel aqui ?: (1) ajudar o visitante a entrar em contato e (2) dar 1 dica/insight curto.',
    `- Se o assunto pedir atendimento além do básico (diagnóstico, análise, estratégia, proposta, orçamento, contratação), encaminhe para o WhatsApp ${WHATSAPP_NUMBER} (${WHATSAPP_LINK}) e não aprofunde.`,
    '- Tom: conversacional, como gente de verdade (sem formalidade, sem termos técnicos).',
    '- Formato obrigatório: no máximo 2 frases de resposta + 1 pergunta no final (sempre).',
    '- Se faltar contexto, use a pergunta final para entender o que a pessoa quer.',
    '- Não use listas longas, nem passo a passo (a menos que o usuário peça explicitamente).',
    '- Não use Markdown (nada de **asteriscos**, _, ou `código`).',
    '- Não invente preços, resultados garantidos, prazos fixos ou cases que não estejam no contexto.',
    '- Você não assiste vídeos diretamente. Se perguntarem sobre vídeos, responda com base no contexto; se não tiver, peça o assunto do vídeo.',
    context ? `\n\nContexto (site + base de conhecimento):\n${context}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (!apiKey) {
    // Fallback: mantém o chat útil mesmo sem chave configurada.
    sendJson(res, 200, {
      reply: enforceTwoSentencesPlusQuestion(
        `No momento o chat automático ainda não está configurado. Pra atendimento completo, chama a Kapte Mídia no WhatsApp: ${WHATSAPP_NUMBER} (${WHATSAPP_LINK}). Quer que eu te encaminhe pra lá agora?`
      ),
    });
    return;
  }

  const chunks = [];
  let total = 0;
  req.on('data', (chunk) => {
    total += chunk.length;
    if (total > 100 * 1024) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', async () => {
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch (e) {
      sendJson(res, 400, { error: 'JSON inválido.' });
      return;
    }

    const incomingMessages = coerceIncomingMessages(body);
    const fallbackUserMessage = typeof body.message === 'string' ? body.message.trim() : '';
    const userMessage = getLastUserMessage(incomingMessages, fallbackUserMessage);
    if (!userMessage) {
      sendJson(res, 400, { error: 'Envie "message" (string) ou "messages" (array com histórico).' });
      return;
    }

    if (shouldRouteToWhatsApp(userMessage)) {
      sendJson(res, 200, { reply: buildWhatsAppRoutingReply() });
      return;
    }

    try {
      async function callGroq(modelId) {
        const finalMessages = [{ role: 'system', content: systemPrompt }];
        if (incomingMessages.length) {
          finalMessages.push(...incomingMessages);
        } else {
          finalMessages.push({ role: 'user', content: userMessage });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            temperature: 0.6,
            max_tokens: MAX_TOKENS,
            messages: finalMessages,
          }),
        });

        const data = await response.json().catch(() => null);
        return { response, data };
      }

      function extractGroqError(data) {
        const msg = data && (data.error?.message || data.error || data.message);
        return typeof msg === 'string' ? msg : '';
      }

      function isModelDeprecated(message) {
        const m = String(message || '').toLowerCase();
        return (
          m.includes('decommissioned') ||
          m.includes('no longer supported') ||
          m.includes('deprecated') ||
          m.includes('model_not_found') ||
          m.includes('not found') ||
          m.includes('does not exist') ||
          m.includes('invalid model') ||
          m.includes('model is not available')
        );
      }

      const fallbackModels = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
      const modelsToTry = [model, ...fallbackModels.filter((m) => m !== model)];

      let lastError = '';
      let data = null;

      for (const modelId of modelsToTry) {
        const { response, data: attemptData } = await callGroq(modelId);
        data = attemptData;

        if (response.ok) {
          break;
        }

        const detail = extractGroqError(attemptData) || `HTTP ${response.status}`;
        lastError = detail;

        // Se o modelo configurado estiver descontinuado, tenta automaticamente os fallbacks.
        if (!isModelDeprecated(detail)) {
          break;
        }

        if (modelId === model && !warnedModels.has(model)) {
          warnedModels.add(model);
          console.warn(`Modelo Groq '${model}' indisponível. Tentando fallback...`);
        }
      }

      if (!data || !data.choices) {
        sendJson(res, 500, {
          error: 'Falha ao chamar Groq.',
          detail: lastError || 'Erro desconhecido do provedor.',
        });
        return;
      }

      const reply = data?.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) {
        sendJson(res, 500, { error: 'Resposta vazia do modelo.' });
        return;
      }

      sendJson(res, 200, { reply: enforceTwoSentencesPlusQuestion(reply) });
    } catch (err) {
      sendJson(res, 500, { error: 'Erro inesperado no servidor.' });
      console.error(err);
    }
  });
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.mp4':
      return 'video/mp4';
    case '.ico':
      return 'image/x-icon';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'application/octet-stream';
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/') pathname = '/index.html';

  const safePath = path.normalize(pathname).replace(/^\\/g, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const contentType = getContentType(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

loadDotEnv();

const port = Number(process.env.PORT || 3000);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/chat') {
    handleChat(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Dev server rodando em http://localhost:${port}`);
  console.log('Chat endpoint: POST /api/chat');
});
