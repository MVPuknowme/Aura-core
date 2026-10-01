# Auto-Drill regional lease fabric

This layer turns Auto-Drill into a regionally distributed **planning fabric**
for elastic compute and lease-space discovery.

It intentionally does not use the phrase "limitless compute" as a technical
guarantee. The operating target is elastic capacity across many providers and
regions, bounded by actual inventory, budget, policy, and explicit activation
grants.

## Regional Aura agents

Each selected region receives a policy-identical, region-scoped Aura planning
identity. These agents may:

- evaluate route and provider health;
- rank PNPK-approved lease offers;
- prepare reservation envelopes;
- emit hash-bound planning receipts.

They may not independently:

- spend money;
- sign wallets;
- broadcast transactions;
- switch production networks;
- provision cloud resources;
- partition disks;
- select philanthropic beneficiaries.

This preserves the existing rule that Aura reasons inside PNPK law.

## Lease discovery

A candidate is eligible only when:

1. PNPK returned `ROUTE_APPROVED`;
2. a hash-bound receipt is present;
3. owner agreement status is sufficiently advanced;
4. health and latency stay inside policy;
5. regional and aggregate spend remain inside explicit caps.

The planner selects at most one winning offer per region. An actual deployment
still requires a separate activation/provisioning grant.

## Social-return reconciliation

The lease fabric does not turn projected lease economics into charitable funds.

Only positive, evidence-backed net realized income may flow from the verified
revenue ledger into philanthropy governance. Regional operating profits can
therefore support the existing HRJ=2 / philanthropy framework after
reconciliation.

Programs intended to benefit economically or socially disadvantaged people
must use separate lawful, needs-based governance. Regional Aura agents cannot
infer protected traits or autonomously choose beneficiaries.

## Deployment sequence

```text
capacity inventory
  -> capacity offer
  -> owner agreement
  -> PNPK route + policy preflight
  -> regional Aura ranking
  -> Auto-Drill reservation envelope
  -> explicit activation/provisioning grant
  -> cloud/provider deployment
  -> operating receipts
  -> verified revenue ledger
  -> philanthropy governance
```
