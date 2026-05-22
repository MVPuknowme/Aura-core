const VERSION = '1.3.4-public-interface';

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Interface', VERSION);
  res.end(JSON.stringify(body, null, 2));
}

function route(id, label, path, state, cta, notes, tags = []) {
  return { id, label, path, state, cta, notes, tags };
}

function interfaceManifest() {
  return {
    ok: true,
    status: 'ready',
    service: 'SkyGrid / Aura-Core Public Interface Manifest',
    version: VERSION,
    mode: 'advisory_preflight',
    audience: ['B12 dashboard', 'Postman validation', 'Codex review', 'operator review'],
    routes: [
      route('home', 'Home', '/', 'operational', 'Open Runtime Home', 'Public runtime landing page.', ['page']),
      route('health', 'Runtime Health', '/health.json', 'operational', 'View Runtime Health', 'Read-only runtime health and route map.', ['json', 'proof']),
      route('interface', 'Interface Map', '/interface', 'operational', 'Open Interface Map', 'Human-readable public interface map.', ['page', 'dashboard']),
      route('interface_api', 'Interface Manifest', '/api/interface', 'operational', 'Open Interface JSON', 'Machine-readable route manifest for B12/Postman.', ['json', 'dashboard']),
      route('highway', 'Highway', '/highway', 'operational', 'Open Highway', 'Four-lane proof bridge page.', ['page', 'proof']),
      route('highway_status', 'Highway Status', '/api/highway/status', 'operational', 'View Highway Status', 'JSON route/lane status contract.', ['json', 'proof']),
      route('highway_flasks', 'Four Reliable Flasks', '/api/highway/flasks', 'operational', 'View Four Flasks', 'GitHub, AWS, Postman, and Web3 bridge lane map.', ['json', 'proof']),
      route('highway_postman', 'Postman Proof Map', '/api/highway/postman', 'operational', 'View Postman Map', 'Validation/proof bundle route for Postman/Newman.', ['json', 'validation']),
      route('ai_preflight', 'Aura-Core AI Preflight', '/api/ai/preflight', 'advisory', 'Run AI Preflight', 'Advisory decision endpoint. Does not move money, route traffic, sign transactions, or activate devices.', ['json', 'ai', 'preflight']),
      route('intake', 'SkyGrid Intake', '/api/intake', 'operational', 'Submit Intake', 'Receives B12-style partner/intake fields for human/operator review.', ['json', 'intake']),
      route('sunpay', 'Sun-Pay Quote Page', '/pay', 'quote_only', 'Open Sun-Pay', 'Public quote interface. No money movement.', ['page', 'payments']),
      route('sunpay_quote', 'Sun-Pay Quote API', '/api/pay/quote?amount=25', 'quote_only', 'Get Sun-Pay Quote', 'Quote-only payment estimate. No execution or signing.', ['json', 'payments']),
      route('stripe_device_link', 'Stripe Device Link', '/api/stripe/device-link', 'staged', 'Stage Device Link', 'Gateway stub for device-link readiness. Live checkout/webhook verification required later.', ['json', 'stripe', 'device']),
      route('rates', 'Base Rate Bands', '/rates', 'operational', 'View Rate Bands', 'Public Base utilization band page.', ['page', 'base']),
      route('base', 'Base Settlement Layer', '/base', 'operational', 'Open Base Layer', 'Base settlement posture and rate-band explanation.', ['page', 'base']),
      route('base_rate_api', 'Base Rate API', '/api/rates/base', 'advisory', 'Open Base Rate JSON', 'Env/default-driven advisory Base rate band logic until live feeds are wired.', ['json', 'base']),
      route('dispatcher', 'Dispatcher Demo', '/dispatch', 'demo', 'Arm Dispatcher Demo', 'Advisory failover recommendation demo. No OS-level network switching.', ['page', 'dispatch']),
      route('scenarios', 'Scenario Demo', '/scenarios', 'demo', 'View Scenarios', 'Public scenario simulation page.', ['page', 'dispatch'])
    ],
    stateLegend: {
      operational: 'Route is expected to load and provide dashboard/proof utility.',
      advisory: 'Decision support only; no irreversible action.',
      quote_only: 'Quote/estimate only; no funds move.',
      staged: 'Prepared gateway or handoff; live activation requires verified backend setup.',
      demo: 'Public demo route; not production automation.',
      disabled: 'Not active.'
    },
    guardrails: [
      'No live payment movement from public demo routes',
      'No transaction signing in runtime interface routes',
      'No device entitlement activation without verified backend webhook confirmation',
      'No automatic OS-level routing or certified emergency communications replacement',
      'Operator approval required before production activation',
      'B12 may consume this manifest directly as a public dashboard map'
    ],
    recommendedB12Bindings: {
      startPreflightCheck: '/api/ai/preflight',
      submitIntake: '/api/intake',
      sunPayQuote: '/api/pay/quote?amount=25',
      stripeDeviceLink: '/api/stripe/device-link',
      baseRateBands: '/rates',
      runtimeHealth: '/health.json',
      dispatcherDemo: '/dispatch',
      highwayStatus: '/api/highway/status'
    },
    generatedAt: new Date().toISOString()
  };
}

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return sendJson(res, 405, {
      ok: false,
      status: 'method_not_allowed',
      message: 'Use GET to read the public interface manifest.'
    });
  }

  return sendJson(res, 200, interfaceManifest());
}
