const BOT_VERSION = '1.0.1-skygrid-tech-bot-avatar';
const DEFAULT_BOT_AVATAR_URL = 'https://avatars.githubusercontent.com/u/130760115?v=4';

const SKYGRID_CONTEXT = `
You are the SKYGRID / Aura-Core tech bot for people landing on skygrid-protocol.net.
Speak clearly, practically, and confidently.

Core explanation:
SKYGRID is an MVPuknowme / Aura-Core emergency data on-ramp for peer-to-peer infrastructure.
It helps validate, route, and protect emergency, outage, responder, system-health, and continuity data.

Current architecture:
- Public site/domain: skygrid-protocol.net
- Vercel: API/runtime/on-ramp layer
- Main runtime pattern: Vercel Node runtime routes, not a standard Next.js App Router app
- AWS: protected backend only, accessed server-side
- Postman: validation gate / smoke-test authority
- Airtable: project/report tracking
- Web3/Base: proof/payment-reference layer only, not live wallet custody

Important safety posture:
- This site is not a certified emergency dispatch service.
- Do not ask visitors for private medical details, wallet private keys, seed phrases, passwords, or credentials.
- If someone says they are in immediate danger or experiencing a real emergency, tell them to call local emergency services immediately.

Recommended concise answer:
SKYGRID is a validation-first emergency data on-ramp. It connects public entry points to protected backend systems through tested runtime gates, so emergency and continuity data can move safely without exposing the core network.
`;

function botAvatarUrl() {
  return process.env.SKYGRID_BOT_AVATAR_URL || DEFAULT_BOT_AVATAR_URL;
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Bot', BOT_VERSION);
  res.end(JSON.stringify(body, null, 2));
}

