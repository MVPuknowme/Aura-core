import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const publicDir = 'public';
mkdirSync(publicDir, { recursive: true });

const health = {
  ok: true,
  status: 'ok',
  service: 'SkyGrid External Site',
  network: 'skygrid',
  edge: 'cloudflare-pages',
  aws_status: 'external-upstream-functional-per-operator',
  generated_at: new Date().toISOString(),
  routes: ['/', '/health.json', '/node-ledger.html']
};

if (existsSync('index.html')) {
  copyFileSync('index.html', `${publicDir}/index.html`);
} else {
  writeFileSync(`${publicDir}/index.html`, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkyGrid External Site</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at top, #1a1f3b, #0b1020 65%); color: #f8fafc; }
    main { width: min(920px, calc(100vw - 32px)); border: 1px solid rgba(125, 211, 252, .28); border-radius: 28px; padding: 32px; background: rgba(15, 23, 42, .72); box-shadow: 0 24px 80px rgba(0,0,0,.4); }
    .pill { display: inline-flex; gap: 8px; align-items: center; border: 1px solid rgba(34,211,238,.38); border-radius: 999px; padding: 8px 12px; color: #67e8f9; background: rgba(8,145,178,.12); }
    h1 { font-size: clamp(2.2rem, 7vw, 5rem); line-height: .95; margin: 22px 0; letter-spacing: -0.06em; }
    p { color: #cbd5e1; font-size: 1.1rem; line-height: 1.7; max-width: 68ch; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 18px; padding: 18px; background: rgba(2, 6, 23, .72); color: #bae6fd; border: 1px solid rgba(148, 163, 184, .22); }
    a { color: #67e8f9; }
  </style>
</head>
<body>
  <main>
    <span class="pill">🚀 SkyGrid External Site Connected</span>
    <h1>SkyGrid + Aura-Core</h1>
    <p>Cloudflare Pages is serving the external site layer. AWS remains the functional upstream while this page provides public proof, health visibility, and routing status.</p>
    <p><a href="/health.json">Open health.json</a> · <a href="/node-ledger.html">Open Node Ledger</a></p>
    <pre>${JSON.stringify(health, null, 2).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</pre>
  </main>
</body>
</html>`);
}

try {
  execFileSync('node', ['scripts/build-node-ledger.mjs'], { stdio: 'inherit' });
} catch (error) {
  console.warn('Node ledger build skipped or failed:', error.message);
}

writeFileSync(`${publicDir}/health.json`, JSON.stringify(health, null, 2));

console.log('Static output ready in public/ for Vercel or Cloudflare Pages.');
