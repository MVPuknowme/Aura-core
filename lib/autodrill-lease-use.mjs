import { createHash, createPublicKey, verify } from 'node:crypto';

export const SKYGRID_SOFTWARE_OWNER_ID = 'michael-vincent-patrick';
const HASH = /^sha256:[0-9a-f]{64}$/;
const CLASSES = new Set(['failover_protection', 'validation', 'approved_idle_compute', 'routing', 'storage', 'proof_archive']);
const MAX_CENTS = 10n ** 18n;

class EvidenceError extends Error {}
function requireCheck(ok, reason) { if (!ok) throw new EvidenceError(reason); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}
export function canonicalPayload(payload) { return JSON.stringify(stable(payload)); }
const hash = value => 'sha256:' + createHash('sha256').update(canonicalPayload(value)).digest('hex');
function id(value) { requireCheck(typeof value === 'string' && /^[a-zA-Z0-9_.:-]{1,128}$/.test(value), 'identifier_invalid'); return value; }
function cents(value) {
  requireCheck(typeof value === 'string' && /^(0|[1-9][0-9]{0,18})$/.test(value), 'integer_amount_invalid');
  const amount = BigInt(value);
  requireCheck(amount <= MAX_CENTS, 'integer_amount_exceeded');
  return amount;
}
function timestamp(value) {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  requireCheck(Number.isFinite(parsed), 'timestamp_invalid');
  return parsed;
}

function authenticated(envelope, role, trustedKeys, now, maxAge) {
  requireCheck(envelope && envelope.payload && typeof envelope.signature === 'string', 'signed_evidence_required');
  const key = trustedKeys?.[role]?.[envelope.key_id];
  requireCheck(key && key.revoked === false, 'trusted_current_key_required');
  const verifiedAt = timestamp(envelope.payload.verified_at);
  requireCheck(verifiedAt <= now && now - verifiedAt <= maxAge, 'evidence_stale_or_future');
  requireCheck(timestamp(key.validFrom) <= verifiedAt && now < timestamp(key.validUntil), 'key_outside_validity');
  requireCheck(envelope.payload.schema === `skygrid.autodrill-${role}.v1`, 'evidence_schema_mismatch');
  let valid = false;
  try {
    const publicKey = createPublicKey(key.publicKey);
    const signature = Buffer.from(envelope.signature, 'base64');
    valid = publicKey.asymmetricKeyType === 'ed25519' && signature.length === 64 &&
      verify(null, Buffer.from(canonicalPayload(envelope.payload)), publicKey, signature);
  } catch { /* Fail closed; no key material in errors. */ }
  requireCheck(valid, 'evidence_signature_invalid');
  return structuredClone(envelope.payload);
}

function index(items, field) {
  const out = new Map();
  for (const item of items) {
    const key = id(item[field]);
    requireCheck(!out.has(key), 'duplicate_' + field);
    out.set(key, item);
  }
  return out;
}

