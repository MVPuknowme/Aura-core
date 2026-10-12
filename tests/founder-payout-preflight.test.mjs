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

test('public report discloses beneficiary, amounts and verified source references', () => {
  const { input, options } = fixture();
  const report = summarizeFounderPayout(prepareFounderPayout(input, options));
  assert.equal(report.report_visibility, 'public');
  assert.equal(report.report_kind, 'payout_preflight_not_payment_receipt');
  assert.equal(report.beneficiary.name, 'Michael Vincent Patrick');
  assert.equal(report.founder_attributed_receipts_cents, '10000');
  assert.equal(report.allocations[0].invoice_id, 'invoice-001');
  assert.equal(report.allocations[0].lease_id, 'lease-001');
  assert.equal(report.allocations[0].usage_id, 'usage-001');
  assert.equal(report.allocations[0].sources[0].settlement_id, 'settlement-001');
  assert.equal(report.allocations[0].sources[0].source_reference_hash, HASH);
  assert.equal(report.allocations[0].sources[0].amount_cents, '10000');
  assert.equal(report.payout_amount_cents, null);
  assert.equal(report.funds_moved, false);
});

test('public reporting excludes arbitrary bank fields even from signed evidence', () => {
  const { input, options, envelope } = fixture();
  input.settlements = [envelope('settlement', {
    ...input.settlements[0].payload,
    account_number: 'private-account-canary',
    routing_number: 'private-routing-canary',
    bank_token: 'private-token-canary',
    raw_statement: 'private-statement-canary',
  })];
  const result = prepareFounderPayout(input, options);
  result.bank_token = 'private-internal-canary';
  result.allocations[0].bank_token = 'private-allocation-canary';
  result.allocations[0].sources[0].bank_token = 'private-source-canary';
  const report = summarizeFounderPayout(result);
  assert.equal(report.status, 'AWAITING_PAYOUT_CONFIGURATION');
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes('private-'));
  assert.ok(!serialized.includes('account_number'));
  assert.ok(!serialized.includes('bank_token'));
});

test('invalid evidence cannot disclose its unverified amounts or references', () => {
  const { input, options } = fixture();
  input.settlements[0].payload.amount_cents = '987654321';
  input.settlements[0].payload.settlement_id = 'unverified-identifier';
  const report = summarizeFounderPayout(prepareFounderPayout(input, options));
  assert.equal(report.status, 'BLOCKED');
  assert.deepEqual(report.allocations, []);
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes('987654321'));
  assert.ok(!serialized.includes('unverified-identifier'));
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

test('CLI writes and logs the same public report while refusing overwrite', () => {
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
    const logged = JSON.parse(result.stdout);
    const written = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.deepEqual(written, logged);
    assert.equal(logged.report_visibility, 'public');
    assert.equal(logged.founder_attributed_receipts_cents, '10000');
    assert.equal(logged.allocations[0].invoice_id, 'invoice-001');
    if (process.platform !== 'win32') assert.equal(statSync(outPath).mode & 0o777, 0o600);
    assert.equal(runCli(args).status, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
