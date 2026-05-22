const VERSION = '1.3.4-public-interface';

function htmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sendHtml(res, body) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Interface', VERSION);
  res.end(body);
}

const ROUTES = [
  ['Runtime Health', '/health.json', 'operational', 'Read-only runtime proof.'],
  ['Interface Manifest', '/api/interface', 'operational', 'Machine-readable B12/Postman map.'],
  ['Highway Status', '/api/highway/status', 'operational', 'Four-lane bridge status.'],
  ['AI Preflight', '/api/ai/preflight', 'advisory', 'Decision support only.'],
  ['Intake', '/api/intake', 'operational', 'B12 partner/intake receiver.'],
  ['Sun-Pay Quote', '/api/pay/quote?amount=25', 'quote_only', 'No funds move.'],
  ['Stripe Device Link', '/api/stripe/device-link', 'staged', 'No entitlement activation.'],
  ['Base Rate Bands', '/rates', 'operational', 'Public rate band page.'],
  ['Dispatcher Demo', '/dispatch', 'demo', 'No OS-level switching.'],
  ['Scenarios', '/scenarios', 'demo', 'Simulation page.']
];

function render() {
  const cards = ROUTES.map(([label, path, state, note]) => `
    <article class="card">
      <span>${htmlEscape(state)}</span>
      <h2>${htmlEscape(label)}</h2>
      <p>${htmlEscape(note)}</p>
      <a href="${htmlEscape(path)}">${htmlEscape(path)}</a>
    </article>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SkyGrid Public Interface</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 18% 8%, rgba(109,234,255,.25), transparent 34%), radial-gradient(circle at 90% 18%, rgba(155,124,255,.18), transparent 32%), linear-gradient(135deg, #06101f, #120d2b); color: #f7fbff; }
    main { width: min(1080px, calc(100% - 32px)); margin: 0 auto; padding: 56px 0; }
    nav { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 36px; }
    nav a, .btn { display: inline-flex; padding: 11px 14px; border-radius: 14px; border: 1px solid rgba(255,255,255,.18); color: #f7fbff; text-decoration: none; font-weight: 800; }
    .btn.primary { color: #06101f; background: linear-gradient(135deg, #6deaff, #9b7cff); border: none; }
    .pill { display: inline-flex; border: 1px solid rgba(124,255,199,.38); background: rgba(124,255,199,.08); color: #7cffc7; border-radius: 999px; padding: 8px 12px; font-weight: 800; }
    h1 { font-size: clamp(2.2rem, 7vw, 5.4rem); letter-spacing: -.06em; line-height: .95; margin: 22px 0; }
    h1 span { color: #6deaff; }
    p { max-width: 76ch; color: #b8c7d9; font-size: 1.08rem; line-height: 1.7; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin: 28px 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-top: 30px; }
    .card { padding: 18px; border-radius: 20px; background: rgba(2,6,23,.58); border: 1px solid rgba(255,255,255,.14); }
    .card span { color: #7cffc7; font-size: .78rem; font-weight: 900; text-transform: uppercase; letter-spacing: .09em; }
    .card h2 { margin: 10px 0 8px; }
    .card a { color: #6deaff; word-break: break-word; }
  </style>
</head>
<body>
  <main>
    <nav>
      <a href="/">Home</a>
      <a href="/highway">Highway</a>
      <a href="/api/interface">Interface JSON</a>
      <a href="/health.json">Health</a>
    </nav>
    <span class="pill">Public interface · advisory-safe</span>
    <h1><span>SkyGrid</span> interface map</h1>
    <p>This page maps the public Aura-Core/SkyGrid runtime contract for B12, Postman, Codex, and operator review. Routes are marked operational, advisory, quote-only, staged, or demo. Public routes do not move money, sign transactions, activate devices, or perform automatic OS-level network switching.</p>
    <div class="actions">
      <a class="btn primary" href="/api/interface">Open Interface JSON</a>
      <a class="btn" href="/api/ai/preflight">Run AI Preflight</a>
      <a class="btn" href="/api/intake">Open Intake Contract</a>
    </div>
    <section class="grid">${cards}</section>
  </main>
</body>
</html>`;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }
  return sendHtml(res, render());
}
