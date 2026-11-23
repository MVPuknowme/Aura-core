import { createHash } from 'node:crypto';
import {
  canonicalPayload,
  reconcileAutoDrillLeaseUse,
  SKYGRID_SOFTWARE_OWNER_ID,
} from './autodrill-lease-use.mjs';

const EVIDENCE_FIELDS = new Set(['leases', 'usage', 'invoices', 'settlements', 'owner_payouts']);
const LIVE_PAYOUT_GAPS = Object.freeze([
  'independent_bank_source_reconciliation_required',
  'verified_founder_destination_required',
  'approved_payout_caps_and_reserves_required',
  'available_source_balance_required',
  'durable_payout_history_and_atomic_reservations_required',
  'bank_payout_adapter_and_execution_grant_required',
]);
const digest = value => `sha256:${createHash('sha256').update(canonicalPayload(value)).digest('hex')}`;

/**
 * Account for signed operating receipts attributable to the founder.
 * This is the preparation boundary for future automatic payouts, never a
 * withdrawal balance, execution grant, bank adapter, or disbursement receipt.
 */
export function prepareFounderPayout(input, options = {}) {
  const now = options.now ?? Date.now();
  const result = {
    schema: 'skygrid.founder-payout-preflight.v1',
    service: 'SKYGRID Emergency Data On-Ramp',
    beneficiary: { id: SKYGRID_SOFTWARE_OWNER_ID, name: 'Michael Vincent Patrick', github: 'MVPuknowme' },
    rail: 'bancorp',
    currency: 'USD',
    mode: 'controlled_pilot',
    sentinel: 'fail_closed',
    status: 'BLOCKED',
    evidence_status: 'UNVERIFIED',
    payment_execution_allowed: false,
    automatic_disbursement: false,
    funds_moved: false,
    payout_amount_cents: null,
    founder_attributed_receipts_cents: '0',
    external_capacity_owner_due_cents: '0',
    allocations: [],
    evidence_failures: [],
    live_payout_gaps: [...LIVE_PAYOUT_GAPS],
  };

  if (!Number.isSafeInteger(now) || !Number.isFinite(new Date(now).getTime())) {
    result.evidence_failures = ['clock_invalid'];
    return result;
  }
  result.generated_at = new Date(now).toISOString();
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(field => !EVIDENCE_FIELDS.has(field))) {
    result.evidence_failures = ['signed_lease_use_evidence_required'];
    return result;
  }

  const report = reconcileAutoDrillLeaseUse(input, {
    trustedKeys: options.trustedKeys,
    partnerships: options.partnerships,
    now,
  });
  result.evidence_status = report.status;
  if (report.status !== 'RECONCILED') {
    result.evidence_failures = report.failures.length ? report.failures : ['revenue_evidence_missing'];
    return result;
  }

  // Only inspect envelope payloads after the existing verifier accepted the
  // entire batch. A quote, forecast, CI result, or client paid:true cannot enter.
  result.allocations = report.rows.filter(row => BigInt(row.received_cents) > 0n).map(row => {
    const sources = (input.settlements ?? [])
      .map(envelope => envelope.payload)
      .filter(payment => payment.invoice_id === row.invoice_id && payment.status === 'posted')
      .map(payment => ({
        settlement_id: payment.settlement_id,
        source_reference_hash: payment.source_reference_hash,
        amount_cents: payment.amount_cents,
        posted_at: new Date(payment.posted_at).toISOString(),
      }))
      .sort((a, b) => a.source_reference_hash.localeCompare(b.source_reference_hash));
    const allocation = {
      // The owner has requested public payout reporting. Publish business
      // references explicitly; never copy arbitrary fields from bank evidence.
      invoice_id: row.invoice_id,
      lease_id: row.lease_id,
      usage_id: row.usage_id,
      invoice_reference_hash: digest({ invoice_id: row.invoice_id, lease_id: row.lease_id, usage_id: row.usage_id }),
      received_cents: row.received_cents,
      skygrid_share_cents: row.skygrid_share_cents,
      founder_capacity_share_cents: row.capacity_owner_id === SKYGRID_SOFTWARE_OWNER_ID
        ? row.capacity_owner_share_cents : '0',
      founder_attributed_receipts_cents: row.mvp_attributable_cents,
      external_capacity_owner_due_cents: row.external_owner_due_cents,
      sources,
      source_set_hash: digest(sources),
    };
    return { ...allocation, allocation_fingerprint: digest(allocation) };
  }).sort((a, b) => a.invoice_reference_hash.localeCompare(b.invoice_reference_hash));

  result.founder_attributed_receipts_cents = report.totals.mvp_attributable_cents;
  result.external_capacity_owner_due_cents = report.totals.external_owner_due_cents;
  // This fingerprint is stable across verification timestamp refreshes. It is
  // NOT durable deduplication: a future executor must reserve each bank source
  // and track partial disbursements/reversals in a transactional ledger.
  result.allocation_fingerprint = digest(result.allocations);
  result.status = BigInt(report.totals.mvp_attributable_cents) > 0n
    ? 'AWAITING_PAYOUT_CONFIGURATION' : 'NO_ATTRIBUTABLE_RECEIPTS';
  return result;
}

/** Owner-authorized public disclosure. Use an explicit field allowlist. */
export function summarizeFounderPayout(result) {
  return {
    schema: result.schema,
    report_visibility: 'public',
    report_kind: 'payout_preflight_not_payment_receipt',
    service: result.service,
    generated_at: result.generated_at,
    beneficiary: {
      id: result.beneficiary.id,
      name: result.beneficiary.name,
      github: result.beneficiary.github,
    },
    rail: result.rail,
    currency: result.currency,
    mode: result.mode,
    sentinel: result.sentinel,
    status: result.status,
    evidence_status: result.evidence_status,
    payment_execution_allowed: false,
    automatic_disbursement: false,
    funds_moved: false,
    payout_amount_cents: null,
    founder_attributed_receipts_cents: result.founder_attributed_receipts_cents,
    external_capacity_owner_due_cents: result.external_capacity_owner_due_cents,
    allocation_fingerprint: result.allocation_fingerprint,
    allocations: result.allocations.map(allocation => ({
      invoice_id: allocation.invoice_id,
      lease_id: allocation.lease_id,
      usage_id: allocation.usage_id,
      invoice_reference_hash: allocation.invoice_reference_hash,
      received_cents: allocation.received_cents,
      skygrid_share_cents: allocation.skygrid_share_cents,
      founder_capacity_share_cents: allocation.founder_capacity_share_cents,
      founder_attributed_receipts_cents: allocation.founder_attributed_receipts_cents,
      external_capacity_owner_due_cents: allocation.external_capacity_owner_due_cents,
      source_set_hash: allocation.source_set_hash,
      allocation_fingerprint: allocation.allocation_fingerprint,
      sources: allocation.sources.map(source => ({
        settlement_id: source.settlement_id,
        source_reference_hash: source.source_reference_hash,
        amount_cents: source.amount_cents,
        posted_at: source.posted_at,
      })),
    })),
    evidence_failures: result.evidence_failures,
    live_payout_gaps: result.live_payout_gaps,
  };
}
