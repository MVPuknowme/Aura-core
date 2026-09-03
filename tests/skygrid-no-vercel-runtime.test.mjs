import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pnpkPath = path.join(root, 'bridge', 'skygrid-emergency-onramp.pnpk');
const manifestPath = path.join(root, 'config', 'skygrid-route-manifest.json');

function loadPolicy() {
  return JSON.parse(fs.readFileSync(pnpkPath, 'utf8'));
}

function loadManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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

test('top-level Vercel deployment entry points are removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'vercel.json')), false);
  assert.equal(fs.existsSync(path.join(root, 'scripts', 'vercel-build.mjs')), false);

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(Object.hasOwn(pkg.scripts || {}, 'operator:vercel-build'), false);
  for (const command of Object.values(pkg.scripts || {})) {
    assert.equal(String(command).includes('--vercel'), false);
  }
});

test('active API runtime identities are provider-neutral', () => {
  const activeFiles = [
    'api/health.js',
    'api/skygrid/helm.js',
    'api/skygrid/status.js',
    'api/highway/status.js',
    'api/skygrid/provenance.js'
  ];

  for (const rel of activeFiles) {
    const source = fs.readFileSync(path.join(root, rel), 'utf8').toLowerCase();
    assert.equal(source.includes('runtime: "vercel-api"'), false, `${rel} still reports vercel-api`);
    assert.equal(source.includes("runtime: 'vercel-api'"), false, `${rel} still reports vercel-api`);
  }
});

test('route manifest and sync verifier are provider-neutral after Vercel removal', () => {
  const manifest = loadManifest();
  assert.equal(Object.hasOwn(manifest.runtimes || {}, 'vercel'), false, 'manifest.runtimes.vercel must be removed');

  for (const route of manifest.routes || []) {
    assert.equal(String(route.owner || '').toLowerCase().includes('vercel'), false, `${route.id} still has Vercel owner`);
  }

  const verifier = fs.readFileSync(path.join(root, 'scripts', 'verify-skygrid-manifest-sync.mjs'), 'utf8');
  assert.equal(verifier.includes('vercel.json'), false, 'manifest sync verifier must not require removed vercel.json');
});
