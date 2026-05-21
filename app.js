const VERSION = '1.3.2-sunpay-quote';

const env = {
  AURA_MODE: process.env.AURA_MODE || 'vercel-runtime',
  SKYGRID_TRACE: process.env.SKYGRID_TRACE || 'false',
  SKYGRID_LEVEL: process.env.SKYGRID_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'production'
};

const PUBLIC_ROUTES = [
  '/',
  '/dispatch',
  '/scenarios',
  '/rates',
  '/base',
  '/pay',
  '/health.json',
  '/api/health',
  '/api/device-status',
  '/api/rates/base',
  '/api/pay/quote'
];

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function usd(value) {
  return Number(value).toFixed(2);
}

function classifyBaseRate(input = {}) {
  const baseGasGwei = Number(input.baseGasGwei ?? process.env.BASE_GAS_GWEI ?? 1);
  const l1SecurityFeeUsd = Number(input.l1SecurityFeeUsd ?? process.env.BASE_L1_SECURITY_FEE_USD ?? 0.02);
  const blobFeeTrendPct = Number(input.blobFeeTrendPct ?? process.env.BASE_BLOB_FEE_TREND_PCT ?? 0);
  const sevenDayGasTrendPct = Number(input.sevenDayGasTrendPct ?? process.env.BASE_7D_GAS_TREND_PCT ?? 0);

  const pressureScore = Math.round(
    baseGasGwei * 1.5 +
      l1SecurityFeeUsd * 10 +
      blobFeeTrendPct * 0.6 +
      sevenDayGasTrendPct * 0.8
  );

  const source = {
    baseGasGwei,
    l1SecurityFeeUsd,
    blobFeeTrendPct,
    sevenDayGasTrendPct
  };

  if (pressureScore >= 35) {
    return {
      network: 'Base',
      band: 'red',
      pressureScore,
      utilizationMarkup: 0.075,
      utilizationMarkupPct: '7.5%',
      posture: 'Batch, delay, or reroute non-urgent settlement. Apply congestion-protected pricing.',
      customerSummary: 'Base settlement conditions are elevated. SkyGrid should protect margins and prioritize critical traffic.',
      source
    };
  }

  if (pressureScore >= 12) {
    return {
      network: 'Base',
      band: 'yellow',
      pressureScore,
      utilizationMarkup: 0.05,
      utilizationMarkupPct: '5.0%',
      posture: 'Continue settlement, widen spread modestly, and monitor L1/blob pressure.',
      customerSummary: 'Base costs are rising or volatile. SkyGrid should preserve service while adding a volatility reserve.',
      source
    };
  }

  return {
    network: 'Base',
    band: 'green',
    pressureScore,
    utilizationMarkup: 0.035,
    utilizationMarkupPct: '3.5%',
    posture: 'Normal routing. Keep friction low and allow standard utilization pricing.',
    customerSummary: 'Base conditions are stable. SkyGrid can run low-friction settlement with standard utilization pricing.',
    source
  };
}

function estimatedNetworkCostUsd(band) {
  if (band === 'red') return 0.25;
  if (band === 'yellow') return 0.05;
  return 0.01;
}

