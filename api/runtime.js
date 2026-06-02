const VERSION = '1.3.9-runtime-route-coverage';

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(JSON.stringify(body, null, 2));
}

function sendHtml(res, statusCode, title, bodyHtml) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: radial-gradient(circle at top, #1e3a8a 0, #0f172a 42%, #020617 100%); color: #e5eefc; }
    main { max-width: 980px; margin: 0 auto; padding: 56px 24px; }
    .card { border: 1px solid rgba(148, 163, 184, .28); border-radius: 24px; padding: 28px; background: rgba(15, 23, 42, .72); box-shadow: 0 24px 80px rgba(0,0,0,.28); }
    h1 { margin: 0 0 14px; font-size: clamp(2rem, 5vw, 4rem); letter-spacing: -0.05em; }
    p { color: #bfd3f7; line-height: 1.65; font-size: 1.05rem; }
    a { color: #7dd3fc; text-decoration: none; }
    .grid { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); margin-top: 24px; }
    .tile { padding: 16px; border-radius: 18px; background: rgba(30, 41, 59, .72); border: 1px solid rgba(148, 163, 184, .20); }
    code { color: #a7f3d0; }
  </style>
</head>
<body>
  <main>
    <section class="card">
      ${bodyHtml}
    </section>
  </main>
</body>
</html>`);
}

function sendHome(res) {
  return sendHtml(res, 200, 'SKYGRID Runtime', `
    <h1>SKYGRID Runtime</h1>
    <p>Aura-Core SKYGRID runtime preflight active. This Vercel deployment serves the API/runtime layer for SKYGRID routes while B12 can remain the public website layer.</p>
    <div class="grid">
      <div class="tile"><strong>Health</strong><br><a href="/api/health">/api/health</a></div>
      <div class="tile"><strong>Status</strong><br><a href="/api/status">/api/status</a></div>
      <div class="tile"><strong>Dispatch</strong><br><a href="/dispatch">/dispatch</a></div>
      <div class="tile"><strong>Interface</strong><br><a href="/interface">/interface</a></div>
    </div>
  `);
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

function getBackendConfig() {
  const apiBase = process.env.SKYGRID_API_BASE?.replace(/\/+$/, '');
  const apiKey = process.env.SKYGRID_API_KEY || process.env.SKYGRID_BACKEND_TOKEN || '';
  const emergencyCallId = process.env.SKYGRID_EMERGENCY_CALL_ID || '';
  const partnershipCode = process.env.SKYGRID_PARTNERSHIP_CODE || '';

  return {
    apiBase,
    apiKey,
    emergencyCallId,
    partnershipCode,
    configured: Boolean(apiBase && apiKey)
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function readJsonBody(req, limitBytes = 32768) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { throw Object.assign(new Error('Malformed JSON body'), { statusCode: 400 }); }
  }

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
      if (!raw.trim()) {
        reject(Object.assign(new Error('Missing JSON body'), { statusCode: 400 }));
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Malformed JSON body'), { statusCode: 400 }));
      }
    });

    req.on('error', reject);
  });
}

function stringField(value, min = 1, max = 160) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

function validatePacificHeartPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['Payload must be a JSON object.'];
  }

  if (!stringField(payload.eventId, 3, 120)) errors.push('eventId is required.');
  if (!stringField(payload.source, 3, 120)) errors.push('source is required.');
  if (!stringField(payload.patientRef, 3, 120)) errors.push('patientRef is required.');
  if (!stringField(payload.incidentType, 3, 80)) errors.push('incidentType is required.');
  if (!stringField(payload.severity, 3, 40)) errors.push('severity is required.');

  if (payload.vitals !== undefined && (typeof payload.vitals !== 'object' || Array.isArray(payload.vitals))) {
    errors.push('vitals must be an object when provided.');
  }

  if (payload.alerts !== undefined && !Array.isArray(payload.alerts)) {
    errors.push('alerts must be an array when provided.');
  }

  if (payload.consent !== undefined && typeof payload.consent !== 'object') {
    errors.push('consent must be an object when provided.');
  }

  return errors;
}

function buildPacificHeartHandoff(payload, req) {
  const now = new Date().toISOString();
  const normalizedSeverity = String(payload.severity).toLowerCase();
  const priority = ['critical', 'high', 'emergency'].includes(normalizedSeverity) ? 'urgent_review' : 'standard_review';
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const eventIdHash = payload.eventId.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0).toString(36).substring(0, 6);
  const ingestId = `ph_${Date.now().toString(36)}_${eventIdHash}_${randomSuffix}`;

  return runtimePayload({
    service: 'Pacific Heart Emergency Ingest Sandbox',
    status: 'accepted',
    route: '/api/pacific-heart/ingest',
    ingestId,
    receivedAt: now,
    requestHost: req.headers.host || null,
    handoff: {
      target: 'skygrid_emergency_processing_sandbox',
      priority,
      dispatcherReady: false,
      responderReady: false,
      humanReviewRequired: true,
      nextStep: 'Store in preflight ledger or forward to a sandbox dispatcher queue after approval.'
    },
    acceptedPayload: {
      eventId: payload.eventId,
      source: payload.source,
      patientRef: payload.patientRef,
      incidentType: payload.incidentType,
      severity: payload.severity,
      vitalsProvided: Boolean(payload.vitals),
      alertCount: Array.isArray(payload.alerts) ? payload.alerts.length : 0,
      consentProvided: Boolean(payload.consent)
    },
    guardrails: [
      'Sandbox endpoint only',
      'No certified emergency dispatch action is performed',
      'No diagnosis is produced',
      'No PHI should be sent to public preview deployments',
      'Human review is required before responder-facing use'
    ]
  });
}

async function handlePacificHeartIngest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, runtimePayload({
      ok: false,
      service: 'Pacific Heart Emergency Ingest Sandbox',
      status: 'method_not_allowed',
      expectedMethod: 'POST'
    }));
  }

  try {
    const payload = await readJsonBody(req);
    const errors = validatePacificHeartPayload(payload);

    if (errors.length > 0) {
      return sendJson(res, 400, runtimePayload({
        ok: false,
        service: 'Pacific Heart Emergency Ingest Sandbox',
        status: 'invalid_payload',
        errors
      }));
    }

    return sendJson(res, 202, buildPacificHeartHandoff(payload, req));
  } catch (error) {
    return sendJson(res, error.statusCode || 500, runtimePayload({
      ok: false,
      service: 'Pacific Heart Emergency Ingest Sandbox',
      status: error.statusCode === 413 ? 'body_too_large' : 'request_error',
      message: error.message || 'Unable to process ingest request.'
    }));
  }
}

async function handleStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, runtimePayload({ ok: false, status: 'method_not_allowed', expectedMethod: 'GET' }));
  }

  const config = getBackendConfig();
  let backendStatus = config.configured ? 'unchecked' : 'not_configured';

  if (config.configured) {
    try {
      const response = await fetchWithTimeout(`${config.apiBase}/health`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'X-Emergency-Call-ID': config.emergencyCallId,
          'X-Partnership-Code': config.partnershipCode
        }
      }, 4500);
      backendStatus = response.ok ? 'reachable' : 'unavailable';
    } catch {
      backendStatus = 'unavailable';
    }
  }

  return sendJson(res, 200, runtimePayload({
    status: 'healthy',
    route: '/api/status',
    backendConfigured: config.configured,
    backendStatus
  }));
}

async function handleIntake(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, runtimePayload({ ok: false, status: 'method_not_allowed', expectedMethod: 'POST' }));
  }

  const contentType = String(req.headers['content-type'] || '');
  if (!contentType.includes('application/json')) {
    return sendJson(res, 400, runtimePayload({ ok: false, status: 'invalid_content_type', expectedContentType: 'application/json' }));
  }

  let payload;
  try {
    payload = await readJsonBody(req, 32768);
  } catch (error) {
    return sendJson(res, error.statusCode || 400, runtimePayload({
      ok: false,
      status: error.statusCode === 413 ? 'body_too_large' : 'bad_request',
      message: error.statusCode === 413 ? 'Request body too large.' : 'Malformed or missing JSON body.'
    }));
  }

  const config = getBackendConfig();
  if (!config.configured) {
    return sendJson(res, 202, runtimePayload({
      status: 'sandbox_accepted',
      route: '/api/intake',
      backendConfigured: false,
      accepted: true,
      payloadType: typeof payload,
      guardrails: [
        'Sandbox acceptance only',
        'No backend dispatch performed',
        'Configure SKYGRID_API_BASE and SKYGRID_API_KEY for relay mode'
      ]
    }));
  }

  try {
    const response = await fetchWithTimeout(`${config.apiBase}/api/intake`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Emergency-Call-ID': config.emergencyCallId,
        'X-Partnership-Code': config.partnershipCode
      },
      body: JSON.stringify(payload)
    }, 6000);

    if (response.status === 401 || response.status === 403) {
      return sendJson(res, 401, runtimePayload({ ok: false, status: 'backend_auth_failed' }));
    }

    if (response.status === 400) {
      return sendJson(res, 400, runtimePayload({ ok: false, status: 'backend_validation_failed' }));
    }

    if (!response.ok) {
      return sendJson(res, 502, runtimePayload({ ok: false, status: 'backend_relay_failed' }));
    }

    return sendJson(res, 202, runtimePayload({ status: 'accepted', route: '/api/intake', backendConfigured: true }));
  } catch {
    return sendJson(res, 502, runtimePayload({ ok: false, status: 'backend_relay_failed' }));
  }
}

function sendDemoPage(res, path) {
  const titles = {
    '/dispatch': 'SKYGRID Dispatch',
    '/scenarios': 'SKYGRID Scenarios',
    '/rates': 'SKYGRID Rates',
    '/base': 'SKYGRID Base',
    '/pay': 'SKYGRID Pay',
    '/highway': 'SKYGRID Highway',
    '/interface': 'SKYGRID Interface'
  };
  const title = titles[path] || 'SKYGRID Runtime';
  return sendHtml(res, 200, title, `
    <h1>${title}</h1>
    <p>This route is active on the Aura-Core Vercel runtime. It is available for demo wiring, Postman checks, and B12 button validation.</p>
    <div class="grid">
      <div class="tile"><strong>Runtime Health</strong><br><a href="/api/health">/api/health</a></div>
      <div class="tile"><strong>Status API</strong><br><a href="/api/status">/api/status</a></div>
      <div class="tile"><strong>Path</strong><br><code>${path}</code></div>
    </div>
  `);
}

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  let path = url.searchParams.get('__path');
  if (!path) {
    path = url.pathname;
  }
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
        status: '/api/status',
        intake: '/api/intake',
        healthAlias: '/health.json',
        helm: '/api/skygrid/helm?command=status',
        provenance: '/api/skygrid/provenance',
        aws: '/api/skygrid/aws',
        pacificHeartIngest: '/api/pacific-heart/ingest',
        dispatch: '/dispatch',
        interface: '/interface'
      }
    }));
  }

  if (path === '/api/status') {
    return handleStatus(req, res);
  }

  if (path === '/api/intake') {
    return handleIntake(req, res);
  }

  if (path === '/api/pacific-heart/ingest') {
    return handlePacificHeartIngest(req, res);
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
    const config = getBackendConfig();
    return sendJson(res, 200, runtimePayload({
      service: 'SKYGRID AWS Mirror',
      status: config.configured ? 'configured' : 'pending_or_ready',
      awsConfigured: config.configured,
      connected: false,
      roleAssumptionAllowed: false
    }));
  }

  if (['/dispatch', '/scenarios', '/rates', '/base', '/pay', '/highway', '/interface'].includes(path)) {
    return sendDemoPage(res, path);
  }

  if (path === '/api/pay/quote') {
    return sendJson(res, 200, runtimePayload({
      service: 'SKYGRID Pay Quote',
      status: 'quote_ready',
      currency: 'USD',
      amount: 0,
      note: 'Demo quote endpoint; connect pricing logic before production use.'
    }));
  }

  if (path === '/api/highway/status') {
    return sendJson(res, 200, runtimePayload({ service: 'SKYGRID Highway', status: 'ready' }));
  }

  if (path === '/api/highway/flasks') {
    return sendJson(res, 200, runtimePayload({ service: 'SKYGRID Highway Flasks', status: 'ready', flasks: [] }));
  }

  if (path === '/api/highway/postman') {
    return sendJson(res, 200, runtimePayload({ service: 'SKYGRID Highway Postman', status: 'ready_for_collection' }));
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
