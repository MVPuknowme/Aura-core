#!/usr/bin/env node
'use strict';

const fs = require('fs');

const configPath = process.env.ALLBRIDGE_OPTIONS_CONFIG || 'config/allbridge-options.json';
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function stableScore(text) {
  let hash = 0;
  for (const ch of text) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function simulateRoute(option) {
  const seed = stableScore(option.id);
  const latency = 35 + (seed % 240);
  const packetLoss = seed % 11;
  const integrityOk = (seed % 13) !== 0;
  const ok = packetLoss <= 5 && integrityOk;
  return {
    id: option.id,
    source: option.source,
    target: option.target,
    mode: option.mode,
    latency_ms: latency,
    packet_loss_percent: packetLoss,
    integrity_ok: integrityOk,
    status: ok ? 'ok' : 'degraded',
    conductor_action: ok ? 'candidate' : 'skip_or_retry_later'
  };
}

function run() {
  const results = config.options.map(simulateRoute);
  const candidates = results
    .filter(r => r.status === 'ok')
    .sort((a, b) => a.latency_ms - b.latency_ms || a.packet_loss_percent - b.packet_loss_percent);

  const output = {
    status: candidates.length ? 'ok' : 'degraded',
    mission: 'micro-conductor allbridge route simulation',
    operator: config.operator,
    node_tag: config.node_tag,
    tested_routes: results.length,
    required_minimum_routes: 9,
    allbridge_options_present: results.length >= 9,
    best_route: candidates[0] || null,
    fallback_candidates: candidates.slice(1, 4),
    all_results: results,
    proof_boundary: 'Simulation only. Does not move funds, sign transactions, or call live Allbridge endpoints.',
    timestamp: new Date().toISOString()
  };

  console.log(JSON.stringify(output, null, 2));
  process.exit(output.allbridge_options_present ? 0 : 1);
}

run();
