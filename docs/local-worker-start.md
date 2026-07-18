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
- reads filesystem capacity without changing the disk layout
- reads NVIDIA inventory with `nvidia-smi` when available
- writes a local proof report and a capacity-offer `.pnpk`

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

It also writes a `lease_<id>.pnpk` offer in that directory. The offer contains
resource options derived from the inventory. A system or boot disk is always
reservation-only; partitioning is offered only when a later signed disk-layout
proof identifies unallocated space on a non-system disk.

The console prints a summary like:

```json
{
  "ok": true,
  "worker": "skygrid-local-worker",
  "mode": "owner_equipment_local_proof_only",
  "capacity_pnpk_path": ".skygrid/proofs/lease_<id>.pnpk",
  "capacity_options": ["compute-node", "proof-only"],
  "eligible_for_lease_draft": true,
  "allowedToExecute": false,
  "recommended_lane": "device_compute_proof_only"
}
```

## What to do after a successful proof

Open `/lease` on the SKYGRID website to run a browser preflight, select an
option, and accept the controlled-pilot agreement. The site returns a
downloadable agreement `.pnpk` receipt.

For durable agreement storage, configure the Vercel environment variable
`SKYGRID_EDGE_LEASE_URL` with the public origin of the Cloudflare Worker. The
Worker persists offers and receipts to the `MY_DB` D1 binding.

Attach or reference the local proof report in the operator review.

The draft may recommend capacity contribution, but disk partitioning, compute
enrollment, and GPU activation remain disabled until a separate signed
activation grant passes operator review. Existing partitions are never shrunk
or deleted by this flow.

## Guardrail

Use this only on equipment you own or explicitly control. Do not use this worker on third-party devices or networks.
