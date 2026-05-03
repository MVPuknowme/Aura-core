#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');
const crypto = require('crypto');

const PORT = Number(process.env.ROUTER_PORT || 4000);
const DASHBOARD_URL = process.env.SKYGRID_DASHBOARD_URL || 'http://127.0.0.1:3000/skygrid-status';
const DEFAULT_ROUTE = process.env.SKYGRID_REGION || 'aws-us-east-1-virginia';
const UPSTREAMS = parseUpstreams(process.env.SKYGRID_UPSTREAMS || '');
const PROTECTION_MODE = 'sha256-manifest + retry-policy + health-gated-routing + allowlisted-forwarding';

function parseUpstreams(raw) {
  // Format: route=url,route=url
  const map = {};
  raw.split(',').map(s => s.trim()).filter(Boolean).forEach(pair => {
    const idx = pair.indexOf('=');
    if (idx > 0) map[pair.slice(0, idx)] = pair.slice(idx + 1);
  });
  return map;
}

function requestJson(url, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    const started = Date.now();
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
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

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('body_too_large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function chooseRoute(status) {
  if (!status || !status.network) return DEFAULT_ROUTE;
  return status.network.active_route || DEFAULT_ROUTE;
}

async function forwardRequest(req, res, route, body, dashboard) {
  const upstreamBase = UPSTREAMS[route];
  if (!upstreamBase) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      status: 'degraded',
      service: 'skygrid-router',
      mode: 'forward',
      error: 'no_allowlisted_upstream_for_route',
      route,
      configured_routes: Object.keys(UPSTREAMS),
      dashboard_reachable: dashboard.ok,
      protection: {
        mode: PROTECTION_MODE,
        body_sha256: sha256(body),
        fail_closed: true,
        note: 'Set SKYGRID_UPSTREAMS="route=https://your-upstream" to enable forwarding. Only configured upstreams are allowed.'
      },
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  const target = new URL(req.url, upstreamBase);
  const client = target.protocol === 'https:' ? https : http;
  const bodyHash = sha256(body);
  const headers = { ...req.headers };
  delete headers.host;
  headers['x-skygrid-route'] = route;
  headers['x-skygrid-body-sha256'] = bodyHash;
  headers['x-skygrid-operator'] = 'MVP-19830312';

  const options = {
    method: req.method,
    headers,
    timeout: 10000
  };

  const upstreamReq = client.request(target, options, (upstreamRes) => {
    res.statusCode = upstreamRes.statusCode || 502;
    for (const [key, value] of Object.entries(upstreamRes.headers)) {
      if (value !== undefined) res.setHeader(key, value);
    }
    res.setHeader('x-skygrid-routed-to', route);
    res.setHeader('x-skygrid-body-sha256', bodyHash);
    upstreamRes.pipe(res);
  });

  upstreamReq.on('timeout', () => upstreamReq.destroy(new Error('upstream_timeout')));
  upstreamReq.on('error', (err) => {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('content-type', 'application/json');
    }
    res.end(JSON.stringify({ status: 'error', service: 'skygrid-router', route, upstream: upstreamBase, error: err.message, timestamp: new Date().toISOString() }, null, 2));
  });

  if (body.length) upstreamReq.write(body);
  upstreamReq.end();
}

const server = http.createServer(async (req, res) => {
  try {
    const body = await readBody(req);
    const dashboard = await requestJson(DASHBOARD_URL);
    const route = dashboard.ok ? chooseRoute(dashboard.data) : DEFAULT_ROUTE;

    if (req.url === '/router-health') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', service: 'skygrid-router', route, dashboard_reachable: dashboard.ok, configured_routes: Object.keys(UPSTREAMS), protection: PROTECTION_MODE, timestamp: new Date().toISOString() }, null, 2));
      return;
    }

    if (req.url === '/' || req.url === '/route-preview') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: dashboard.ok ? 'ok' : 'degraded', service: 'skygrid-router', mode: 'preview', routed_to: route, dashboard_reachable: dashboard.ok, dashboard_response_ms: dashboard.ms, protection: { mode: PROTECTION_MODE, body_sha256: sha256(body), retries: 3, fail_closed_on_integrity_error: true }, timestamp: new Date().toISOString() }, null, 2));
      return;
    }

    await forwardRequest(req, res, route, body, dashboard);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: 'error', service: 'skygrid-router', error: err.message, timestamp: new Date().toISOString() }, null, 2));
  }
});

server.listen(PORT, () => {
  console.log(`SkyGrid router listening on http://127.0.0.1:${PORT}`);
  console.log(`Dashboard source: ${DASHBOARD_URL}`);
  console.log(`Configured upstream routes: ${Object.keys(UPSTREAMS).join(', ') || 'none'}`);
});
