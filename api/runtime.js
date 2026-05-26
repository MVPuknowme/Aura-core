const VERSION = '1.3.5-smoke-runtime';

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

export default function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const path = url.pathname.replace(/\/$/, '') || '/';

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
        aws: '/api/skygrid/aws'
      }
    }));
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
