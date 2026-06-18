#!/usr/bin/env node

import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const SERVICE_NAME = 'SKYGRID Emergency Data On-Ramp';
const WORKER_NAME = 'skygrid-local-worker';
const VERSION = '0.1.0-owner-equipment-proof';
const DEFAULT_BASE_URL = process.env.SKYGRID_BASE_URL || 'https://aurcore.skygrid-protocol.net';
const FALLBACK_BASE_URL = process.env.SKYGRID_FALLBACK_PROOF_URL || 'https://aura-core.vercel.app';
const PROOF_DIR = process.env.SKYGRID_LOCAL_PROOF_DIR || path.join(process.cwd(), '.skygrid', 'proofs');
const LOOP_COUNT = Number.parseInt(process.env.SKYGRID_LOCAL_PROOF_LOOPS || '3', 10);
const LOOP_DELAY_MS = Number.parseInt(process.env.SKYGRID_LOCAL_PROOF_DELAY_MS || '1500', 10);

const args = new Set(process.argv.slice(2));
const approved = args.has('--approve-owner-test') || process.env.SKYGRID_OWNER_APPROVED === 'true';
const useFallback = args.has('--fallback');
const baseUrl = useFallback ? FALLBACK_BASE_URL : DEFAULT_BASE_URL;

function nowIso() {
  return new Date().toISOString();
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

async function readDiskProof() {
  try {
    await fs.mkdir(PROOF_DIR, { recursive: true });
    const probePath = path.join(PROOF_DIR, '.write-test');
    const payload = `skygrid local proof write test ${nowIso()}\n`;
    await fs.writeFile(probePath, payload, 'utf8');
    const stat = await fs.stat(probePath);
    await fs.unlink(probePath);
    return {
      proof_dir: PROOF_DIR,
      writable: true,
      write_probe_bytes: stat.size
    };
  } catch (error) {
    return {
      proof_dir: PROOF_DIR,
      writable: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function networkProbe(targetBaseUrl) {
  const startedAt = Date.now();
  try {
    const target = new URL('/health.json', targetBaseUrl);
    const dns = await lookup(target.hostname);
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        accept: 'application/json,*/*;q=0.8',
        'user-agent': `${WORKER_NAME}/${VERSION}`
      }
    });
    const text = await response.text();
    let body = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw_preview: text.slice(0, 250) };
    }

    return {
      target: target.toString(),
      dns_address_family: dns.family,
      dns_address_hash: sha256(dns.address).slice(0, 16),
      http_status: response.status,
      ok: response.ok,
      elapsed_ms: Date.now() - startedAt,
      body_summary: {
        ok: body?.ok ?? null,
        service: body?.service ?? body?.product ?? null,
        mode: body?.mode ?? null,
        sentinel: body?.sentinel ?? null,
        payment_execution: body?.payment_execution ?? body?.paymentExecution ?? body?.payment_execution_enabled ?? null,
        device_activation: body?.device_activation ?? body?.deviceActivation ?? body?.device_activation_enabled ?? null,
        production_failover: body?.production_failover ?? body?.productionFailover ?? null,
        private_data_movement: body?.private_data_movement ?? body?.privateDataMovement ?? null
      }
    };
  } catch (error) {
    return {
      target: `${targetBaseUrl.replace(/\/$/, '')}/health.json`,
      ok: false,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function getDeviceProfile() {
  const cpus = os.cpus() || [];
  const totalMem = safeNumber(os.totalmem());
  const freeMem = safeNumber(os.freemem());
  const loadAverage = os.loadavg();
  const networkInterfaces = os.networkInterfaces();
  const networkInterfaceSummary = Object.entries(networkInterfaces).map(([name, entries = []]) => ({
    name_hash: sha256(name).slice(0, 16),
    addresses: entries
      .filter((entry) => !entry.internal)
      .map((entry) => ({
        family: entry.family,
        cidr_present: Boolean(entry.cidr),
        mac_hash: entry.mac ? sha256(entry.mac).slice(0, 16) : null,
        address_hash: entry.address ? sha256(entry.address).slice(0, 16) : null
      }))
  }));

  return {
    hostname_hash: sha256(os.hostname()).slice(0, 20),
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    uptime_seconds: Math.round(os.uptime()),
    cpu_count: cpus.length,
    cpu_model_hash: cpus[0]?.model ? sha256(cpus[0].model).slice(0, 20) : null,
    load_average_1m: loadAverage[0],
    total_memory_mb: Math.round(totalMem / 1024 / 1024),
    free_memory_mb: Math.round(freeMem / 1024 / 1024),
    free_memory_percent: totalMem > 0 ? Number(((freeMem / totalMem) * 100).toFixed(2)) : null,
    network_interfaces: networkInterfaceSummary
  };
}

function scoreEligibility({ deviceProfile, diskProof, networkProofs }) {
  const reasons = [];
  let score = 0;

  if (approved) {
    score += 25;
    reasons.push('operator approval flag present');
  } else {
    reasons.push('missing --approve-owner-test flag');
  }

  if (diskProof.writable) {
    score += 20;
    reasons.push('local proof directory writable');
  } else {
    reasons.push('local proof directory not writable');
  }

  if (deviceProfile.cpu_count >= 2) {
    score += 15;
    reasons.push('CPU count supports light proof worker');
  }

  if ((deviceProfile.free_memory_mb ?? 0) >= 512) {
    score += 15;
    reasons.push('free memory supports light proof worker');
  }

  if (networkProofs.some((probe) => probe.ok && probe.http_status === 200)) {
    score += 20;
    reasons.push('runtime health endpoint reachable');
  } else {
    reasons.push('runtime health endpoint not reachable');
  }

  if (deviceProfile.load_average_1m <= Math.max(2, deviceProfile.cpu_count)) {
    score += 5;
    reasons.push('current load is acceptable for proof-only test');
  } else {
    reasons.push('current load is elevated; keep downtime worker disabled');
  }

  const eligibleForLeaseDraft = score >= 70 && approved;

  return {
    score,
    eligible_for_lease_draft: eligibleForLeaseDraft,
    allowedToExecute: false,
    allowed_to_execute_reason: 'This worker is proof-only. Lease activation, payments, routing, and device activation remain disabled until separate operator approval and production gates exist.',
    recommended_lane: eligibleForLeaseDraft ? 'device_compute_proof_only' : 'not_ready',
    alternate_lanes: ['base_status_lane', 'scroll_status_lane', 'ethereum_mainnet_observe_only'],
    reasons
  };
}

async function main() {
  const startedAt = nowIso();

  const deviceProfile = getDeviceProfile();
  const diskProof = await readDiskProof();
  const networkProofs = [];

  for (let index = 0; index < Math.max(1, LOOP_COUNT); index += 1) {
    networkProofs.push(await networkProbe(baseUrl));
    if (index < LOOP_COUNT - 1) await sleep(LOOP_DELAY_MS);
  }

  if (!networkProofs.some((probe) => probe.ok) && !useFallback) {
    networkProofs.push(await networkProbe(FALLBACK_BASE_URL));
  }

  const eligibility = scoreEligibility({ deviceProfile, diskProof, networkProofs });

  const report = {
    ok: true,
    service: SERVICE_NAME,
    worker: WORKER_NAME,
    version: VERSION,
    mode: 'owner_equipment_local_proof_only',
    started_at: startedAt,
    completed_at: nowIso(),
    operator_approved_local_test: approved,
    target_base_url: baseUrl,
    fallback_base_url: FALLBACK_BASE_URL,
    safety: {
      owner_equipment_only: true,
      reads_private_files: false,
      scans_third_party_devices: false,
      routes_third_party_traffic: false,
      signs_transactions: false,
      moves_tokens: false,
      executes_payments: false,
      activates_device: false,
      production_failover: false,
      allowedToExecute: false
    },
    device_profile: deviceProfile,
    disk_proof: diskProof,
    network_proofs: networkProofs,
    lease_readiness: eligibility
  };

  await fs.mkdir(PROOF_DIR, { recursive: true });
  const reportName = `local-worker-proof-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.json`;
  const reportPath = path.join(PROOF_DIR, reportName);
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    ok: true,
    worker: WORKER_NAME,
    mode: report.mode,
    report_path: reportPath,
    operator_approved_local_test: approved,
    eligible_for_lease_draft: eligibility.eligible_for_lease_draft,
    allowedToExecute: false,
    recommended_lane: eligibility.recommended_lane,
    score: eligibility.score,
    next_required_action: eligibility.eligible_for_lease_draft
      ? 'Attach this proof report to the post-onboarding lease/resource activation draft.'
      : 'Rerun with --approve-owner-test on owner-controlled equipment and resolve any failed proof checks.'
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    worker: WORKER_NAME,
    error: error instanceof Error ? error.message : String(error),
    allowedToExecute: false
  }, null, 2));
  process.exit(1);
});
