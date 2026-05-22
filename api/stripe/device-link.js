const STRIPE_API_BASE = 'https://api.stripe.com/v1';

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

function getOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'aura-core.local';
  return `${Array.isArray(proto) ? proto[0] : proto}://${Array.isArray(host) ? host[0] : host}`;
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

function buildLineItem(params, amountUsd, body) {
  const priceId = process.env.STRIPE_DEVICE_LINK_PRICE_ID || body.priceId;

  if (priceId) {
    params.append('line_items[0][price]', String(priceId));
    params.append('line_items[0][quantity]', '1');
    return null;
  }

  const unitAmount = Math.round(amountUsd * 100);
  params.append('line_items[0][price_data][currency]', 'usd');
  params.append('line_items[0][price_data][unit_amount]', String(unitAmount));
  params.append('line_items[0][price_data][product_data][name]', 'Sun-Pay Device Link');
  params.append('line_items[0][price_data][product_data][description]', 'Aura-Core / SkyGrid staged device-link checkout.');
  params.append('line_items[0][quantity]', '1');
  return null;
}

async function createCheckoutSession(req, body, fields) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return {
      statusCode: 503,
      body: {
        ok: false,
        status: 'stripe_not_configured',
        service: 'Sun-Pay Stripe Device Link Gateway',
        configured: false,
        message: 'Set STRIPE_SECRET_KEY in Vercel before creating checkout sessions.',
        requiredEnvForLiveMode: [
          'STRIPE_SECRET_KEY',
          'STRIPE_SUCCESS_URL',
          'STRIPE_CANCEL_URL',
          'STRIPE_WEBHOOK_SECRET'
        ],
        guardrails: [
          'No checkout session created because Stripe secret is missing',
          'No funds moved',
          'No device entitlement activated'
        ]
      }
    };
  }

  const origin = getOrigin(req);
  const successUrl = body.successUrl || process.env.STRIPE_SUCCESS_URL || `${origin}/pay?stripe=device_link_success&device=${encodeURIComponent(fields.deviceId)}`;
  const cancelUrl = body.cancelUrl || process.env.STRIPE_CANCEL_URL || `${origin}/pay?stripe=device_link_cancelled&device=${encodeURIComponent(fields.deviceId)}`;
  const requestId = `device_link_${Date.now().toString(36)}`;

  const params = new URLSearchParams();
  params.append('mode', 'payment');
  params.append('success_url', successUrl);
  params.append('cancel_url', cancelUrl);
  params.append('client_reference_id', `${fields.ownerRef}:${fields.deviceId}`);
  params.append('metadata[service]', 'sun-pay-device-link');
  params.append('metadata[network]', 'aura-core-skygrid');
  params.append('metadata[request_id]', requestId);
  params.append('metadata[device_id]', fields.deviceId);
  params.append('metadata[owner_ref]', fields.ownerRef);
  params.append('metadata[link_purpose]', fields.linkPurpose);
  params.append('payment_intent_data[metadata][service]', 'sun-pay-device-link');
  params.append('payment_intent_data[metadata][request_id]', requestId);
  params.append('payment_intent_data[metadata][device_id]', fields.deviceId);
  params.append('payment_intent_data[metadata][owner_ref]', fields.ownerRef);
  buildLineItem(params, fields.amountUsd, body);

  const idempotencyKey = sanitize(body.idempotencyKey, `${fields.ownerRef}-${fields.deviceId}-${fields.amountUsd.toFixed(2)}`);
  const stripeRes = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': idempotencyKey
    },
    body: params
  });

  const stripeBody = await stripeRes.json().catch(() => ({}));

  if (!stripeRes.ok) {
    return {
      statusCode: stripeRes.status,
      body: {
        ok: false,
        status: 'stripe_error',
        service: 'Sun-Pay Stripe Device Link Gateway',
        message: stripeBody?.error?.message || 'Stripe checkout session creation failed.',
        stripeType: stripeBody?.error?.type || null,
        stripeCode: stripeBody?.error?.code || null,
        requestId,
        guardrails: [
          'No device entitlement activated',
          'Webhook verification still required before any permanent link status'
        ]
      }
    };
  }

  return {
    statusCode: 200,
    body: {
      ok: true,
      status: 'checkout_session_created',
      service: 'Sun-Pay Stripe Device Link Gateway',
      mode: 'stripe_checkout',
      requestId,
      configured: true,
      sessionId: stripeBody.id,
      checkoutUrl: stripeBody.url,
      paymentStatus: stripeBody.payment_status,
      deviceId: fields.deviceId,
      ownerRef: fields.ownerRef,
      linkPurpose: fields.linkPurpose,
      amountUsd: fields.amountUsd.toFixed(2),
      executableNow: true,
      requiresUserApproval: true,
      entitlementActivated: false,
      nextStep: 'User must complete Stripe Checkout. A verified Stripe webhook must confirm payment before device link activation.',
      guardrails: [
        'Stripe secret remains server-side in Vercel',
        'Checkout requires user approval',
        'No private wallet keys accepted or stored',
        'No device entitlement activated from redirect alone',
        'Webhook verification required before permanent link status'
      ],
      createdAt: new Date().toISOString()
    }
  };
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
      mode: process.env.STRIPE_SECRET_KEY ? 'stripe_checkout_ready' : 'gateway_waiting_for_env',
      samplePostBody: {
        deviceId: 'demo-device',
        ownerRef: 'demo-owner',
        linkPurpose: 'sun-pay-device-link',
        amountUsd: '3.50'
      },
      requiredEnvForLiveMode: [
        'STRIPE_SECRET_KEY',
        'STRIPE_SUCCESS_URL',
        'STRIPE_CANCEL_URL',
        'STRIPE_WEBHOOK_SECRET'
      ],
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
      message: 'Use GET for gateway status or POST to create a device-link checkout session.'
    });
  }

  const body = await readBody(req);
  const fields = {
    deviceId: sanitize(body.deviceId || body.device, 'demo-device'),
    ownerRef: sanitize(body.ownerRef || body.owner, 'demo-owner'),
    linkPurpose: sanitize(body.linkPurpose || body.purpose, 'sun-pay-device-link'),
    amountUsd: Number(body.amountUsd || body.amount || process.env.DEVICE_LINK_AMOUNT_USD || 3.5)
  };

  if (!Number.isFinite(fields.amountUsd) || fields.amountUsd < 1 || fields.amountUsd > 500) {
    return sendJson(res, 400, {
      ok: false,
      status: 'invalid_amount',
      message: 'amountUsd must be between 1.00 and 500.00.'
    });
  }

  try {
    const result = await createCheckoutSession(req, body, fields);
    return sendJson(res, result.statusCode, result.body);
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      status: 'gateway_exception',
      message: error instanceof Error ? error.message : 'Unknown Stripe device-link gateway exception.',
      guardrails: [
        'No funds confirmed by this error response',
        'No device entitlement activated'
      ]
    });
  }
}
