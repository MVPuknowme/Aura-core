# SKYGRID™ Dimension Adapters Evidence Plane

**Source:** `MVPuknowme/dimension-adapters`  
**Source branch:** `master`  
**Mode:** read-only evidence ingestion  
**Authority:** none for settlement, signing, or transaction broadcast

## Purpose

Use the Dimension Adapters repository as a normalized economic and route-observation source for SKYGRID™.

The repository follows DefiLlama dimension-adapter conventions and includes bridge-aggregator, fee/revenue, DEX, derivatives, open-interest and related adapters. The useful SKYGRID boundary is measurement and reconciliation, not execution.

The integration rule is:

```text
Dimension Adapters observe/measure.
SKYGRID™ normalizes and reasons.
PNPK validates provenance and policy.
Settlement remains separately authorized.
```

## High-value dimensions

Bridge aggregators:
- `dailyBridgeVolume` — cross-chain volume routed through an aggregator.

Fees/revenue:
- `dailyFees` — gross protocol fees.
- `dailyRevenue` — portion retained by protocol.
- `dailySupplySideRevenue` — value paid to LPs/lenders/stakers/integrators/referrers/creators.
- `dailyProtocolRevenue` — treasury allocation when exposed.
- `dailyHoldersRevenue` — tokenholder distributions when applicable.

Other useful metrics:
- `dailyVolume`
- `openInterestAtEnd`

These dimensions are evidence inputs only. They do not prove SKYGRID customer revenue, ownership, entitlement, or settlement by themselves.

## Provenance contract

Every imported observation must bind:

- source repository: `MVPuknowme/dimension-adapters`;
- source branch or immutable commit SHA;
- adapter path;
- observation start/end timestamps;
- chain/network identity;
- adapter category;
- returned dimension names and values;
- source record hash;
- normalization hash;
- PNPK receipt ID.

A branch name alone is not sufficient for durable evidence. Production receipts should record the exact source commit SHA used.

## Normalized event

```json
{
  "schema": "skygrid.dimension_observation.v1",
  "source": {
    "provider": "dimension-adapters",
    "repository": "MVPuknowme/dimension-adapters",
    "commit_sha": "<immutable sha>",
    "adapter_path": "bridge-aggregators/<adapter>/index.ts"
  },
  "window": {
    "start": "ISO-8601",
    "end": "ISO-8601"
  },
  "network": {
    "chain": "base",
    "route_network_id": "eip155:8453"
  },
  "dimensions": {
    "dailyBridgeVolume": "<normalized value>"
  },
  "evidence": {
    "source_hash": "sha256:...",
    "normalized_hash": "sha256:..."
  },
  "authority": {
    "execution": false,
    "settlement": false,
    "wallet_signing": false,
    "transaction_broadcast": false
  }
}
```

## PNPK gates

An observation fails closed unless:

1. repository and adapter path are allowlisted;
2. an immutable source commit SHA is present;
3. the observation window is explicit;
4. chain/network identity is explicit;
5. dimension names are allowlisted;
6. values are finite and non-negative where the dimension semantics require it;
7. duplicate adapter/window/network observations are deduplicated;
8. source and normalized payload hashes are recorded;
9. no secrets, RPC credentials, private keys, seed phrases or session material enter the receipt;
10. the event remains read-only and cannot invoke settlement.

## Accounting boundary

Dimension Adapter metrics must never be booked directly as SKYGRID revenue.

For example:

- `dailyBridgeVolume` is routed volume, not SKYGRID income;
- `dailyFees` is protocol-level gross fees for the measured protocol, not automatically SKYGRID fees;
- `dailyRevenue` is revenue attributed to the measured protocol, not automatically an amount payable to MVP/SKYGRID;
- adapter output can support market sizing, route utilization, counterparty diligence, or reconciliation;
- SKYGRID revenue recognition still requires the existing evidence chain: named counterparty, agreement/terms, invoice or payment reference, actual settlement evidence, and receipt.

## Initial use cases

1. Compare bridge route utilization across candidate settlement paths.
2. Cross-check observed volume against SKYGRID route health and capacity.
3. Detect unexpected volume divergence or missing route activity.
4. Feed protocol fee/revenue observations into market and partner analysis.
5. Correlate bridge utilization with PNPK settlement preflight outcomes.
6. Provide third-party-style economic evidence without giving the adapter code authority over funds.

## Source archive

Canonical archive endpoint:

`https://codeload.github.com/MVPuknowme/dimension-adapters/zip/refs/heads/master`

For reproducible production use, prefer a commit-pinned GitHub archive or repository fetch and record the commit SHA in the PNPK receipt rather than relying solely on the moving `master` branch.

## Security

Do not vendor the full repository into the production settlement runtime merely to read metrics.

Prefer one of:

- isolated analytics worker;
- read-only CI job;
- source-pinned data extraction job;
- scheduled adapter execution with sanitized output.

Only normalized outputs cross into SKYGRID production evidence. No adapter receives wallet-signing or payment authority.
