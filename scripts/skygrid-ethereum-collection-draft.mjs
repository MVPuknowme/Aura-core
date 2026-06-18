#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_MANIFEST = 'config/ethereum-build-locations.example.json';
const OUTPUT_DIR = process.env.SKYGRID_ETH_COLLECTION_DIR || path.join(process.cwd(), '.skygrid', 'ethereum-collection-drafts');
const manifestPath = process.env.SKYGRID_ETH_LOCATIONS_MANIFEST || process.argv[2] || DEFAULT_MANIFEST;

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function scoreLocation(location) {
  const reasons = [];
  let score = 0;

  if (location.authorized === true) {
    score += 30;
    reasons.push('authorized location');
  } else {
    reasons.push('not authorized');
  }

  if (location.status === 'observe_only' || location.status === 'pending_local_worker_report') {
    score += 20;
    reasons.push('safe observe/proof-only status');
  }

  if (['base', 'scroll', 'blockscout', 'usdc_quote_only'].includes(location.lane)) {
    score += 20;
    reasons.push('preferred non-emergency helper lane');
  }

  if (location.lane === 'ethereum_mainnet_observe_only') {
    score += 15;
    reasons.push('mainnet kept observe-only');
  }

  if (location.lane === 'device_compute_proof_only') {
    score += 15;
    reasons.push('local owner equipment requires proof report before lease draft');
  }

  return {
    score,
    recommendation: score >= 60 ? 'include_in_collection_draft' : 'hold_for_operator_review',
    reasons
  };
}

function buildDraft(manifest) {
  const locations = Array.isArray(manifest.locations) ? manifest.locations : [];
  const scored = locations.map((location) => ({
    id: location.id,
    id_hash: sha256(location.id).slice(0, 20),
    type: location.type,
    lane: location.lane,
    status: location.status,
    authorized: location.authorized === true,
    scoring: scoreLocation(location),
    proof_source: location.proof_source || null,
    notes: location.notes || null,
    allowedToExecute: false
  }));

  const included = scored.filter((item) => item.scoring.recommendation === 'include_in_collection_draft');
  const held = scored.filter((item) => item.scoring.recommendation !== 'include_in_collection_draft');

  return {
    ok: true,
    service: manifest.service || 'SKYGRID Emergency Data On-Ramp',
    mode: 'ethereum_l2_collection_distribution_draft_only',
    generated_at: nowIso(),
    manifest_path: manifestPath,
    canonical_domain: manifest.canonical_domain || 'https://aurcore.skygrid-protocol.net',
    safety: {
      observe_only: true,
      moves_funds: false,
      signs_transactions: false,
      bridges_tokens: false,
      collects_from_third_parties: false,
      executes_distributions: false,
      allowedToExecute: false,
      operator_approval_required: true
    },
    collection_draft: {
      intent: 'help_ethereum_non_emergency',
      included_locations: included,
      held_locations: held,
      recommended_order: included
        .slice()
        .sort((a, b) => b.scoring.score - a.scoring.score)
        .map((item) => ({ id: item.id, lane: item.lane, score: item.scoring.score })),
      distribution_policy: {
        current_state: 'draft_only',
        payout_execution: 'disabled',
        settlement_execution: 'disabled',
        token_movement: 'disabled',
        next_required_action: 'operator review plus local worker proof for owner equipment before lease/resource draft'
      }
    }
  };
}

async function main() {
  const manifest = await readJson(manifestPath);
  const draft = buildDraft(manifest);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `ethereum-collection-draft-${nowIso().replaceAll(':', '-').replaceAll('.', '-')}.json`);
  await fs.writeFile(outputPath, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    draft_path: outputPath,
    mode: draft.mode,
    included_locations: draft.collection_draft.included_locations.length,
    held_locations: draft.collection_draft.held_locations.length,
    allowedToExecute: false,
    next_required_action: draft.collection_draft.distribution_policy.next_required_action
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    allowedToExecute: false
  }, null, 2));
  process.exit(1);
});
