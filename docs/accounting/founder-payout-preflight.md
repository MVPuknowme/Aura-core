# Founder payout preparation for Aura Recon

Beneficiary: **Michael Vincent Patrick — MVPuknowme** (`michael-vincent-patrick`).
Product: **SKYGRID Emergency Data On-Ramp**. Intended rail: **Bancorp, USD**.

This change adds a preparation boundary for the requested automatic revenue
payouts. It does **not** implement a live payout service, schedule transfers,
connect a bank account, or establish a withdrawable balance. Its output always
has `payment_execution_allowed: false`, `automatic_disbursement: false`,
`funds_moved: false`, and `payout_amount_cents: null`.

## Evidence and allocation

`lib/founder-payout-preflight.mjs` calls the existing signed Auto-Drill lease-use
verifier. Input consists only of `leases`, `usage`, `invoices`, `settlements` and
`owner_payouts` envelopes as specified in
[the lease-use integration](../integrations/autodrill-lease-use.md). Verifier keys
and partnership agreements come from separate operator configuration. Never
accept caller-supplied verification keys at a public endpoint.

Only authenticated, fresh, posted Bancorp receipts bound to actual contracted
usage and invoices contribute to the assessment. Pending/reversed receipts,
forecasts, quotes, test-payment responses and CI success do not fund payouts.
An invalid batch returns no allocations. Empty evidence remains unverified.

| Capacity ownership | Founder-attributed receipts | External owner liability |
| --- | --- | --- |
| Michael Vincent Patrick | 3.5% SKYGRID plus 96.5% capacity share, counted once | None |
| Verified partner | 3.5% SKYGRID share | Remaining 96.5%, less verified owner payments |

Amounts use integer USD cents. The 3.5% share rounds down and the capacity owner
receives the remainder. These are **gross receipt attributions**, not net profit
or money available to withdraw. Prior founder withdrawals, bank holds, taxes,
operating reserves and other obligations are not known to this assessment.

Successful reconciliation with a positive founder allocation returns
`AWAITING_PAYOUT_CONFIGURATION`. A reconciled batch with no founder-attributed
receipts returns `NO_ATTRIBUTABLE_RECEIPTS`; missing/invalid evidence returns
`BLOCKED`. No status means paid or approved to pay.

## Public payout reporting

At the owner's request, the CLI and optional workflow assessment publish an
allowlisted report marked `report_visibility: public`. It shows:

- Michael Vincent Patrick — MVPuknowme as beneficiary, the currency and rail.
- Exact founder-attributed receipt amounts and external capacity-owner dues.
- Per-allocation receipt totals and the 3.5% / 96.5% ownership components.
- Invoice, lease, usage and settlement identifiers, posting timestamps, source
  reference hashes and allocation fingerprints.
- Evidence status, outstanding integration gaps and explicit payment status.

The report remains a preflight assessment. `payout_amount_cents` is null because
no withdrawable amount or actual payment is established. Public visibility does
not change verification or execution requirements.

Raw statements, account/routing numbers, credentials, signatures and arbitrary
extra input fields are excluded. The source contract supplies source-reference
hashes; the reporter does not recover underlying bank references from hashes.
Use business identifiers intended for public disclosure in the published fields.

## Run an assessment

With Node 24, prepare the actual signed evidence and verifier registry outside
the repository. The registry contains public verification keys, not signing keys.

```bash
node scripts/founder-payout-preflight.mjs \
  --input /private/lease-use.json \
  --keys /private/verifiers.json \
  --partnerships /private/partnerships.json \
  --output /private/founder-assessment.json
```

`--partnerships` is optional for founder-owned capacity. The detailed report is
created with mode `0600` and refuses to overwrite an existing file. On Windows,
also use a directory with an appropriate private ACL. stdout contains the same
public report as the output file, including amounts and business references.
Input parsing and file errors do not print raw input or paths. Exit code 0 means reconciliation
completed, **not** that payout execution is enabled; blocked input exits 1.

Keep raw financial input and credentials outside source control. The generated
public report can be shared. The module does not need raw account/routing
numbers, wallet secrets or bank credentials.

## Aura Recon workflow integration

The existing Aura Recon workflow now tests revenue attribution and payout holds
on relevant pull requests. These tests use synthetic, locally signed fixtures;
they are not evidence of real revenue. This Node job does not change the
companion's Python backend or development-container Node version.

An optional `founder-payout-preflight` job runs only on owner-dispatched runs
from the `MVPuknowme` default branch in `MVPuknowme/Aura-core`, after all three
test jobs pass. It is off unless the repository variable
`AURA_RECON_PAYOUT_PREFLIGHT_ENABLED` is `true`. No live configuration is created
by this change.

Before enabling that assessment job, configure the GitHub environment
`aura-recon-payout-preflight` with the appropriate reviewers and branch
restrictions, then add environment secrets:

- `SKYGRID_PAYOUT_EVIDENCE_JSON`: a current, independently verified signed batch.
- `PNPK_AUTODRILL_VERIFICATION_KEYS_JSON`: the operator's verifier registry.
- `PNPK_AUTODRILL_PARTNERSHIPS_JSON`: optional verified partnership registry.

Environment naming alone does not configure reviewers or access protection.
Do not place evidence in dispatch inputs or repository variables. GitHub's
secret size limits apply; larger batches should use the private local command.
The workflow logs the public report and uploads `founder-payout-public.json`
as a run-specific artifact retained for 30 days. Only that exact generated file
is uploaded; source evidence and verifier configuration are excluded. GitHub's
normal log masking and artifact-access rules still apply. Pull requests cannot
run the evidence job or receive its secrets. The evidence is a supplied snapshot,
not an automatic bank feed. No live evidence has been supplied by this change.

## Remaining work before automatic payouts

1. Identify the actual Bancorp-connected provider/API and its configured source
   account and verified founder destination (use private provider IDs).
2. Ingest and independently reconcile bank postings, reversals and balances.
   Signing an unsupported assertion is not bank verification.
3. Approve the payout cadence, per-payment/daily caps, operating reserve and
   allocation policy. Preserve external capacity-owner liabilities.
4. Implement a durable ledger of prior withdrawals and atomic reservations of
   bank source references/amounts across runs. Handle partial disbursements,
   concurrent workers, retries, reversals and uncertain provider responses.
5. Implement the authenticated provider adapter and scoped PNPK execution grant.
   Recheck spendable balance and destination immediately before submission.
6. Reconcile accepted/pending provider requests to independently observed bank
   postings before recording `Paid`, and validate the integration in a provider
   sandbox before enabling live automation.

`allocation_fingerprint` is deterministic across refreshed attestations of the
same allocation; it is a comparison aid, **not** a reservation, idempotency
ledger, payout authority, or paid receipt. A changed cumulative receipt set has
a different fingerprint and must not cause already-disbursed funds to be paid
again. Do not use this stateless preflight as an executor.

No new payout bank, destination, cadence, limit, provider credential or live
signing authority is presumed. Existing wallet-signing configuration does not
supply a Bancorp adapter or authorize an unbound payment.