function buildSunPayQuote(url) {
  const amountParam = url.searchParams.get('amount') || url.searchParams.get('amountUsd') || '25';
  const amountUsd = Number(amountParam);
  const asset = (url.searchParams.get('asset') || 'USDC').toUpperCase();
  const destination = url.searchParams.get('destination') || 'demo-recipient';
  const memo = url.searchParams.get('memo') || 'Sun-Pay public quote';
  const decision = classifyBaseRate();

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return {
      ok: false,
      status: 'invalid_amount',
      message: 'Provide a positive amount or amountUsd query parameter.'
    };
  }

  if (amountUsd > 10000) {
    return {
      ok: false,
      status: 'amount_limit_exceeded',
      message: 'Public quote demo is capped at 10000 USD. Use private review for larger settlement planning.'
    };
  }

  const networkCostUsd = estimatedNetworkCostUsd(decision.band);
  const utilizationFeeUsd = amountUsd * decision.utilizationMarkup;
  const totalEstimatedCostUsd = amountUsd + networkCostUsd + utilizationFeeUsd;
  const createdAt = new Date().toISOString();
  const quoteId = `sunpay_${decision.band}_${Date.now().toString(36)}`;

  return {
    ok: true,
    status: 'quoted',
    service: 'Sun-Pay Quote Engine',
    quoteId,
    network: 'base',
    settlementAsset: asset,
    amountUsd: usd(amountUsd),
    destination,
    memo,
    rateBand: decision.band,
    pressureScore: decision.pressureScore,
    utilizationMarkupPct: decision.utilizationMarkupPct,
    utilizationFeeUsd: usd(utilizationFeeUsd),
    estimatedNetworkCostUsd: usd(networkCostUsd),
    totalEstimatedCostUsd: usd(totalEstimatedCostUsd),
    requiresUserApproval: true,
    executableNow: false,
    nextStep: 'Connect a wallet or checkout provider before transaction creation. This endpoint only quotes cost and routing posture.',
    guardrails: [
      'Quote only; no money moved',
      'No transaction signing in this runtime',
      'No private keys accepted or stored',
      'User approval required before any future payment execution',
      'USDC on Base is the preferred first settlement asset for live wiring'
    ],
    rateDecision: decision,
    createdAt
  };
}