/** Reconcile adapter-authenticated evidence. This does not contact a bank or activate compute. */
export function reconcileAutoDrillLeaseUse(input = {}, {
  trustedKeys = {}, partnerships = {}, now = Date.now(), maxEvidenceAgeMs = 86400000
} = {}) {
  const report = {
    schema: 'skygrid.autodrill-lease-use-report.v1',
    service: 'SKYGRID Emergency Data On-Ramp',
    umbrella: 'https://aurasky.skygrid-protocol.net',
    software_owner: { id: SKYGRID_SOFTWARE_OWNER_ID, name: 'Michael Vincent Patrick', basis: 'founder_declaration' },
    mode: 'controlled_pilot', sentinel: 'fail_closed', status: 'UNVERIFIED',
    execution_allowed: false, payment_execution_allowed: false, wallet_signing_allowed: false,
    continuation_recommended: false, generated_at: new Date(now).toISOString(),
    rows: [], failures: [],
    totals: { billed_cents: '0', received_cents: '0', unpaid_cents: '0', mvp_attributable_cents: '0', external_owner_due_cents: '0' },
    evidence_scope: 'trusted-adapter signed attestations; no live bank confirmation by this evaluator',
    enforcement_scope: 'advisory reconciliation; executor integration and durable metering required'
  };
  try {
    requireCheck(Number.isFinite(now) && Number.isInteger(maxEvidenceAgeMs) && maxEvidenceAgeMs > 0 && maxEvidenceAgeMs <= 86400000, 'clock_policy_invalid');
    const roles = { leases: 'lease', usage: 'usage', invoices: 'invoice', settlements: 'settlement', owner_payouts: 'owner_payout' };
    const data = {};
    for (const [field, role] of Object.entries(roles)) {
      const items = input[field] ?? [];
      requireCheck(Array.isArray(items) && items.length <= 1000, 'evidence_batch_invalid');
      data[field] = items.map(item => authenticated(item, role, trustedKeys, now, maxEvidenceAgeMs));
    }
    const leases = index(data.leases, 'lease_id');
    index(data.leases, 'offer_id');
    const usages = index(data.usage, 'usage_id');
    const invoices = index(data.invoices, 'invoice_id');
    index(data.settlements, 'settlement_id');
    index(data.owner_payouts, 'payout_id');
    const paymentSources = new Set();
    const invoiceByUsage = new Map();
    for (const lease of leases.values()) {
      id(lease.offer_id); id(lease.capacity_owner_id);
      requireCheck(lease.software_owner_id === SKYGRID_SOFTWARE_OWNER_ID, 'software_owner_mismatch');
      requireCheck(lease.commercial_model === 'shared_capacity_revenue_share' && cents(lease.upfront_capacity_cost_cents) === 0n, 'shared_capacity_zero_rent_required');
      requireCheck(lease.skygrid_fee_bps === 350 && lease.capacity_owner_share_bps === 9650, 'canonical_share_required');
      requireCheck(lease.pnpk_decision === 'ROUTE_APPROVED' && HASH.test(lease.pnpk_receipt_hash) && HASH.test(lease.owner_agreement_hash), 'pnpk_and_agreement_required');
      requireCheck(timestamp(lease.starts_at) < timestamp(lease.ends_at), 'lease_window_invalid');
      if (lease.capacity_owner_id !== SKYGRID_SOFTWARE_OWNER_ID) {
        const partner = partnerships[lease.capacity_owner_id];
        requireCheck(partner && partner.agreement_id === lease.partnership_agreement_id && partner.owner_agreement_hash === lease.owner_agreement_hash, 'verified_partnership_required');
      } else requireCheck(lease.partnership_agreement_id === null, 'unexpected_partner_assignment');
      requireCheck(lease.rates_cents && typeof lease.rates_cents === 'object' && !Array.isArray(lease.rates_cents), 'contract_rates_required');
      for (const [service, rate] of Object.entries(lease.rates_cents)) {
        requireCheck(CLASSES.has(service), 'service_class_unsupported');
        requireCheck(cents(rate) > 0n, 'positive_service_rate_required');
      }
    }
    for (const invoice of invoices.values()) {
      requireCheck(usages.has(invoice.usage_id), 'invoice_usage_missing');
      requireCheck(invoice.lease_id === usages.get(invoice.usage_id).lease_id && invoice.currency === 'USD', 'invoice_binding_invalid');
      requireCheck(!invoiceByUsage.has(invoice.usage_id), 'duplicate_usage_invoice');
      cents(invoice.amount_cents); timestamp(invoice.due_at); invoiceByUsage.set(invoice.usage_id, invoice);
    }
    for (const payment of [...data.settlements, ...data.owner_payouts]) {
      const invoice = invoices.get(payment.invoice_id);
      requireCheck(invoice && payment.lease_id === invoice.lease_id, 'payment_invoice_binding_invalid');
      requireCheck(payment.rail === 'bancorp' && payment.currency === 'USD', 'approved_payment_rail_required');
      requireCheck(HASH.test(payment.source_reference_hash) && !paymentSources.has(payment.source_reference_hash), 'duplicate_or_invalid_payment_source');
      paymentSources.add(payment.source_reference_hash);
      requireCheck(['posted', 'reversed', 'pending'].includes(payment.status), 'payment_status_invalid');
      requireCheck(timestamp(payment.posted_at) <= now, 'payment_timestamp_future');
      cents(payment.amount_cents);
    }
    let billed = 0n, received = 0n, unpaid = 0n, attributable = 0n, ownerDue = 0n;
    for (const usage of usages.values()) {
      const lease = leases.get(usage.lease_id);
      requireCheck(lease && usage.offer_id === lease.offer_id, 'usage_lease_binding_invalid');
      requireCheck(usage.pnpk_receipt_hash === lease.pnpk_receipt_hash, 'usage_pnpk_binding_invalid');
      requireCheck(CLASSES.has(usage.service_class) && Object.hasOwn(lease.rates_cents, usage.service_class), 'contracted_service_required');
      const start = timestamp(usage.starts_at), end = timestamp(usage.ends_at);
      requireCheck(start < end && start >= timestamp(lease.starts_at) && end <= timestamp(lease.ends_at) && end <= now, 'usage_window_invalid');
      const units = cents(usage.units);
      requireCheck(units > 0n, 'positive_usage_required');
      const amount = units * cents(lease.rates_cents[usage.service_class]);
      requireCheck(amount <= MAX_CENTS, 'invoice_amount_exceeded');
      const invoice = invoiceByUsage.get(usage.usage_id);
      let paid = 0n, ownerPaid = 0n;
      if (invoice) {
        requireCheck(cents(invoice.amount_cents) === amount, 'invoice_metering_amount_mismatch');
        for (const payment of data.settlements.filter(p => p.invoice_id === invoice.invoice_id)) {
          requireCheck(payment.beneficiary_id === SKYGRID_SOFTWARE_OWNER_ID, 'settlement_beneficiary_mismatch');
          if (payment.status === 'posted') paid += cents(payment.amount_cents);
        }
        requireCheck(paid <= amount, 'overpayment_allocation_required');
        for (const payment of data.owner_payouts.filter(p => p.invoice_id === invoice.invoice_id)) {
          requireCheck(lease.capacity_owner_id !== SKYGRID_SOFTWARE_OWNER_ID && payment.beneficiary_id === lease.capacity_owner_id, 'owner_payout_beneficiary_mismatch');
          if (payment.status === 'posted') ownerPaid += cents(payment.amount_cents);
        }
      }
      const skygridShare = paid * 350n / 10000n;
      const capacityShare = paid - skygridShare;
      requireCheck(ownerPaid <= capacityShare, 'owner_payout_exceeds_share');
      const sameOwner = lease.capacity_owner_id === SKYGRID_SOFTWARE_OWNER_ID;
      const paidStatus = !invoice ? 'UNINVOICED' : paid === amount ? 'PAID' : paid === 0n ? 'UNPAID' : 'PARTIALLY_PAID';
      const currentLease = now < timestamp(lease.ends_at);
      report.rows.push({
        usage_id: usage.usage_id, lease_id: lease.lease_id, offer_id: lease.offer_id,
        service_class: usage.service_class, invoice_id: invoice?.invoice_id ?? null,
        payment_status: paidStatus, billed_cents: invoice ? amount.toString() : '0', unbilled_cents: invoice ? '0' : amount.toString(),
        received_cents: paid.toString(), unpaid_cents: (invoice ? amount - paid : 0n).toString(),
        skygrid_share_cents: skygridShare.toString(), capacity_owner_share_cents: capacityShare.toString(),
        mvp_attributable_cents: (sameOwner ? paid : skygridShare).toString(),
        capacity_owner_id: lease.capacity_owner_id,
        owner_payout_status: sameOwner ? 'SAME_OWNER_NO_EXTERNAL_PARTNER' : ownerPaid === capacityShare && capacityShare > 0n ? 'PAID' : 'PENDING',
        external_owner_due_cents: (sameOwner ? 0n : capacityShare - ownerPaid).toString(),
        overdue: Boolean(invoice && paid < amount && timestamp(invoice.due_at) < now),
        continuation_recommended: paidStatus === 'PAID' && currentLease && (sameOwner || ownerPaid === capacityShare),
        usage_evidence_hash: hash(usage), invoice_evidence_hash: invoice ? hash(invoice) : null
      });
      if (invoice) { billed += amount; unpaid += amount - paid; }
      received += paid; attributable += sameOwner ? paid : skygridShare;
      if (!sameOwner) ownerDue += capacityShare - ownerPaid;
    }
    report.status = report.rows.length ? 'RECONCILED' : 'UNVERIFIED';
    report.continuation_recommended = report.rows.length > 0 && report.rows.every(row => row.continuation_recommended);
    report.totals = { billed_cents: billed.toString(), received_cents: received.toString(), unpaid_cents: unpaid.toString(), mvp_attributable_cents: attributable.toString(), external_owner_due_cents: ownerDue.toString() };
  } catch (error) {
    report.status = 'BLOCKED'; report.failures = [error instanceof EvidenceError ? error.message : 'evidence_invalid'];
    report.rows = []; report.continuation_recommended = false;
  }
  return { ...report, report_hash: hash(report) };
}
