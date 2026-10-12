import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalPayload } from '../lib/autodrill-lease-use.mjs';
import { prepareFounderPayout, summarizeFounderPayout } from '../lib/founder-payout-preflight.mjs';

const OWNER = 'michael-vincent-patrick';
const HASH = 'sha256:' + 'a'.repeat(64);
const NOW = Date.parse('2026-10-12T10:00:00Z');
const key = generateKeyPairSync('ed25519');
const iso = time => new Date(time).toISOString();

function fixture({ partner = false, amount = '10000', status = 'posted', now = NOW } = {}) {
  const trustedKeys = Object.fromEntries(['lease', 'usage', 'invoice', 'settlement', 'owner_payout'].map(role => [role, {
    test: { publicKey: key.publicKey.export({ type: 'spki', format: 'pem' }), revoked: false,
      validFrom: iso(now - 86400000), validUntil: iso(now + 86400000) },
  }]));
  const envelope = (role, fields) => {
    const payload = { schema: `skygrid.autodrill-${role}.v1`, verified_at: iso(now - 1000), ...fields };
    return { key_id: 'test', payload, signature: sign(null, Buffer.from(canonicalPayload(payload)), key.privateKey).toString('base64') };
  };
  const input = {
    leases: [envelope('lease', { lease_id: 'lease-001', offer_id: 'offer-001', software_owner_id: OWNER,
      capacity_owner_id: partner ? 'partner-001' : OWNER, partnership_agreement_id: partner ? 'agreement-001' : null,
      starts_at: iso(now - 7200000), ends_at: iso(now + 7200000), commercial_model: 'shared_capacity_revenue_share',
      upfront_capacity_cost_cents: '0', skygrid_fee_bps: 350, capacity_owner_share_bps: 9650,
      pnpk_decision: 'ROUTE_APPROVED', pnpk_receipt_hash: HASH, owner_agreement_hash: HASH, rates_cents: { validation: '100' } })],
    usage: [envelope('usage', { usage_id: 'usage-001', lease_id: 'lease-001', offer_id: 'offer-001', service_class: 'validation',
      starts_at: iso(now - 3600000), ends_at: iso(now - 1800000), units: '100', pnpk_receipt_hash: HASH })],
    invoices: [envelope('invoice', { invoice_id: 'invoice-001', lease_id: 'lease-001', usage_id: 'usage-001',
      currency: 'USD', amount_cents: '10000', due_at: iso(now - 10000) })],
    settlements: [envelope('settlement', { settlement_id: 'settlement-001', source_reference_hash: HASH,
      invoice_id: 'invoice-001', lease_id: 'lease-001', rail: 'bancorp', currency: 'USD',
      amount_cents: amount, status, beneficiary_id: OWNER, posted_at: iso(now - 5000) })],
    owner_payouts: [],
  };
  const options = { now, trustedKeys, partnerships: { 'partner-001': { agreement_id: 'agreement-001', owner_agreement_hash: HASH } } };
  return { input, options, envelope };
}

test('founder-owned capacity combines the 3.5% and 96.5% shares exactly once', () => {
  const { input, options } = fixture();
  const result = prepareFounderPayout(input, options);
  assert.equal(result.status, 'AWAITING_PAYOUT_CONFIGURATION');
  assert.equal(result.beneficiary.id, OWNER);
  assert.equal(result.founder_attributed_receipts_cents, '10000');
  assert.equal(result.allocations[0].skygrid_share_cents, '350');
  assert.equal(result.allocations[0].founder_capacity_share_cents, '9650');
  assert.equal(result.external_capacity_owner_due_cents, '0');
  assert.equal(result.payout_amount_cents, null);
  assert.equal(result.payment_execution_allowed, false);
  assert.equal(result.automatic_disbursement, false);
  assert.equal(result.funds_moved, false);
  assert.ok(result.live_payout_gaps.includes('durable_payout_history_and_atomic_reservations_required'));
});

test('partner capacity attributes only the founder fee and preserves the owner liability', () => {
  const { input, options } = fixture({ partner: true });
  const result = prepareFounderPayout(input, options);
  assert.equal(result.founder_attributed_receipts_cents, '350');
  assert.equal(result.external_capacity_owner_due_cents, '9650');
  assert.equal(result.allocations[0].founder_capacity_share_cents, '0');
});

test('partial receipts use exact integer rounding, not invoice face value', () => {
  const { input, options } = fixture({ partner: true, amount: '101' });
  const result = prepareFounderPayout(input, options);
  assert.equal(result.founder_attributed_receipts_cents, '3');
  assert.equal(result.external_capacity_owner_due_cents, '98');
});

for (const status of ['pending', 'reversed']) {
  test(`${status} receipts cannot fund a founder payout`, () => {
    const { input, options } = fixture({ status });
    const result = prepareFounderPayout(input, options);
    assert.equal(result.status, 'NO_ATTRIBUTABLE_RECEIPTS');
    assert.equal(result.founder_attributed_receipts_cents, '0');
    assert.deepEqual(result.allocations, []);
  });
}

