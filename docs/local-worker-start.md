# SKYGRID Local Worker Start

## Purpose

Start a proof-only local worker on owner-controlled equipment so a PC can generate the evidence needed for a lease/resource activation draft.

This is not production activation. It is a safe local proof step.

## Safety posture

The local worker:

- does not read private files
- does not scan third-party devices
- does not route third-party traffic
- does not sign transactions
- does not move tokens
- does not execute payments
- does not activate devices
- does not perform production failover
- writes a local proof report only

## Windows PowerShell start

From the Aura-Core repo root:

```powershell
pnpm install --no-frozen-lockfile
pnpm run local:worker:start
```

Fallback proof target while canonical DNS is pending:

```powershell
pnpm run local:worker:fallback
```

Proof-only mode without owner approval flag:

```powershell
pnpm run local:worker:proof
```

## Output

The worker writes a report under:

```text
.skygrid/proofs/
```

The console prints a summary like:

```json
{
  "ok": true,
  "worker": "skygrid-local-worker",
  "mode": "owner_equipment_local_proof_only",
  "eligible_for_lease_draft": true,
  "allowedToExecute": false,
  "recommended_lane": "device_compute_proof_only"
}
```

## What to do after a successful proof

Attach or reference the proof report in the post-onboarding lease/resource activation draft.

The draft may recommend capacity contribution, but execution remains disabled until operator approval and production gates are satisfied.

## Guardrail

Use this only on equipment you own or explicitly control. Do not use this worker on third-party devices or networks.
