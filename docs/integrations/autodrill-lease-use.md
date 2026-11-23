# AuraSky + PNPK + Auto-Drill lease-use integration

Umbrella: **https://aurasky.Skygrid-protocol.net**. Software owner and AuraSky designer: **Michael Vincent Patrick — MVPuknowme**, per founder declaration. See [exclusive licensing scope](../licensing/exclusive-rights.md).

## Reviewed software uses and pull requests

| Source | Observed behavior | Payment/activation limit |
| --- | --- | --- |
| [PR #241](https://github.com/MVPuknowme/Aura-core/pull/241), merged | Regional Auto-Drill lease planning and PNPK candidate selection | Planning envelopes; no provisioning/payment execution |
| [PR #242](https://github.com/MVPuknowme/Aura-core/pull/242), merged | Zero upfront shared-capacity rent; 350/9650 bps operating-revenue split | Availability and forecast are not payout evidence |
| [PR #150](https://github.com/MVPuknowme/Aura-core/pull/150), merged | Signed intake, replay controls and fresh Auto-Drill proof checks | Existing runtime boundary; no new lease-payment verification |
| [PR #252](https://github.com/MVPuknowme/Aura-core/pull/252), draft | PNPK transaction preview plus this lease-use reconciliation | No signer, bank execution or automatic activation |
| Existing revenue ledger | Stateless checks of submitted evidence types/references | Does not independently authenticate bank postings; do not use its evidence labels alone as proof of payment |
| Uploaded app snapshot | Flask app.py has an index route; Python sync scaffold exists | No demonstrated connection to the new Node lease/preflight API |

Inspection base for existing lease sources: ea6201c362f875541ade4ebdefe7bb825e4e57f1. No customer bank settlement was supplied or confirmed in this review. The accounting sample contains placeholder zero/unverified entries; it is not a live lease ledger or proof of zero actual revenue.

## New feature

`lib/autodrill-lease-use.mjs` verifies role-scoped Ed25519 attestations, binds signed lease terms to PNPK receipt, offer, actual metered usage, invoice and payment evidence, and reports PAID, PARTIALLY_PAID, UNPAID or UNINVOICED. Missing usage leaves status UNVERIFIED. Invalid, stale, revoked, duplicate or contradictory evidence blocks the batch.

`lib/autodrill-paid-use-plan.mjs` combines the existing regional planner with this reconciliation. Each candidate receives a billing status and continuation recommendation bound to its offer and PNPK receipt. Activation eligibility remains false; a payment assessment does not prove an activation grant.

`api/skygrid/autodrill-lease-use.mjs` exposes POST /api/skygrid/autodrill-lease-use through bearer authentication. Body accepts `candidates` and `leaseUse` only. Keys, selection policy and partnership registry come from server configuration, never caller overrides. A paid/bound recommendation returns 200; missing/unpaid/unverified assessment returns 422; unconfigured service returns 503. Output is no-store.

## Commercial model and ownership

Preserve $0 upfront capacity rent. Bill only actual contracted service units: failover_protection, validation, approved_idle_compute, routing, storage or proof_archive. Meter units and contract rates as decimal integer strings in USD cents. Match each invoice to one exact usage record and lease.

Verified operating receipts split 350 bps to the SKYGRID software/system side and 9650 bps to the capacity-owner side. Fractional cents round down the 350 bps share; the capacity side receives the remainder, so allocation always equals received cents.

When capacity_owner_id is `michael-vincent-patrick`, both components are attributed to the founder. No external partner payout is required or invented. For any other capacity owner, an independently configured partnership agreement must match the signed lease; external owner-share payment stays PENDING until matching signed outgoing payment evidence is reconciled. This capacity participation does not transfer software ownership.

## Attestation input

leaseUse contains arrays `leases`, `usage`, `invoices`, `settlements`, `owner_payouts`. Each item is `{key_id, payload, signature}`. Signatures are base64 Ed25519 signatures over UTF-8 recursively key-sorted JSON of the payload, using `canonicalPayload`. Production code verifies only; no signing key or bank adapter is included.

Every payload requires role schema `skygrid.autodrill-<role>.v1` and verified_at. Roles: lease, usage, invoice, settlement, owner_payout. Attestations must have been independently reverified within 24 hours. Key configuration is role -> key_id -> `{publicKey, revoked:false, validFrom, validUntil}` with an Ed25519 SPKI PEM public key. Only authorize role keys for actual source verification; a signed unsupported assertion still is not independent bank confirmation.

| Role | Required payload fields beyond schema/verified_at |
| --- | --- |
| lease | lease_id, offer_id, software_owner_id, capacity_owner_id, partnership_agreement_id, starts_at, ends_at, commercial_model, upfront_capacity_cost_cents, skygrid_fee_bps, capacity_owner_share_bps, pnpk_decision, pnpk_receipt_hash, owner_agreement_hash, rates_cents |
| usage | usage_id, lease_id, offer_id, service_class, starts_at, ends_at, units, pnpk_receipt_hash |
| invoice | invoice_id, lease_id, usage_id, currency, amount_cents, due_at |
| settlement | settlement_id, source_reference_hash, invoice_id, lease_id, rail, currency, amount_cents, status, beneficiary_id, posted_at |
| owner_payout | payout_id plus settlement fields except settlement_id |

Only rail `bancorp`, currency USD and posted payments count. Pending/reversed payments do not. Source-reference hashes and IDs cannot be reused inside a batch. Overpayment or payout above the received owner share blocks pending allocation review. No raw bank identifiers appear in output.

For owned capacity, partnership_agreement_id is null. For partner capacity, server registry entries map capacity owner ID to `{agreement_id, owner_agreement_hash}`. An agreement ID string alone is not verification: registry maintenance requires checking the underlying signed agreement.

## Configuration

- PNPK_PREFLIGHT_API_TOKEN: private server token at least 32 characters; never ship it to frontend code.
- PNPK_AUTODRILL_VERIFICATION_KEYS_JSON: role-scoped verifier registry described above.
- PNPK_AUTODRILL_PARTNERSHIPS_JSON: defaults to {}; no partners presumed.
- PNPK_AUTODRILL_SELECTION_POLICY_JSON: defaults to existing planner defaults.

The provider ingestion layer must fetch actual Bancorp statements/events, reconcile amount, beneficiary, posting/reversal state and invoice, then supply independently verified attestations. That source adapter is not configured here. Do not sign a client-provided `paid:true` declaration as evidence.

## Verification and next implementation boundary

Node 24 tests cover the new verifier, ownership attribution, unpaid/partial/reversed payments, duplicate usage/settlements, signatures, revoked/stale keys, invoice/lease/PNPK binding, API authentication and unmetered planner recommendations. Existing regional fabric and revenue-ledger tests are run alongside them. No live bank, charge, invoice delivery, partner payout or lease activation is performed by these tests.

This API is stateless. To ensure ongoing usage is actually billed and enforced, the execution/metering layer must persist usage and invoice IDs uniquely, maintain a full settlement allocation ledger across requests, reconcile reversals, and enforce the continuation result together with independent PNPK/activation authorization. Batch deduplication does not prevent cross-request payment reuse. There is no durable meter or executor/payment hook in this change; do not claim global lease-payment enforcement yet.

Future release sequence: authenticated usage meter -> durable invoice linkage -> approved Bancorp posting reconciliation -> owner-share tracking -> executor hold policy -> observed live proof. Payments already received and partner shares actually paid must be reported separately. No upfront-rent obligation is introduced by the continuation recommendation.