for (const [name, mutate] of [
  ['forged amount', f => { f.input.settlements[0].payload.amount_cents = '9000'; }],
  ['missing keys', f => { f.options.trustedKeys = {}; }],
  ['revoked verifier', f => { f.options.trustedKeys.settlement.test.revoked = true; }],
  ['stale evidence', f => { f.options.now += 86400001; }],
  ['duplicate source', f => { f.input.settlements.push(f.envelope('settlement', { ...f.input.settlements[0].payload, settlement_id: 'different-id' })); }],
  ['wrong beneficiary', f => { f.input.settlements = [f.envelope('settlement', { ...f.input.settlements[0].payload, beneficiary_id: 'someone-else' })]; }],
  ['unapproved rail', f => { f.input.settlements = [f.envelope('settlement', { ...f.input.settlements[0].payload, rail: 'stripe' })]; }],
]) {
  test(`holds ${name} without returning an allocation`, () => {
    const f = fixture();
    mutate(f);
    const result = prepareFounderPayout(f.input, f.options);
    assert.equal(result.status, 'BLOCKED');
    assert.equal(result.founder_attributed_receipts_cents, '0');
    assert.deepEqual(result.allocations, []);
    assert.equal(result.payment_execution_allowed, false);
  });
}

test('forecasts, quotes, test receipts and self-declared approval do not authorize payouts', () => {
  for (const input of [null, [], {}, { amount: 325000, recognition: 'projected' }, { quoteOnly: true }, { paid: true }, { status: 'dev_test_execution_accepted' }]) {
    assert.equal(prepareFounderPayout(input).status, 'BLOCKED');
  }
  const { input, options } = fixture();
  assert.equal(prepareFounderPayout({ ...input, payment_execution_allowed: true }, options).status, 'BLOCKED');
  assert.equal(prepareFounderPayout(input, { ...options, payment_execution_allowed: true }).payment_execution_allowed, false);
  assert.equal(prepareFounderPayout(input, { now: NaN }).status, 'BLOCKED');
});

test('re-attestation preserves the allocation fingerprint but a changed receipt changes it', () => {
  const f = fixture();
  const original = prepareFounderPayout(f.input, f.options);
  f.input.settlements = [f.envelope('settlement', { ...f.input.settlements[0].payload, verified_at: iso(NOW) })];
  assert.equal(prepareFounderPayout(f.input, f.options).allocation_fingerprint, original.allocation_fingerprint);
  f.input.settlements = [f.envelope('settlement', { ...f.input.settlements[0].payload, amount_cents: '5000' })];
  assert.notEqual(prepareFounderPayout(f.input, f.options).allocation_fingerprint, original.allocation_fingerprint);
});

test('public summary omits amounts, business identifiers and source hashes', () => {
  const { input, options } = fixture();
  const summary = JSON.stringify(summarizeFounderPayout(prepareFounderPayout(input, options)));
  for (const privateValue of ['10000', 'invoice-001', 'settlement-001', HASH, 'allocation_fingerprint']) {
    assert.ok(!summary.includes(privateValue));
  }
});

const cli = new URL('../scripts/founder-payout-preflight.mjs', import.meta.url);
function runCli(args, env = {}) {
  return spawnSync(process.execPath, [cli.pathname, ...args], {
    encoding: 'utf8', env: { PATH: process.env.PATH, ...env },
  });
}

test('CLI holds missing/malformed inputs and does not log their contents', () => {
  assert.equal(runCli([]).status, 1);
  const result = runCli([], { SKYGRID_PAYOUT_EVIDENCE_JSON: '{private-account-canary' });
  assert.equal(result.status, 1);
  assert.ok(!(result.stdout + result.stderr).includes('private-account-canary'));
  assert.equal(runCli(['--execute']).status, 1);
});

test('CLI writes a private report, refuses overwrite, and only logs a redacted summary', () => {
  const dir = mkdtempSync(join(tmpdir(), 'founder-payout-test-'));
  try {
    const { input, options } = fixture({ now: Date.now() });
    const inputPath = join(dir, 'input.json');
    const keyPath = join(dir, 'keys.json');
    const outPath = join(dir, 'report.json');
    writeFileSync(inputPath, JSON.stringify(input));
    writeFileSync(keyPath, JSON.stringify(options.trustedKeys));
    const args = ['--input', inputPath, '--keys', keyPath, '--output', outPath];
    const result = runCli(args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, 'AWAITING_PAYOUT_CONFIGURATION');
    assert.ok(!result.stdout.includes('10000'));
    assert.equal(JSON.parse(readFileSync(outPath, 'utf8')).founder_attributed_receipts_cents, '10000');
    if (process.platform !== 'win32') assert.equal(statSync(outPath).mode & 0o777, 0o600);
    assert.equal(runCli(args).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
