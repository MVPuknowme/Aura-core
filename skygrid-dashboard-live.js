#!/usr/bin/env node
'use strict';

const http = require('http');
const https = require('https');
const { execFile } = require('child_process');

const PORT = Number(process.env.PORT || 3000);
const NODE_ID = process.env.MVP_NODE || '42XA-0312';
const OPERATOR = process.env.MVP_ID || 'MVP-19830312';
const ACTIVE_REGION = process.env.SKYGRID_REGION || 'aws-us-east-1-virginia';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const DISCORDBOTLIST_API_BASE = process.env.DISCORDBOTLIST_API_BASE || 'https://discordbotlist.com/api/v1';
const DISCORDBOTLIST_TOKEN = process.env.DISCORDBOTLIST_TOKEN || '';
const SWITCH_TARGETS = (process.env.SKYGRID_SWITCH_TARGETS || 'aws-us-east-1-virginia,aws-us-west-2-oregon,aws-us-west-1-california,local-mesh-lapine,meshtastic-lapine')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function runAws(args, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const child = execFile('aws', args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) return resolve({ ok: false, error: stderr || error.message, stdout });
      resolve({ ok: true, stdout, stderr });
    });
    child.on('error', (error) => resolve({ ok: false, error: error.message, stdout: '' }));
  });
}

function runScript(args, timeoutMs = 10000) {
  return new Promise((resolve) => {
    execFile(args[0], args.slice(1), { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) return resolve({ ok: false, error: stderr || error.message, stdout });
      resolve({ ok: true, stdout, stderr });
    });
  });
}

function httpProbe(url, headers = {}, timeoutMs = 7000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const req = https.request(url, { method: 'GET', headers, timeout: timeoutMs }, (res) => {
      res.resume();
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 500, status_code: res.statusCode, response_time_ms: Date.now() - started, error: null }));
    });
    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (err) => resolve({ ok: false, status_code: null, response_time_ms: Date.now() - started, error: err.message }));
    req.end();
  });
}

async function regionPingStatus() {
  const results = {};
  await Promise.all(SWITCH_TARGETS.map(async (target) => {
    const out = await runScript(['bash', 'scripts/skygrid-region-ping.sh', target, 'network'], 12000);
    try {
      const jsonStart = out.stdout.indexOf('{');
      results[target] = JSON.parse(out.stdout.slice(jsonStart));
    } catch (_) {
      results[target] = { status: 'error', region: target, error: out.error || 'parse_failed', raw: out.stdout.slice(-500) };
    }
  }));
  return results;
}

async function discordBotListStatus() {
  const headers = { 'User-Agent': 'Aura-Core-SkyGrid/1.0' };
  if (DISCORDBOTLIST_TOKEN) headers.Authorization = DISCORDBOTLIST_TOKEN;
  const probe = await httpProbe(DISCORDBOTLIST_API_BASE, headers);
  return { name: 'discordbotlist', base_url: DISCORDBOTLIST_API_BASE, configured: true, token_present: Boolean(DISCORDBOTLIST_TOKEN), reachable: probe.ok, status_code: probe.status_code, response_time_ms: probe.response_time_ms, status: probe.ok ? 'ok' : 'degraded', error: probe.error, note: 'API base probe only; token value is never returned.' };
}

async function awsStatus() {
  const identity = await runAws(['sts', 'get-caller-identity']);
  const vpcs = await runAws(['ec2', 'describe-vpcs', '--region', AWS_REGION]);
  const instances = await runAws(['ec2', 'describe-instances', '--region', AWS_REGION]);
  let account = null, arn = null, vpcCount = null, instanceCount = null;
  try { const parsed = JSON.parse(identity.stdout || '{}'); account = parsed.Account || null; arn = parsed.Arn || null; } catch (_) {}
  try { const parsed = JSON.parse(vpcs.stdout || '{}'); vpcCount = Array.isArray(parsed.Vpcs) ? parsed.Vpcs.length : null; } catch (_) {}
  try { const parsed = JSON.parse(instances.stdout || '{}'); instanceCount = (parsed.Reservations || []).flatMap(r => r.Instances || []).length; } catch (_) {}
  return { authenticated: identity.ok, account, arn, region: AWS_REGION, vpc_count: vpcCount, instance_count: instanceCount, errors: { identity: identity.ok ? null : identity.error, vpcs: vpcs.ok ? null : vpcs.error, instances: instances.ok ? null : instances.error } };
}

function chooseRoute(aws, regions = {}) {
  const healthyRegions = Object.values(regions).filter(r => r.status === 'ok' && typeof r.avg_latency_ms === 'number').sort((a, b) => a.avg_latency_ms - b.avg_latency_ms);
  if (healthyRegions.length) return healthyRegions[0].region;
  if (aws.authenticated && (aws.instance_count || 0) > 0) return ACTIVE_REGION;
  if (aws.authenticated) return 'aws-us-east-1-virginia-standby';
  return 'local-mesh-safe-mode';
}

function html(payload) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>SkyGrid Live Dashboard</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:32px;background:#0b1020;color:#f8fafc}.card{border:1px solid #334155;border-radius:16px;padding:20px;margin:16px 0;background:#111827}code{background:#020617;padding:2px 6px;border-radius:6px}.ok{color:#86efac}.bad{color:#fca5a5}</style></head><body><h1>SkyGrid Live Dashboard</h1><div class="card"><p><strong>Operator:</strong> ${payload.operator}</p><p><strong>Node:</strong> ${payload.node}</p><p><strong>Active route:</strong> <code>${payload.network.active_route}</code></p><p><strong>Status:</strong> <span class="${payload.status === 'ok' ? 'ok' : 'bad'}">${payload.status}</span></p></div><div class="card"><h2>Region Health</h2><pre>${JSON.stringify(payload.regions, null, 2)}</pre></div><div class="card"><h2>AWS</h2><pre>${JSON.stringify(payload.aws, null, 2)}</pre></div><div class="card"><h2>Integrations</h2><pre>${JSON.stringify(payload.integrations, null, 2)}</pre></div><div class="card"><h2>JSON</h2><p><a href="/skygrid-status" style="color:#93c5fd">Open /skygrid-status</a></p></div></body></html>`;
}

async function payload() {
  const [aws, discordbotlist, regions] = await Promise.all([awsStatus(), discordBotListStatus(), regionPingStatus()]);
  const activeRoute = chooseRoute(aws, regions);
  return { status: aws.authenticated ? 'ok' : 'degraded', timestamp: new Date().toISOString(), operator: OPERATOR, node: NODE_ID, aws, regions, integrations: { discordbotlist }, network: { active_route: activeRoute, switch_targets: SWITCH_TARGETS, switching_mode: 'lowest-latency-health-gated', fallback: 'local-mesh-safe-mode' } };
}

const server = http.createServer(async (req, res) => {
  try {
    const data = await payload();
    if (req.url === '/health') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ status: data.status, route: data.network.active_route, regions: data.regions, discordbotlist: data.integrations.discordbotlist.status, timestamp: data.timestamp }, null, 2));
      return;
    }
    if (req.url === '/skygrid-status') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(data, null, 2));
      return;
    }
    res.setHeader('content-type', 'text/html');
    res.end(html(data));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ status: 'error', error: error.message }, null, 2));
  }
});

server.listen(PORT, () => {
  console.log(`SkyGrid dashboard listening on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Status: http://localhost:${PORT}/skygrid-status`);
});