function sendChatPage(res) {
  const avatarUrl = botAvatarUrl();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Bot', BOT_VERSION);
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ask SKYGRID</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top, #1e3a8a 0, #0f172a 42%, #020617 100%); color: #e5eefc; }
    main { max-width: 920px; margin: 0 auto; padding: 48px 20px; }
    .card { border: 1px solid rgba(148, 163, 184, .28); border-radius: 24px; padding: 24px; background: rgba(15, 23, 42, .78); box-shadow: 0 24px 80px rgba(0,0,0,.28); }
    .bot-head { display: flex; gap: 16px; align-items: center; margin-bottom: 10px; }
    .avatar { width: 74px; height: 74px; border-radius: 999px; object-fit: cover; border: 3px solid rgba(125, 211, 252, .85); box-shadow: 0 0 28px rgba(56, 189, 248, .38); background: rgba(2, 6, 23, .8); }
    h1 { margin: 0 0 6px; font-size: clamp(2rem, 5vw, 3.4rem); letter-spacing: -0.05em; }
    p { color: #bfd3f7; line-height: 1.6; }
    .log { display: grid; gap: 12px; margin: 22px 0; }
    .row { display: flex; gap: 10px; align-items: flex-start; }
    .row.user-row { justify-content: flex-end; }
    .mini-avatar { width: 36px; height: 36px; border-radius: 999px; object-fit: cover; border: 2px solid rgba(125, 211, 252, .72); flex: 0 0 auto; }
    .bubble { padding: 14px 16px; border-radius: 18px; border: 1px solid rgba(148, 163, 184, .20); background: rgba(30, 41, 59, .76); white-space: pre-wrap; line-height: 1.55; max-width: 760px; }
    .user { background: rgba(14, 165, 233, .18); }
    form { display: flex; gap: 10px; align-items: stretch; }
    input { flex: 1; border-radius: 16px; border: 1px solid rgba(148, 163, 184, .32); background: rgba(2, 6, 23, .74); color: #e5eefc; padding: 14px 16px; font: inherit; }
    button { border: 0; border-radius: 16px; background: #38bdf8; color: #031524; font-weight: 800; padding: 0 18px; cursor: pointer; }
    .hint { font-size: .92rem; color: #93a8c7; }
    a { color: #7dd3fc; }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <div class="bot-head">
        <img class="avatar" src="${avatarUrl}" alt="SKYGRID tech bot avatar" />
        <div>
          <h1>Ask SKYGRID</h1>
          <p>Ask what SKYGRID does, how the emergency data on-ramp works, what Vercel/Postman/AWS do, or how the P2P proof layer fits in.</p>
        </div>
      </div>
      <div id="log" class="log">
        <div class="row">
          <img class="mini-avatar" src="${avatarUrl}" alt="SKYGRID tech bot avatar" />
          <div class="bubble">Hi — I’m the SKYGRID tech bot. I can explain the MVPuknowme emergency data on-ramp, validation flow, and runtime architecture.</div>
        </div>
      </div>
      <form id="chatForm">
        <input id="message" autocomplete="off" placeholder="Ask: What does SKYGRID do?" />
        <button type="submit">Ask</button>
      </form>
      <p class="hint">Safety note: this bot is informational. For immediate emergencies, call local emergency services.</p>
    </section>
  </main>
  <script>
    const avatarUrl = ${JSON.stringify(avatarUrl)};
    const form = document.getElementById('chatForm');
    const input = document.getElementById('message');
    const log = document.getElementById('log');

    function addBotBubble(text) {
      const row = document.createElement('div');
      row.className = 'row';
      const img = document.createElement('img');
      img.className = 'mini-avatar';
      img.src = avatarUrl;
      img.alt = 'SKYGRID tech bot avatar';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = text;
      row.appendChild(img);
      row.appendChild(bubble);
      log.appendChild(row);
      row.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return bubble;
    }

    function addUserBubble(text) {
      const row = document.createElement('div');
      row.className = 'row user-row';
      const bubble = document.createElement('div');
      bubble.className = 'bubble user';
      bubble.textContent = text;
      row.appendChild(bubble);
      log.appendChild(row);
      row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = input.value.trim();
      if (!message) return;
      input.value = '';
      addUserBubble(message);
      const pending = addBotBubble('Thinking...');
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });
        const data = await response.json();
        pending.textContent = data.answer || 'I could not answer that yet.';
      } catch (error) {
        pending.textContent = 'The tech bot is reachable, but the chat request failed. Try /api/health or /api/status to verify the runtime.';
      }
    });
  </script>
</body>
</html>`);
}

async function readJsonBody(req, limitBytes = 12000) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch { reject(Object.assign(new Error('Malformed JSON'), { statusCode: 400 })); }
    });
    req.on('error', reject);
  });
}

function fallbackAnswer(message) {
  const text = String(message || '').toLowerCase();

  if (text.includes('emergency') || text.includes('on-ramp') || text.includes('on ramp')) {
    return 'SKYGRID is an Emergency Data On-Ramp for P2P infrastructure. It gives emergency, outage, responder, system-health, and continuity data a validated path from public entry points into protected backend systems without exposing the core network.';
  }

  if (text.includes('p2p') || text.includes('peer')) {
    return 'The P2P side of SKYGRID is about distributed infrastructure readiness: local nodes, validation paths, and continuity routing. Web3/Base is used as a proof or payment-reference layer, not as live wallet custody or a replacement for emergency services.';
  }

  if (text.includes('vercel') || text.includes('runtime')) {
    return 'Vercel is the SKYGRID runtime/on-ramp layer. It receives public/API requests, runs the Node runtime dispatcher, validates routes, and relays only safe server-side requests toward protected backend systems.';
  }

  if (text.includes('aws')) {
    return 'AWS is kept private behind the Vercel runtime. SKYGRID should not expose AWS backend URLs, secrets, or credentials publicly. Vercel acts as the controlled relay and validation layer.';
  }

  if (text.includes('postman')) {
    return 'Postman is the validation gate. A green Postman run means the public site, runtime health, status, intake, sandbox ingest, and safety checks are passing the SKYGRID route contract.';
  }

  if (text.includes('who') || text.includes('mvp') || text.includes('mvpuknowme')) {
    return 'MVPuknowme is the creator/operator identity behind this SKYGRID / Aura-Core build. The system is being shaped as a validation-first emergency data on-ramp for P2P infrastructure.';
  }

  if (text.includes('price') || text.includes('cost') || text.includes('revenue') || text.includes('earn')) {
    return 'SKYGRID is being positioned around infrastructure value: validation, continuity routing, emergency-data intake, partner integrations, and proof/payment-reference services. Exact pricing should be handled through an operator quote or partner agreement.';
  }

  return 'SKYGRID is a validation-first emergency data on-ramp for P2P infrastructure. The simple version: public users or systems enter data through a safe web/API layer, Vercel validates and routes it, AWS stays protected, Postman proves the contract works, Airtable tracks reports, and Web3/Base can provide proof or payment references.';
}

function extractResponseText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.text) parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function answerWithOpenAI(message) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      max_output_tokens: 500,
      input: [
        { role: 'system', content: SKYGRID_CONTEXT },
        { role: 'user', content: String(message).slice(0, 1200) }
      ]
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  return extractResponseText(data) || null;
}

export default async function handler(req, res) {
  if (req.method === 'GET') return sendChatPage(res);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { ok: false, status: 'method_not_allowed', expected: 'GET or POST' });
  }

  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('application/json')) {
    return sendJson(res, 400, { ok: false, status: 'invalid_content_type', expectedContentType: 'application/json' });
  }

  try {
    const body = await readJsonBody(req);
    const message = String(body.message || '').trim();
    if (!message) return sendJson(res, 400, { ok: false, status: 'missing_message' });

    let answer = null;
    let source = 'fallback';
    try {
      answer = await answerWithOpenAI(message);
      if (answer) source = 'openai';
    } catch {
      answer = null;
    }

    if (!answer) answer = fallbackAnswer(message);

    return sendJson(res, 200, {
      ok: true,
      service: 'SKYGRID Tech Bot',
      source,
      answer,
      avatarUrl: botAvatarUrl(),
      version: BOT_VERSION,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { ok: false, status: 'chat_error', message: 'Unable to process chat request safely.' });
  }
}
