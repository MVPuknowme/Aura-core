import { readFile } from 'node:fs/promises';
import { verifySwitchPreRuns } from './verify-switch-preruns.mjs';

const pnpkPath = process.env.PNPK_PATH || 'bridge/skygrid-emergency-onramp.pnpk';
const pnpk = JSON.parse(await readFile(pnpkPath, 'utf8'));

const policy = pnpk.platforms?.vercel?.active_ramp_policy;
const ramps = pnpk.platforms?.vercel?.ramps || {};

if (!policy || !pnpk.aura_core_ai_switch?.enabled) {
  console.error('Aura-Core AI ramp switch is not enabled in PNPK');
  process.exit(1);
}

let preRunVerification;
try {
  preRunVerification = await verifySwitchPreRuns(pnpk);
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    active_ramp: null,
    decision: 'fail_closed',
    reason: `switch_prerun_failed: ${error.message}`
  }, null, 2));
  process.exit(1);
}

function allowedRampHealthPayload(payload) {
  return Boolean(
    payload &&
    payload.ok === true &&
    payload.mode === 'controlled_pilot' &&
    payload.sentinel === 'fail_closed'
  );
}

async function checkRamp(name, ramp) {
  const url = new URL(ramp.health_route || '/api/health', ramp.domain).toString();

  try {
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    const text = await response.text();
    let payload = null;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    const healthy = response.status === 200 && allowedRampHealthPayload(payload);

    return {
      name,
      url,
      status: response.status,
      healthy,
      payload
    };
  } catch (error) {
    return {
      name,
      url,
      status: 0,
      healthy: false,
      error: error.message
    };
  }
}

const orderedRampNames = [
  policy.default_ramp,
  policy.fallback_ramp,
  ...Object.keys(ramps).filter((name) => name !== policy.default_ramp && name !== policy.fallback_ramp)
].filter(Boolean);

const results = [];

for (const name of orderedRampNames) {
  const ramp = ramps[name];
  if (!ramp?.enabled) continue;
  const result = await checkRamp(name, ramp);
  results.push(result);
  if (result.healthy) {
    console.log(JSON.stringify({
      ok: true,
      active_ramp: name,
      active_url: ramp.domain,
      health_url: result.url,
      reason: 'first healthy PNPK-approved Vercel ramp',
      pre_run_verification: preRunVerification,
      results
    }, null, 2));
    process.exit(0);
  }
}

console.log(JSON.stringify({
  ok: false,
  active_ramp: null,
  reason: policy.no_healthy_ramp_behavior || 'fail_closed_no_route_activation',
  pre_run_verification: preRunVerification,
  results
}, null, 2));
process.exit(2);
