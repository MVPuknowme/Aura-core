# SKYGRID validation node redistribution — 2026-06-29

## Purpose

Redistribute validation responsibility while the public route stack is stable enough to continue controlled testing.

This is not a payout event and not a paid-revenue verification event.

## Current node ledger inputs

| Node | Airtable record | Region | Current status | Distribution role |
|---|---|---|---|---|
| `klamath-falls-core` | `rec454piNH86zxcy2` | Klamath Falls / Klamath County | Needs Review | west resilience anchor |
| `spx-node-001` | `recHgmSsTngwQ7XQF` | Lincoln City, Oregon | Pilot Active | primary Oregon edge probe |
| `spx-node-002` | `recI8B8jr5v6e6rVx` | Silverton Zone | Pending Threshold | secondary Oregon edge probe |
| `vercel-public-runtime` | n/a | Vercel production | route-sync redeploy ready | public route sentinel |

## Proposed validation weights

| Role | Weight | Use |
|---|---:|---|
| West resilience anchor | 50 | Klamath telemetry, region proof, west-side continuity lane |
| Primary Oregon edge probe | 25 | Lincoln City heartbeat, edge route checks, pilot proof |
| Secondary Oregon edge probe | 15 | Silverton route scoring and threshold modeling |
| Public route sentinel | 10 | Vercel/public route exposure check |

## Guardrails

- Do not change payout status because of topology redistribution.
- Do not mark Klamath output as verified revenue without source trace and payment evidence.
- Do not activate production failover from this plan alone.
- Do not move private data.
- Do not treat edge devices as validators until consent and telemetry are present.

## Health quorum for next promotion

A promotion from planned topology to active validation ring requires:

1. Public route check passes on the selected production domain.
2. `klamath-falls-core` has schema-backed telemetry proof.
3. The invalid telemetry fixture fails as expected.
4. At least one Oregon edge probe reports a fresh heartbeat.
5. Route-check results are logged to a proof artifact.
6. Accounting status remains separate from validation status.

## Source config

See:

```text
configs/skygrid-validation-node-distribution.v1.json
```
