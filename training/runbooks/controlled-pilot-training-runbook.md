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

### Window 2 — run both training lanes

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
```

Expected console summaries:

```text
accepted-paths: 5/5 passed
fail-closed: 11/11 passed
combined: 16/16 passed
```

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

## CI proof

The `SKYGRID Controlled Pilot Verification` workflow runs both lanes on Ubuntu and Windows, verifies two receipts, requires a combined result of **16/16**, and uploads the receipts as workflow artifacts.

## Escalation rule

A successful training run proves only that the controlled-pilot lane can accept approved simulations and reject unsafe or incomplete requests. It does not authorize production failover, dispatch, payments, wallet signing, transaction broadcasting, or external private-data movement.
