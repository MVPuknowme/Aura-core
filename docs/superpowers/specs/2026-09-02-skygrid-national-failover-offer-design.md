# SKYGRID Carrier Failover Offer Generator Design

**Date:** 2026-09-02  
**Owner:** Michael Vincent Patrick  
**Repository:** `MVPuknowme/Aura-core`  
**Product name:** SKYGRID Emergency Data On-Ramp  
**Buyer:** Carrier and network-continuity design partners

## Purpose

Add an evidence-bound `rake skygrid:offer` workflow that produces a carrier-facing proof-of-concept offer without converting controlled-pilot evidence into an unsupported national-deployment claim.

The generated offer will position SKYGRID as a national-scale failover-validation candidate. It will not claim that SKYGRID is the only real provider, nationally deployed, production-authorized, or guaranteed to protect a carrier network. Those claims require fresh partner WAN, regional, field, availability, recovery-time, and operational evidence that the repository does not currently contain.

## Decision

Use a thin Rake entry point over a dependency-free Node generator. The Rake task provides the requested operator command; Node performs parsing, validation, rendering, and file output in the repository's established runtime.

The implementation will:

1. Read preserved machine-readable controlled-pilot evidence.
2. Read the canonical route manifest and its fail-closed policy.
3. Reject missing, inconsistent, or production-incompatible evidence.
4. Render deterministic Markdown and JSON offer artifacts.
5. Test evidence attribution, commercial calculations, prohibited claims, and failure behavior.

## Current evidence boundary

The offer may state these facts exactly:

- The preserved 2026-07-15 GitHub Actions run was re-scored on 2026-08-20.
- Linux and Windows each scored 10.0/10 under the controlled-pilot rubric.
- Linux and Windows each passed 16 of 16 controlled scenarios.
- Each platform passed the primary, local fallback, and safe-queue route probes.
- Linux local-runtime CI p95 was 49 ms; Windows local-runtime CI p95 was 57 ms.
- Missing event IDs were zero in both preserved artifact sets.
- Artifact SHA-256 values matched the GitHub Actions records.
- The canonical manifest is in `controlled_pilot` mode with `sentinel: fail_closed`.
- Wallet signing, transaction broadcast, private-data movement, device activation, and production failover remain disabled.

The offer must carry these qualifications next to the metrics, not in detached fine print:

- The measurements are historical local-runtime CI evidence.
- They are not fresh WAN, carrier, AWS-region, field, RTO, SLA, production-availability, or national-deployment evidence.
- The proof supports a paid carrier validation pilot, not automatic production promotion.

## Claim policy

### Allowed claim tier: verified controlled-pilot evidence

Examples:

- "SKYGRID preserved 10/10 controlled-pilot evidence on Linux and Windows."
- "The controlled pilot exercised primary, local fallback, and safe-queue route decisions."
- "The evidence supports a carrier WAN and regional failover proof-of-concept."

### Allowed claim tier: explicitly labeled pilot objective

Examples:

- "The pilot will measure carrier-observed routing, recovery, latency, and receipt completeness."
- "The pilot is designed to evaluate a national-scale continuity pattern across partner-approved regions."

### Prohibited claim tier

Generated artifacts must not contain any of these claims or equivalents:

- SKYGRID is the "only real" national failover protection.
- SKYGRID is nationally deployed or production-authorized.
- SKYGRID guarantees availability, recovery time, emergency response, revenue, or protection.
- Local CI latency is carrier WAN or field latency.
- A quote, contract, invoice, or projected fee is realized revenue.
- The pilot permits autonomous production failover, payment execution, wallet signing, or private-data movement.

## Commercial model

The generated carrier offer will use two commercial components:

1. A fixed 90-day pilot price supplied explicitly at generation time through `SKYGRID_PILOT_PRICE_USD`.
2. A 3% network support fee on verified routed service value after a separate production agreement and only when the routed value has a valid receipt.

`SKYGRID_PILOT_PRICE_USD` must be a positive whole-dollar integer. The generator exits with status 2 and creates no offer when the value is missing, zero, negative, fractional, or non-numeric.

The 3% rate is fixed at 300 basis points in this generator. It is disclosed as a proposed commercial term, not recognized revenue. The generated JSON records:

```json
{
  "pilot_price_usd": 25000,
  "network_support_fee_bps": 300,
  "network_support_fee_rate": 0.03,
  "revenue_recognition": "receipt_required"
}
```

The number `25000` above is an interface example, not a default. Every generated offer must use the operator-supplied price.

Patrick Holdings founder distributions, bank-account splits, and the 10% philanthropy reserve are internal treasury policy. They will not appear as carrier obligations or proof of realized revenue in the buyer-facing offer.

## Pilot offer structure

The Markdown offer will contain:

1. Buyer-facing executive proposition.
2. Verified evidence table with source dates and scope labels.
3. Current limitations and prohibited production assumptions.
4. Ninety-day carrier proof-of-concept scope.
5. Pilot phases and deliverables.
6. Acceptance evidence and success measurements.
7. Commercial terms.
8. Security, execution, and data boundaries.
9. Production-promotion gates.
10. Signature and negotiation block that does not represent acceptance.

### Ninety-day scope

- Days 1-15: partner topology, threat boundary, route inventory, telemetry contract, and baseline definition.
- Days 16-60: shadow-mode primary, partner-approved fallback, and safe-queue exercises with signed or hashed receipts.
- Days 61-90: controlled degradation drill, evidence review, measured RTO/RPO and WAN latency report, rollback assessment, and production-readiness recommendation.

