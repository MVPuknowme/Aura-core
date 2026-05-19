const VERSION = '1.3.0-runtime';

const env = {
  AURA_MODE: process.env.AURA_MODE || 'vercel-runtime',
  SKYGRID_TRACE: process.env.SKYGRID_TRACE || 'false',
  SKYGRID_LEVEL: process.env.SKYGRID_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'production'
};

function json(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(JSON.stringify(body, null, 2));
}

function html(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(body);
}

function healthPayload() {
  return {
    ok: true,
    status: 'online',
    service: 'Aura-Core SKYGRID Runtime',
    version: VERSION,
    mode: env.AURA_MODE,
    powered_by: 'Aura-Core',
    static_primary: false,
    runtime_primary: true,
    generated_at: new Date().toISOString(),
    routes: {
      home: '/',
      health: '/health.json',
      api_health: '/api/health',
      device_status: '/api/device-status'
    },
    guardrails: [
      'No guaranteed revenue claims',
      'No invasive device fingerprinting',
      'No private wallet keys or credentials required',
      'Runtime health is verified by this API response'
    ]
  };
}

function deviceStatusPayload(req) {
  const userAgent = req.headers['user-agent'] || '';
  const mobile = /Mobi|iPhone|Android.*Mobile/i.test(userAgent);
  const tablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent);

  return {
    ok: true,
    status: 'connected',
    service: 'Aura-Core Device Status',
    powered_by: 'Aura-Core',
    generated_at: new Date().toISOString(),
    device_class: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop',
    checks: {
      request_reached_runtime: true,
      runtime_primary: true,
      static_primary: false,
      safe_browser_signals_only: true
    },
    privacy: {
      mac_address_collected: false,
      imei_collected: false,
      serial_number_collected: false,
      precise_location_collected: false,
      wallet_keys_required: false
    }
  };
}

function renderHome() {
  const health = healthPayload();
  const escapedHealth = JSON.stringify(health, null, 2)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aura-Core SKYGRID Runtime</title>
  <meta name="description" content="Aura-Core SKYGRID runtime app with live health and device status routes." />
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 18% 8%, rgba(109,234,255,.25), transparent 34%), linear-gradient(135deg, #06101f, #120d2b); color: #f7fbff; }
    main { width: min(1040px, calc(100% - 32px)); margin: 0 auto; padding: 64px 0; }
    .pill { display: inline-flex; border: 1px solid rgba(124,255,199,.38); background: rgba(124,255,199,.08); color: #7cffc7; border-radius: 999px; padding: 8px 12px; font-weight: 800; }
    h1 { font-size: clamp(2.3rem, 8vw, 5.8rem); letter-spacing: -.07em; line-height: .95; margin: 22px 0; }
    h1 span { color: #6deaff; }
    p { max-width: 72ch; color: #b8c7d9; font-size: 1.1rem; line-height: 1.7; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin: 28px 0; }
    a { color: #6deaff; }
    .btn { display: inline-flex; padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,.18); color: #f7fbff; text-decoration: none; font-weight: 800; }
    .btn.primary { color: #06101f; background: linear-gradient(135deg, #6deaff, #9b7cff); border: none; }
    pre { overflow: auto; padding: 18px; border-radius: 18px; background: rgba(2,6,23,.72); border: 1px solid rgba(255,255,255,.14); color: #d9f8ff; }
  </style>
</head>
<body>
  <main>
    <span class="pill">Runtime primary · static demoted</span>
    <h1><span>Aura-Core</span> powers SKYGRID</h1>
    <p>This route is served by the Aura-Core runtime app, not a static landing page. Health and device status are functional API routes so the powered-by claim resolves to live behavior.</p>
    <div class="actions">
      <a class="btn primary" href="/health.json">Open Runtime Health</a>
      <a class="btn" href="/api/health">Open API Health</a>
      <a class="btn" href="/api/device-status">Open Device Status</a>
      <a class="btn" href="https://github.com/MVPuknowme/Aura-core">View Source</a>
    </div>
    <pre>${escapedHealth}</pre>
  </main>
</body>
</html>`;
}

export default function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'aura-core.local'}`);
  const path = url.pathname.replace(/\/$/, '') || '/';

  if (path === '/health.json' || path === '/api/health') {
    return json(res, 200, healthPayload());
  }

  if (path === '/api/device-status') {
    return json(res, 200, deviceStatusPayload(req));
  }

  if (path === '/') {
    return html(res, 200, renderHome());
  }

  return json(res, 404, {
    ok: false,
    status: 'not_found',
    service: 'Aura-Core SKYGRID Runtime',
    path,
    available_routes: ['/', '/health.json', '/api/health', '/api/device-status']
  });
}

if (process.argv[1] && process.argv[1].endsWith('app.js') && !process.env.VERCEL) {
  const { createServer } = await import('node:http');
  const port = Number(process.env.PORT || 7000);
  createServer((req, res) => handler(req, res)).listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      message: 'Aura-Core SKYGRID runtime listening',
      port,
      version: VERSION
    }));
  });
}
