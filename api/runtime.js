const VERSION = '1.3.8-pacific-heart-ingest';

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(JSON.stringify(body, null, 2));
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

async function readJsonBody(req, limitBytes = 32768) {
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
  // Generate unique ingestId using timestamp, eventId hash, and random entropy
  // to ensure uniqueness even in high-concurrency scenarios with same-millisecond requests
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
        healthAlias: '/health.json',
        helm: '/api/skygrid/helm?command=status',
        provenance: '/api/skygrid/provenance',
        aws: '/api/skygrid/aws',
        pacificHeartIngest: '/api/pacific-heart/ingest'
      }
    }));
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
