# SKYGRID Controlled-Pilot Training Runbook

Product: **SKYGRID Emergency Data On-Ramp**

## Objective

Run simulated emergency, outage, responder, system-health, continuity, and fail-closed safety events through SKYGRID. Produce auditable receipts and verify that all real-world execution remains blocked behind operator review.

## Training curriculum

The complete controlled-pilot curriculum contains **16 scenarios**:

- **5 accepted-path scenarios:** outage, emergency intake, responder routing, system health, and failover readiness without execution.
- **11 fail-closed scenarios:** missing fields, missing approvals, unknown or unapproved routes, wallet signing, transaction broadcast, payment execution, production failover, and private-data movement.

A complete run passes only at **16/16**.

## Safety posture

Training always runs with:

```text
mode=controlled_pilot
sentinel=fail_closed
production_failover=false
payment_execution=false
private_data_movement=false
wallet_signing=false
transaction_broadcast=false
operator_review_required=true
```

The fail-closed lane deliberately submits prohibited or incomplete requests and passes only when SKYGRID rejects them with the expected status and policy reason. It never asks an external system to execute the prohibited action.

## Local complete drill

Use two PowerShell windows.

### Window 1 — start the local runtime

```powershell
Set-Location E:\Aura-core
pnpm run local:runtime
```

Leave that process running.

### Window 2 — run both training lanes and score the evidence

```powershell
Set-Location E:\Aura-core

$baseUrl = "http://127.0.0.1:3000"
$outDir = "training/receipts/manual-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

pnpm run training:drill -- `
  --base-url=$baseUrl `
  --scenario-file=training/scenarios/skygrid-auto-drill-v1.json `
  --out-dir=$outDir `
  --run-id=accepted-paths

pnpm run training:fail-closed -- `
  --base-url=$baseUrl `
  --scenario-file=training/scenarios/skygrid-fail-closed-v1.json `
  --out-dir=$outDir `
  --run-id=fail-closed

pnpm run training:verify-receipts -- --dir=$outDir

pnpm run pilot:score -- `
  --receipt-dir=$outDir `
  --out="$outDir/pilot-score.json" `
  --min-score=9 `
  --p95-ms=1500
```

Expected training summaries:

```text
accepted-paths: 5/5 passed
fail-closed: 11/11 passed
combined: 16/16 passed
```

A quantitative proof passes only when:

- the complete curriculum is 16/16;
- fail-closed safety remains intact;
- the evidence score is at least 9.0/10;
- the measured local-runtime p95 is within the configured threshold;
- all event IDs and receipt evidence are present.

The generated `pilot-score.json` is the machine-readable proof for that run.

## Scoring scope

The score uses the nine dimensions already defined in `training/evaluations/auto-drill-eval-rubric.md` plus one local-runtime p95 latency dimension.

A 9/10 score cannot override a failed hard gate. If any training scenario fails or a prohibited action is reported as executed, the overall report fails regardless of the numeric score.

Loopback/CI latency is a regression measure. It is **not** a WAN, partner, AWS-region, production-availability, RTO, or field-SLA claim.

## Same-run cost evidence

Do not divide historical cloud bills across a later training run. Cost per event is valid only when the infrastructure cost can be attributed to the same run.

When same-run cost is known, add it explicitly:

```powershell
pnpm run pilot:score -- `
  --receipt-dir=$outDir `
  --out="$outDir/pilot-score.json" `
  --min-score=9 `
  --p95-ms=1500 `
  --run-cost-usd=0.01
```

The report will calculate same-run cost per measured event. Cost remains separate from the 10-point safety/functional/performance score.

## Accepted-path drill against a controlled deployment

Use the branch alias until the custom domain is promoted:

```powershell
Set-Location E:\Aura-core

$env:SKYGRID_TRAINING_BASE_URL = "https://aura-core-git-mvpuknowme-home-e539c0b1.vercel.app"
pnpm run training:drill
```

Do not run the fail-closed pack against a partner or production endpoint without the endpoint owner's explicit approval. CI runs it only against the local controlled-pilot runtime.

## Receipt review

For the accepted-path receipt, confirm:

- `ok` is `true`.
- `summary` is `5 passed / 0 failed`.
- Every event has an event identifier.
- No forbidden execution field is `true`.

For the fail-closed receipt, confirm:

- `ok` is `true`.
- `allRequestsRejected` is `true`.
- `sentinel` is `fail_closed`.
- `summary` is `11 passed / 0 failed`.
- Every scenario has the expected status and rejection reason.
- Every response remains advisory-only and training-marked.

For `pilot-score.json`, confirm:

- `passed` is `true`;
- `score >= 9`;
- all entries under `hardGates` pass;
- `metrics.scenariosPassed` is `16`;
- `metrics.missingEventIds` is `0`.

## CI proof

The existing `SKYGRID Controlled Pilot Verification` workflow runs the 16-scenario curriculum on Ubuntu and Windows.

The `SKYGRID Pilot Evidence Score` workflow adds the quantitative proof path. On both Ubuntu and Windows it:

1. runs PNPK, manifest, partition, autodrill, emergency-gate, IOC, intake-policy, and route-selection preflight checks;
2. starts the controlled local runtime;
3. runs all 16 accepted and fail-closed scenarios;
4. verifies the training receipts;
5. calculates the 10-point evidence score and p50/p95/p99 latency;
6. fails the job if any hard gate fails or the score is below 9/10;
7. uploads the receipts and `pilot-score.json` as workflow artifacts.

## Escalation rule

A successful training run proves only that the controlled-pilot lane met the repository-defined functional, routing, safety, evidence, and local-runtime performance gates for that run. It does not authorize production failover, dispatch, payments, wallet signing, transaction broadcasting, or external private-data movement.
