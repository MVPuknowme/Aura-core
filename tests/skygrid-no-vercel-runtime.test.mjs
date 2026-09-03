import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pnpkPath = path.join(root, 'bridge', 'skygrid-emergency-onramp.pnpk');

function loadPolicy() {
  return JSON.parse(fs.readFileSync(pnpkPath, 'utf8'));
}

test('canonical SKYGRID policy does not allow Vercel as a runtime or ramp', () => {
  const policy = loadPolicy();

  assert.equal(policy.service, 'SKYGRID Emergency Data On-Ramp');
  assert.equal(policy.sentinel, 'fail_closed');
  assert.equal(policy.platforms?.cloudflare_worker?.enabled, true);
  assert.equal(policy.platforms?.cloudflare_worker?.primary, true);
  assert.equal(policy.platforms?.aws_lambda?.enabled, true);
  assert.equal(Object.hasOwn(policy.platforms || {}, 'vercel'), false, 'platforms.vercel must be removed');

  for (const [partitionName, partition] of Object.entries(policy.partitions || {})) {
    const ramps = Array.isArray(partition?.allowed_ramps) ? partition.allowed_ramps : [];
    assert.equal(ramps.includes('vercel'), false, `${partitionName} must not allow vercel`);
  }

  assert.notEqual(policy.aura_core_ai_switch?.selected_ramp_ref, 'platforms.vercel.active_ramp_policy');
  assert.equal(String(policy.aura_core_ai_switch?.purpose || '').toLowerCase().includes('vercel'), false);
});
