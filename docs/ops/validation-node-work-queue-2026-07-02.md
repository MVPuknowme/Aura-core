# SKYGRID validation node work queue — 2026-07-02

## Purpose

Give the redistributed SKYGRID validation nodes useful work while keeping the system safe, auditable, and non-destructive.

This work queue is operational validation only. It does not execute payouts, verify revenue, activate production failover, or move private data.

## Current blocker stack

1. `aurcore.skygrid-protocol.net` returns `DEPLOYMENT_NOT_FOUND` because the domain is not authorized under the current `home-e539c0b1` Vercel scope.
2. Attached Vercel domains return `302` to Vercel SSO, so public route checks cannot pass until deployment protection is disabled or bypassed.
3. Node validation can still proceed using safe local fixtures and authenticated/internal checks, but public proof requires the protection fix.

## Node jobs

| Priority | Node | Role | Job | Status |
|---:|---|---|---|---|
| 1 | `vercel-public-runtime` | public route sentinel | Check `/health.json`, `/api/highway/status`, and `/api/pay/quote?amount=25` | Blocked by Vercel Authentication |
| 2 | `vercel-public-runtime` | domain binding probe | Verify and bind `aurcore.skygrid-protocol.net` to the correct project/scope | Blocked by domain authorization |
| 3 | `klamath-falls-core` | west resilience anchor | Validate telemetry fixtures against schema, including invalid fixture failure | Ready for fixture validation |
| 4 | `spx-node-001` | Oregon edge probe primary | Heartbeat-only route proof after public protection is resolved | Pilot Active |
| 5 | `spx-node-002` | Oregon edge probe secondary | Route-score and threshold modeling from safe test data | Pending Threshold |
| 6 | `accounting-sentinel` | accounting guardrail | Confirm validation changes do not alter payout/revenue states | Ready |

## Guardrails

- No unauthorized scanning.
- No traffic routing through third-party systems.
- No private payloads.
- No payout-state changes from validation topology.
- No production failover without operator approval and health quorum.
- Only owned SKYGRID endpoints and local fixtures may be tested.

## First run order

### 1. Fix public protection

Run or complete in Vercel dashboard:

```powershell
cd E:\Aura-core
npx vercel project protection disable aura-core --scope home-e539c0b1
```

Then verify:

```powershell
curl.exe -i "https://aura-core-home-e539c0b1.vercel.app/health.json"
curl.exe -i "https://aura-core-home-e539c0b1.vercel.app/api/highway/status"
curl.exe -i "https://aura-core-home-e539c0b1.vercel.app/api/pay/quote?amount=25"
```

Expected public success: `HTTP/1.1 200`, not `302`.

### 2. Fix custom domain ownership

Inspect both Vercel scopes:

```powershell
npx vercel domains inspect aurcore.skygrid-protocol.net --scope home-e539c0b1
npx vercel domains inspect aurcore.skygrid-protocol.net --scope mvpuknowmeaura-core
```

If Vercel requests a TXT verification record, add it at the DNS host for `skygrid-protocol.net`.

### 3. Run Klamath fixture validation

Use schema-backed fixture validation only. Do not promote Klamath payout status based on validation output.

### 4. Run edge heartbeat probes

Only after public endpoints return `200` without SSO. Heartbeat payloads should contain only timestamp, endpoint, status, latency, and node ID.

## Source config

```text
configs/skygrid-validation-node-work-queue.v1.json
```
