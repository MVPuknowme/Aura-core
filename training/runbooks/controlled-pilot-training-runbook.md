# SKYGRID Controlled-Pilot Training Runbook

Product: **SKYGRID Emergency Data On-Ramp**

## Objective

Run simulated emergency, outage, responder, system-health, and continuity events through SKYGRID, produce auditable receipts, and verify that all real-world execution remains blocked behind operator review.

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

## Standard command

Use the branch alias until the custom domain is promoted:

```powershell
cd E:\Aura-core

git pull --rebase origin MVPuknowme

$env:SKYGRID_TRAINING_BASE_URL="https://aura-core-git-mvpuknowme-home-e539c0b1.vercel.app"
node scripts/skygrid-training-drill.mjs
```

Optional explicit form:

```powershell
node scripts/skygrid-training-drill.mjs `
  --base-url=https://aura-core-git-mvpuknowme-home-e539c0b1.vercel.app `
  --scenario-file=training/scenarios/skygrid-auto-drill-v1.json `
  --out-dir=training/receipts
```

## After the run

1. Open the newest file in `training/receipts/`.
2. Confirm `ok: true`, `failed: 0`, and every scenario has `passed: true`.
3. Commit the receipt:

```powershell
git add training\receipts\*.json
git commit -m "Add SKYGRID training drill receipt"
git push origin MVPuknowme
```

## Escalation rule

A successful training run proves only that the controlled-pilot lane can receive, classify, and receipt simulated events. It does not authorize production failover, dispatch, payments, wallet signing, or external data movement.
