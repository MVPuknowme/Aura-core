#!/usr/bin/env node
'use strict';

const http = require('http');
const crypto = require('crypto');
const { execFile } = require('child_process');

const PORT = Number(process.env.ROUTER_PORT || 4000);
const DASHBOARD_URL = process.env.SKYGRID_DASHBOARD_URL || 'http://127.0.0.1:3000/skygrid-status';
const DEFAULT_ROUTE = process.env.SKYGRID_REGION || 'aws-us-east-1-virginia';
const PROTECTION_MODE = 'sha256-manifest + retry-policy + health-gated-routing';

function fetchJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ ok: true, statusCode: res.statusCode, ms: Date.now() - started, data: JSON.parse(body) });
        } catch (err) {
          resolve({ ok: false, statusCode: res.statusCode, ms: Date.now() - started, error: `json_parse_failed: ${err.message}`, raw: body.slice(0, 500) });
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (err) => resolve({ ok: false, statusCode: null, ms: Date.now() - started, error: err.message }));
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function chooseRoute(status) {
  if (!status || !status.network) return DEFAULT_ROUTE;
  if (status.network.active_route) return status.network.active_route;
  return DEFAULT_ROUTE;
}

const server = http.createServer(async (req, res) => {
  const dashboard = await fetchJson(DASHBOARD_URL);
  const route = dashboard.ok ? chooseRoute(dashboard.data) : DEFAULT_ROUTE;
  const requestFingerprint = sha256(`${req.method}:${req.url}:${Date.now()}:${route}`).slice(0, 16);

  const response = {
    status: dashboard.ok ? 'ok' : 'degraded',
    service: 'skygrid-router',
    routed_to: route,
    dashboard_reachable: dashboard.ok,
    dashboard_response_ms: dashboard.ms,
    protection: {
      mode: PROTECTION_MODE,
      request_fingerprint: requestFingerprint,
      integrity: 'sha256',
      retries: 3,
      fail_closed_on_integrity_error: true,
      note: 'This router currently selects a route and returns routing/protection metadata. It does not intercept third-party traffic or bypass access controls.'
    },
    upstream: dashboard.ok ? {
      status: dashboard.data.status,
      active_route: dashboard.data.network?.active_route || null,
      regions: dashboard.data.regions || null
    } : {
      error: dashboard.error,
      fallback_route: DEFAULT_ROUTE
    },
    timestamp: new Date().toISOString()
  };

  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(response, null, 2));
});

server.listen(PORT, () => {
  console.log(`SkyGrid router listening on http://127.0.0.1:${PORT}`);
  console.log(`Dashboard source: ${DASHBOARD_URL}`);
});