function baseRatePayload() {
  return {
    ok: true,
    status: 'online',
    service: 'Aura-Core Base Rate Utilization',
    version: VERSION,
    product: 'SkyGrid / Sun-Pay rate utilization',
    decision: classifyBaseRate(),
    guardrails: [
      'Advisory rate band only',
      'No automatic OS-level network switching in v1',
      'No private wallet keys or credentials required',
      'Live market/RPC inputs can replace environment defaults later'
    ],
    generated_at: new Date().toISOString()
  };
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
      dispatch: '/dispatch',
      scenarios: '/scenarios',
      rates: '/rates',
      base: '/base',
      pay: '/pay',
      health: '/health.json',
      api_health: '/api/health',
      device_status: '/api/device-status',
      base_rate_api: '/api/rates/base',
      sunpay_quote_api: '/api/pay/quote'
    },
    public_routes: PUBLIC_ROUTES,
    guardrails: [
      'No guaranteed revenue claims',
      'No invasive device fingerprinting',
      'No private wallet keys or credentials required',
      'Runtime health is verified by this API response',
      'SkyGrid Dispatcher is advisory in v1 and does not perform OS-level network switching',
      'Sun-Pay quote endpoint does not move money or create transactions'
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

function renderShell({ title, eyebrow, heading, body, cards = [], cta = [] }) {
  const renderedCards = cards.map((card) => `
    <article class="card">
      <span>${escapeHtml(card.label)}</span>
      <h2>${escapeHtml(card.title)}</h2>
      <p>${escapeHtml(card.body)}</p>
    </article>`).join('');

  const renderedCta = cta.map((item, index) => `
      <a class="btn ${index === 0 ? 'primary' : ''}" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>`).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="Aura-Core SKYGRID runtime public demo route." />
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
    pre { overflow: auto; padding: 18px; border-radius: 18px; background: rgba(2,6,23,.72); border: 1px solid rgba(255,255,255,.14); color: #d9f8ff; }
  </style>
</head>
<body>
  <main>
    <nav>
      <a href="/">Home</a>
      <a href="/dispatch">Dispatch</a>
      <a href="/scenarios">Scenarios</a>
      <a href="/rates">Rates</a>
      <a href="/base">Base</a>
      <a href="/pay">Sun-Pay</a>
      <a href="/health.json">Health</a>
    </nav>
    <span class="pill">${escapeHtml(eyebrow)}</span>
    <h1>${heading}</h1>
    <p>${escapeHtml(body)}</p>
    <div class="actions">${renderedCta}</div>
    <section class="grid">${renderedCards}</section>
  </main>
</body>
</html>`;
}

function renderHome() {
  return renderShell({
    title: 'Aura-Core SKYGRID Runtime',
    eyebrow: 'Runtime primary · public demo enabled',
    heading: '<span>Aura-Core</span> powers SKYGRID',
    body: 'This public route is served by the Aura-Core runtime app. It exposes health, dispatch, scenario, Base settlement, Sun-Pay quote, and rate-utilization demo routes without requiring a private dashboard session.',
    cta: [
      { href: '/dispatch', label: 'Arm Dispatcher Demo' },
      { href: '/pay', label: 'Open Sun-Pay Quote' },
      { href: '/api/pay/quote?amount=25', label: 'Quote $25' }
    ],
    cards: [
      { label: 'Public', title: 'Demo routes open', body: '/, /dispatch, /scenarios, /rates, /base, /pay, and /api/pay/quote are intended for public inspection.' },
      { label: 'Guardrail', title: 'Advisory v1', body: 'SkyGrid Dispatcher is an advisory network-health and failover recommendation tool for demos, testing, and resilience planning.' },
      { label: 'Settlement', title: 'Base-aware pricing', body: 'Base rate bands classify network pressure as green, yellow, or red before applying Sun-Pay quote markups.' }
    ]
  });
}

function renderDispatch() {
  return renderShell({
    title: 'SkyGrid Dispatcher Demo',
    eyebrow: 'Public dispatcher demo',
    heading: '<span>Arm</span> Dispatcher',
    body: 'SkyGrid Dispatcher ranks fallback options and presents a human-confirmed recommendation. In v1 it does not perform OS-level network switching or replace certified emergency communications.',
    cta: [
      { href: '/scenarios', label: 'Inject Demo Scenario' },
      { href: '/rates', label: 'Check Rate Band' }
    ],
    cards: [
      { label: 'Live', title: 'WiFi / cellular posture', body: 'Real deployments can use safe browser and server-side health checks for visible route status.' },
      { label: 'Simulated', title: 'LoRa / satellite / Tor', body: 'Non-native transports stay clearly labeled as simulated or advisory until integrated with certified systems.' },
      { label: 'Decision', title: 'YES, take over prompt', body: 'The demo should show a human approval step before any failover recommendation is treated as active.' }
    ]
  });
}

function renderScenarios() {
  return renderShell({
    title: 'SkyGrid Scenarios',
    eyebrow: 'Scenario injector',
    heading: '<span>Test</span> failover stories',
    body: 'Use these scenarios to demonstrate value in under one minute: regional cloud degradation, carrier congestion, local power instability, and Base settlement pressure.',
    cta: [
      { href: '/dispatch', label: 'Back to Dispatcher' },
      { href: '/api/rates/base', label: 'Inspect Base JSON' }
    ],
    cards: [
      { label: 'Scenario 1', title: 'Carrier congestion', body: 'Rank alternate transport and recommend delayed settlement for non-critical operations.' },
      { label: 'Scenario 2', title: 'Cloud region slowdown', body: 'Prefer healthier regional endpoint and show the decision trail.' },
      { label: 'Scenario 3', title: 'Base fee pressure', body: 'Move from green to yellow or red pricing posture when L1/blob costs rise.' }
    ]
  });
}

function renderRates() {
  const payload = baseRatePayload();
  const decision = payload.decision;
  return renderShell({
    title: 'SkyGrid Base Rate Utilization',
    eyebrow: `Current band · ${decision.band.toUpperCase()}`,
    heading: '<span>Base</span> rate bands',
    body: `${decision.customerSummary} Current utilization markup recommendation: ${decision.utilizationMarkupPct}. Pressure score: ${decision.pressureScore}.`,
    cta: [
      { href: '/api/rates/base', label: 'Open JSON API' },
      { href: '/pay', label: 'Quote Sun-Pay' }
    ],
    cards: [
      { label: 'Green', title: '3.5% standard', body: 'Stable/low network cost. Keep friction low and use normal settlement routing.' },
      { label: 'Yellow', title: '5.0% reserve', body: 'Rising cost or volatility. Preserve service while widening the spread modestly.' },
      { label: 'Red', title: '7.5% protected', body: 'Congestion or L1/blob pressure spike. Batch, delay, or reroute non-urgent settlement.' },
      { label: 'Now', title: decision.posture, body: `Inputs: ${JSON.stringify(decision.source)}` }
    ]
  });
}

function renderBase() {
  return renderShell({
    title: 'Aura-Core Base Settlement Layer',
    eyebrow: 'Base linked settlement',
    heading: '<span>Base</span> settlement layer',
    body: 'Aura-Core can use Base as a low-cost settlement and routing signal layer for SkyGrid, Sun-Pay, and adaptive utilization. Rates remain adaptive so the demo follows network conditions instead of hard-coding stale pricing.',
    cta: [
      { href: '/rates', label: 'View Rate Bands' },
      { href: '/api/pay/quote?amount=25', label: 'Quote $25 on Base' }
    ],
    cards: [
      { label: 'Signal', title: 'L2 execution cost', body: 'Base gas contributes to the direct transaction cost floor.' },
      { label: 'Overhead', title: 'L1/blob pressure', body: 'Rollup data and security costs are treated as variable overhead.' },
      { label: 'Business', title: 'Utilization markup', body: 'SkyGrid/Sun-Pay applies a trend-following markup band to protect service and margin.' }
    ]
  });
}

function renderPay(url) {
  const quote = buildSunPayQuote(url);
  const body = quote.ok
    ? `Sun-Pay quote engine is online. A ${quote.amountUsd} USD quote on Base/${quote.settlementAsset} is in the ${quote.rateBand.toUpperCase()} band with ${quote.utilizationMarkupPct} utilization markup. No money is moved by this page.`
    : quote.message;

  return renderShell({
    title: 'Sun-Pay Quote Engine',
    eyebrow: 'Sun-Pay quote · no custody',
    heading: '<span>Sun-Pay</span> quote layer',
    body,
    cta: [
      { href: '/api/pay/quote?amount=25', label: 'Quote $25' },
      { href: '/api/pay/quote?amount=100', label: 'Quote $100' },
      { href: '/rates', label: 'View Rate Bands' }
    ],
    cards: quote.ok ? [
      { label: 'Quote', title: quote.quoteId, body: `Total estimated cost: $${quote.totalEstimatedCostUsd}. Utilization fee: $${quote.utilizationFeeUsd}. Network estimate: $${quote.estimatedNetworkCostUsd}.` },
      { label: 'Approval', title: 'User confirmation required', body: 'This runtime returns a quote only. A future wallet or checkout provider must collect approval before transaction creation.' },
      { label: 'Safety', title: 'No keys, no transfer', body: 'The endpoint does not accept private keys, does not sign transactions, and does not move funds.' }
    ] : [
      { label: 'Error', title: quote.status, body: quote.message }
    ]
  });
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

  if (path === '/api/rates/base') {
    return json(res, 200, baseRatePayload());
  }

  if (path === '/api/pay/quote') {
    const quote = buildSunPayQuote(url);
    return json(res, quote.ok ? 200 : 400, quote);
  }

  if (path === '/') {
    return html(res, 200, renderHome());
  }

  if (path === '/dispatch') {
    return html(res, 200, renderDispatch());
  }

  if (path === '/scenarios') {
    return html(res, 200, renderScenarios());
  }

  if (path === '/rates') {
    return html(res, 200, renderRates());
  }

  if (path === '/base') {
    return html(res, 200, renderBase());
  }

  if (path === '/pay') {
    return html(res, 200, renderPay(url));
  }

  return json(res, 404, {
    ok: false,
    status: 'not_found',
    service: 'Aura-Core SKYGRID Runtime',
    path,
    available_routes: PUBLIC_ROUTES
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
