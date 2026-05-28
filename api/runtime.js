const VERSION = '1.3.7-stripe-link-runtime';

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(JSON.stringify(body, null, 2));
}

function sendRedirect(res, location) {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end();
}

function sendHome(res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SKYGRID Runtime</title>
</head>
<body>
  <main>
    <h1>SKYGRID Runtime</h1>
    <p>Aura-Core SKYGRID runtime preflight active.</p>
    <p><a href="/api/stripe/device-link?redirect=1">Open Stripe payment link</a></p>
  </main>
</body>
</html>`);
}

function runtimePayload(extra = {}) {
  return {
    ok: true,
    service: 'Aura-Core SKYGRID Runtime',
    mode: 'advisory_preflight',
    sentinel: 'fail_closed',
    operatorAssistOnly: true,
    executionAllowed: false,
    version: VERSION,
    timestamp: new Date().toISOString(),
    ...extra
  };
}

function isValidStripeUrl(url) {
  try {
    const parsed = new URL(url);
    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
      return false;
    }
    // Allow Stripe checkout and payment link domains
    const hostname = parsed.hostname;
    return hostname === 'checkout.stripe.com' ||
           hostname === 'pay.stripe.com' ||
           hostname.endsWith('.stripe.com');
  } catch (e) {
    return false;
  }
}

function configuredStripeLink() {
  const candidates = [
    process.env.STRIPE_PAYMENT_LINK,
    process.env.STRIPE_DEVICE_LINK_URL,
    process.env.SKYGRID_STRIPE_LINK,
    process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK
  ];
  
  for (const candidate of candidates) {
    if (candidate) {
      const trimmed = candidate.trim();
      if (isValidStripeUrl(trimmed)) {
        return trimmed;
      }
    }
  }
  return '';
}

function stripeStatusPayload(req) {
  const link = configuredStripeLink();
  return runtimePayload({
    service: 'SkyGrid Stripe Link',
    status: link ? 'configured' : 'missing_env',
    configured: Boolean(link),
    publicEndpoint: '/api/stripe/device-link',
    redirectEndpoint: '/api/stripe/device-link?redirect=1',
    requiredEnvironmentOneOf: [
      'STRIPE_PAYMENT_LINK',
      'STRIPE_DEVICE_LINK_URL',
      'SKYGRID_STRIPE_LINK',
      'NEXT_PUBLIC_STRIPE_PAYMENT_LINK'
    ],
    host: req.headers.host || null,
    guardrails: [
      'Uses Stripe hosted Payment Link or Checkout URL only',
      'No card data is handled by this Vercel runtime',
      'No Stripe secret key is exposed to the browser',
      'Fails closed when no approved payment link is configured'
    ]
  });
}

function stripeDeviceLinkPayload(req) {
  const link = configuredStripeLink();
  if (!link) {
    return {
      statusCode: 503,
      body: stripeStatusPayload(req)
    };
  }

  return {
    statusCode: 200,
    body: runtimePayload({
      service: 'SkyGrid Stripe Device Link',
      status: 'ready',
      provider: 'stripe',
      checkoutUrl: link,
      redirectUrl: '/api/stripe/device-link?redirect=1',
      nextStep: 'Open redirectUrl to send the user to the configured Stripe-hosted payment link.'
    })
  };
}

export default function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  // Use Vercel's x-rewrote-url header to get the original path when URL is rewritten.
  // This prevents path injection attacks via query parameters.
  let path = req.headers['x-rewrote-url'] || url.pathname;
  path = path.replace(/\/$/, '') || '/';

  if (path === '/') {
    return sendHome(res);
  }

  if (path === '/health.json' || path === '/api/health') {
    return sendJson(res, 200, runtimePayload({
      status: 'healthy',
      routes: {
        home: '/',
        health: '/api/health',
        healthAlias: '/health.json',
        helm: '/api/skygrid/helm?command=status',
        provenance: '/api/skygrid/provenance',
        aws: '/api/skygrid/aws',
        stripeStatus: '/api/stripe/status',
        stripeDeviceLink: '/api/stripe/device-link'
      }
    }));
  }

  if (path === '/api/stripe/status') {
    return sendJson(res, 200, stripeStatusPayload(req));
  }

  if (path === '/api/stripe/device-link') {
    const link = configuredStripeLink();
    if (link && url.searchParams.get('redirect') === '1') {
      return sendRedirect(res, link);
    }

    const payload = stripeDeviceLinkPayload(req);
    return sendJson(res, payload.statusCode, payload.body);
  }

  if (path === '/api/skygrid/helm') {
    return sendJson(res, 200, runtimePayload({
      service: 'SKYGRID Helm Status',
      status: 'operator_assist_ready',
      command: url.searchParams.get('command') || 'status'
    }));
  }

  if (path === '/api/skygrid/provenance') {
    return sendJson(res, 200, runtimePayload({
      service: 'SKYGRID Provenance Mirror',
      status: 'pending_or_ready',
      proofWritten: false
    }));
  }

  if (path === '/api/skygrid/aws') {
    return sendJson(res, 200, runtimePayload({
      service: 'SKYGRID AWS Mirror',
      status: 'pending_or_ready',
      awsConfigured: false,
      connected: false,
      roleAssumptionAllowed: false
    }));
  }

  return sendJson(res, 404, {
    ok: false,
    service: 'Aura-Core SKYGRID Runtime',
    status: 'not_found',
    path,
    sentinel: 'fail_closed',
    version: VERSION,
    timestamp: new Date().toISOString()
  });
}
