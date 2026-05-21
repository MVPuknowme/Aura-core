function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Sun-Pay-Gateway', 'stripe-device-link');
  res.end(JSON.stringify(body, null, 2));
}

function sanitize(value, fallback) {
  const clean = String(value || fallback || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, '-')
    .slice(0, 96);
  return clean || fallback;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return Object.fromEntries(new URLSearchParams(req.body)); }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, {
      ok: true,
      status: 'ready',
      service: 'Sun-Pay Stripe Device Link Gateway',
      route: '/api/stripe/device-link',
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      mode: 'gateway_stub',
      nextStep: 'Add live Stripe Checkout session creation after STRIPE_SECRET_KEY and success/cancel URLs are configured in Vercel.',
      samplePostBody: {
        deviceId: 'demo-device',
        ownerRef: 'demo-owner',
        linkPurpose: 'sun-pay-device-link',
        amountUsd: '3.50'
      },
      guardrails: [
        'No payment is created by GET',
        'No private keys are accepted or stored',
        'No device entitlement is activated without verified payment confirmation'
      ]
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return sendJson(res, 405, {
      ok: false,
      status: 'method_not_allowed',
      message: 'Use GET for gateway status or POST to stage a device-link request.'
    });
  }

  const body = await readBody(req);
  const deviceId = sanitize(body.deviceId || body.device, 'demo-device');
  const ownerRef = sanitize(body.ownerRef || body.owner, 'demo-owner');
  const linkPurpose = sanitize(body.linkPurpose || body.purpose, 'sun-pay-device-link');
  const amountUsd = Number(body.amountUsd || body.amount || process.env.DEVICE_LINK_AMOUNT_USD || 3.5);

  if (!Number.isFinite(amountUsd) || amountUsd < 1 || amountUsd > 500) {
    return sendJson(res, 400, {
      ok: false,
      status: 'invalid_amount',
      message: 'amountUsd must be between 1.00 and 500.00.'
    });
  }

  const requestId = `device_link_${Date.now().toString(36)}`;

  return sendJson(res, 200, {
    ok: true,
    status: 'device_link_staged',
    service: 'Sun-Pay Stripe Device Link Gateway',
    requestId,
    configured: Boolean(process.env.STRIPE_SECRET_KEY),
    mode: 'gateway_stub',
    deviceId,
    ownerRef,
    linkPurpose,
    amountUsd: amountUsd.toFixed(2),
    executableNow: false,
    nextStep: 'Enable live Stripe Checkout session creation once Stripe environment variables are installed and webhook verification is ready.',
    requiredEnvForLiveMode: [
      'STRIPE_SECRET_KEY',
      'STRIPE_SUCCESS_URL',
      'STRIPE_CANCEL_URL'
    ],
    guardrails: [
      'This response does not move money',
      'This response does not create a Stripe session yet',
      'This response does not activate a device entitlement',
      'A verified Stripe webhook must confirm payment before linking is considered active'
    ],
    createdAt: new Date().toISOString()
  });
}