### Success measurements

- All accepted pilot events have unique event IDs.
- All route decisions have an attributable receipt.
- Primary, partner-approved fallback, and safe-queue modes are exercised.
- Unsafe or unauthorized actions fail closed.
- WAN latency, recovery time, recovery point, and availability are measured and labeled as pilot results.
- No production promotion occurs without written partner and operator approval plus the required manifest policy change.

The pilot does not pre-commit a WAN latency, RTO, RPO, or availability threshold. Those values must be measured with the partner before they can become contractual service levels.

## Architecture

### `Rakefile`

Defines `skygrid:offer`. It validates that `SKYGRID_PILOT_PRICE_USD` is present and invokes the Node generator. It contains no evidence parsing, copy assembly, or financial calculations.

Expected use:

```powershell
$env:SKYGRID_PILOT_PRICE_USD = "25000"
rake skygrid:offer
```

### `scripts/build-skygrid-carrier-offer.mjs`

Exports focused functions for tests and provides a CLI entry point:

- `loadOfferEvidence({ evidencePath, manifestPath })`
- `validateOfferEvidence({ evidence, manifest })`
- `buildOfferModel({ evidence, manifest, pilotPriceUsd, generatedAt, sourceRef })`
- `renderOfferMarkdown(model)`
- `writeOfferArtifacts({ model, markdown, outputDir })`

The CLI uses these defaults:

- Evidence: `artifacts/pilot-evidence/2026-08-20-controlled-pilot-rescore.json`
- Manifest: `config/skygrid-route-manifest.json`
- Output directory: `artifacts/offers`
- Markdown: `skygrid-carrier-failover-poc-offer.md`
- JSON: `skygrid-carrier-failover-poc-offer.json`

`SKYGRID_OFFER_GENERATED_AT` and `SKYGRID_OFFER_SOURCE_REF` may be supplied for deterministic CI generation. Otherwise the generator uses the current UTC timestamp and current Git commit when available. Evidence source dates and artifact hashes always come from the evidence file.

### `tests/skygrid-carrier-offer.test.mjs`

Uses Node's built-in test runner and temporary directories. Tests import the real generator functions without network calls or mocks.

### `package.json`

Adds:

- `offer:generate`: run the Node generator.
- `offer:test`: run the focused Node tests.
- `offer:verify`: run tests and generate a deterministic sample artifact with an explicit test price.

The repository-wide build is not expanded in this change; the focused offer verification command becomes the acceptance command for the feature branch.

## Validation rules

Generation fails closed when any of these conditions is true:

- Evidence type is not `historical-ci-artifact-rescore`.
- Source workflow did not complete successfully.
- Either platform did not pass.
- Either platform score, scenario count, route count, or missing-event-ID value is absent or inconsistent.
- The cross-platform result is not passing.
- The limitations array is empty.
- Manifest mode is not `controlled_pilot`.
- Manifest sentinel is not `fail_closed`.
- Any of `device_activation`, `production_failover`, `private_data_movement`, `wallet_signing`, or `transaction_broadcast` is not exactly `false`.
- Pilot price is invalid.
- Output paths resolve outside the chosen output directory.

On failure, the command writes a concise error to stderr, exits nonzero, and leaves no partial Markdown or JSON artifact.

## Output contract

The JSON artifact records:

- schema version and offer type;
- generation timestamp and source ref;
- buyer class and 90-day scope;
- exact evidence provenance, artifact IDs, SHA-256 values, metrics, and limitations;
- manifest mode and disabled execution capabilities;
- fixed pilot price and 300-basis-point proposed support fee;
- claim tier and production-promotion gates;
- `contract_status: "offer_draft"`;
- `revenue_status: "unrealized"`.

The Markdown artifact is rendered exclusively from this validated model so the human-readable and machine-readable offers cannot drift.

## Testing strategy

Implementation follows red-green-refactor:

1. A failing test defines successful model construction from preserved evidence.
2. A failing test defines price validation and no-output-on-error behavior.
3. A failing test defines exact metric and provenance rendering.
4. A failing test rejects unsafe manifest capability changes.
5. A failing test scans generated copy for prohibited claims and guarantee language.
6. A failing test proves deterministic Markdown and JSON output under fixed timestamp and source-ref inputs.
7. The Rake task is exercised with an explicit price and its two output files are inspected.

No test may treat forecasts, invoices, quotes, or proposed routed value as collected revenue.

## Security and side-effect boundary

- No network access is required to generate the offer.
- No secrets, wallet data, banking details, or personal payment destinations are read.
- No transaction, payment, deployment, failover, DNS, infrastructure, or account mutation occurs.
- The only write surface is the selected offer-output directory.
- Existing evidence and manifest files are read-only inputs.
- Offer generation cannot change `production_failover` or any other execution policy.

## Release boundary

This feature is complete when:

- the focused tests demonstrate the full red-green cycle;
- `rake skygrid:offer` produces both artifacts with an explicit pilot price;
- generated artifacts contain all verified qualifications and none of the prohibited claims;
- the diff is reviewed for evidence accuracy and treasury-policy separation;
- a pull request reports the exact verification commands and results.

The feature does not make SKYGRID nationally deployed, production-authorized, exclusive, or guaranteed. It creates a verifiable offer for the carrier pilot that can produce the missing WAN and field evidence.
