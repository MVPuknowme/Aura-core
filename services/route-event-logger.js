#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { linearRequest } = require('./linear-client');

const EVENT_LOG = process.env.SKYGRID_ROUTE_EVENT_LOG || 'logs/route-events.jsonl';

function ensureLogDir() {
  const dir = EVENT_LOG.split('/').slice(0, -1).join('/');
  if (dir) fs.mkdirSync(dir, { recursive: true });
}

function safeEvent(input = {}) {
  return {
    event_type: input.event_type || 'route_event',
    severity: input.severity || 'info',
    operator: input.operator || process.env.MVP_ID || 'MVP-19830312',
    node: input.node || process.env.MVP_NODE || '42XA-0312',
    selected_route: input.selected_route || null,
    fallback_route: input.fallback_route || null,
    attempts: Array.isArray(input.attempts) ? input.attempts.map(a => ({
      route: a.route || null,
      status: a.status || null,
      error: a.error || null,
      latency_ms: a.latency_ms ?? null
    })) : [],
    body_sha256: input.body_sha256 || null,
    message: input.message || 'SkyGrid route event',
    timestamp: input.timestamp || new Date().toISOString()
  };
}

function appendLocal(event) {
  ensureLogDir();
  fs.appendFileSync(EVENT_LOG, JSON.stringify(event) + '\n');
  return { ok: true, path: EVENT_LOG };
}

async function createLinearIssue(event) {
  const teamId = process.env.LINEAR_TEAM_ID || '';
  if (!process.env.LINEAR_API_KEY) return { ok: false, skipped: true, reason: 'missing_linear_api_key' };
  if (!teamId) return { ok: false, skipped: true, reason: 'missing_linear_team_id' };

  const mutation = `mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title url } } }`;
  const variables = {
    input: {
      teamId,
      title: `[SkyGrid] ${event.severity.toUpperCase()} ${event.event_type}: ${event.selected_route || 'unknown-route'}`,
      description: [
        `Operator: ${event.operator}`,
        `Node: ${event.node}`,
        `Selected route: ${event.selected_route || 'none'}`,
        `Fallback route: ${event.fallback_route || 'none'}`,
        `Body SHA256: ${event.body_sha256 || 'none'}`,
        `Timestamp: ${event.timestamp}`,
        '',
        'Attempts:',
        '```json',
        JSON.stringify(event.attempts, null, 2),
        '```',
        '',
        event.message
      ].join('\n')
    }
  };

  return linearRequest(mutation, variables);
}

async function logRouteEvent(input) {
  const event = safeEvent(input);
  const local = appendLocal(event);
  const linear = await createLinearIssue(event);
  return { ok: true, event, local, linear };
}

if (require.main === module) {
  const raw = process.argv[2] || '{}';
  let input;
  try { input = JSON.parse(raw); } catch (err) { input = { severity: 'error', message: `invalid json input: ${err.message}` }; }
  logRouteEvent(input).then(result => console.log(JSON.stringify(result, null, 2))).catch(err => {
    console.error(JSON.stringify({ ok: false, error: err.message }, null, 2));
    process.exit(1);
  });
}

module.exports = { logRouteEvent, safeEvent };
