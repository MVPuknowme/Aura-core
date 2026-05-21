# Postman Post: SkyGrid API Layer for L2 to Mainnet Web3 Flow

## Title

SkyGrid needs a clean API bridge for Layer 2 to Mainnet Web3 movement — in and out, verified, metered, and failover-ready.

## Post

SkyGrid / Aura-Core is moving into the next integration phase: a practical API layer that can coordinate traffic, payments, proofs, and infrastructure status between Layer 2 networks and mainnet Web3 systems.

The need is simple: modern Web3 infrastructure cannot depend on one chain, one endpoint, one wallet state, or one route. Real systems need a controlled bridge layer that can see what is happening, verify the state, route the request, and record proof before value, metadata, or service logic moves between environments.

SkyGrid is building around that requirement.

We need Postman collections and API workflows that can test the full in-and-out path:

```text
User / device / node request
        ↓
SkyGrid API gateway
        ↓
Layer 2 route check
        ↓
Mainnet settlement / verification check
        ↓
Bridge status / relay status
        ↓
Proof log
        ↓
Billing / usage event
        ↓
Dashboard / Airtable / Dune / Stripe reconciliation
```

## Why this matters now

Layer 2 networks make Web3 faster and cheaper, but production systems still need mainnet-grade verification and settlement awareness. SkyGrid needs APIs that can coordinate both sides of the stack:

- L2 activity for speed, low-cost execution, and frequent usage events
- Mainnet references for settlement, finality, treasury accounting, and high-trust verification
- Bridge monitoring for in-flight status, retry logic, and failure handling
- Proof logs for billing, reconciliation, and support
- Failover routing when an RPC, bridge, ISP path, or service endpoint degrades

This is not just a blockchain feature. It is infrastructure billing, reliability, and continuity logic.

## What the Postman workspace should test

### 1. Chain health

```http
GET /api/web3/chains/health
```

Checks:

- Ethereum mainnet RPC status
- active L2 RPC status
- response time
- latest block height
- sync lag
- chain ID match
- route health

### 2. Bridge quote and route

```http
POST /api/web3/bridge/quote
```

Body:

```json
{
  "project": "aura-core/skygrid",
  "fromChain": "base",
  "toChain": "ethereum",
  "asset": "ETH",
  "amount": "0.01",
  "routePreference": "lowest-cost-safe",
  "proofRequired": true
}
```

Checks:

- route availability
- estimated fee
- estimated time
- bridge provider status
- slippage or execution risk
- proof requirement

### 3. Bridge intent creation

```http
POST /api/web3/bridge/intents
```

Creates a controlled movement intent before any transaction is executed.

Body:

```json
{
  "project": "aura-core/skygrid",
  "requestId": "skygrid-demo-001",
  "fromChain": "base",
  "toChain": "ethereum",
  "asset": "ETH",
  "amount": "0.01",
  "walletRef": "user-approved-wallet-ref",
  "purpose": "web3-infrastructure-backup",
  "billingRider": "web3_infrastructure_backup_rider",
  "requiresUserApproval": true
}
```

Checks:

- no private keys accepted
- wallet is user-approved
- amount is inside allowed policy
- billing rider is attached
- proof event is prepared

### 4. Transaction/proof status

```http
GET /api/web3/bridge/intents/:intentId/status
```

Checks:

- intent status
- source chain event
- destination chain event
- confirmation count
- bridge status
- failure/retry reason
- proof log reference

### 5. Usage metering event

```http
POST /api/billing/usage/web3-bridge
```

Body:

```json
{
  "project": "aura-core/skygrid",
  "customerRef": "cus_or_account_ref",
  "intentId": "bridge_intent_ref",
  "rider": "web3_infrastructure_backup_rider",
  "chainRef": "ethereum",
  "l2Ref": "base",
  "usageUnits": 1,
  "ethReferenceRate": "capture_at_runtime",
  "proofId": "proof_log_ref"
}
```

Checks:

- usage event is tied to a real bridge/proof event
- customer billing reference exists
- event is not double-counted
- invoice metadata can reconcile later

### 6. Failover signal

```http
POST /api/failover/signals
```

Body:

```json
{
  "project": "aura-core/skygrid",
  "signalType": "web3-route-degraded",
  "affectedRoute": "base-to-ethereum",
  "source": "rpc-monitor",
  "severity": "medium",
  "recommendedAction": "switch-rpc-or-delay-settlement",
  "proofRequired": true
}
```

Checks:

- degraded L2/mainnet route is logged
- API recommends safe failover behavior
- no automatic asset movement occurs without authorization
- billing and support riders can be attached only when service is used

## Safety boundaries

SkyGrid Web3 APIs must never require private keys, seed phrases, or raw credential storage. The API layer should coordinate state, intent, routing, proof, billing, and user-approved execution — not custody user funds without authorization.

```yaml
blocked:
  - private key submission
  - seed phrase submission
  - automatic fund movement without user authorization
  - hidden bridge execution
  - unlogged routing changes
  - unmetered infrastructure support
```

## Goal for Postman

Create a Postman workspace that proves the API path works before live deployment:

```yaml
postman_goals:
  - verify L2 and mainnet health checks
  - validate bridge quote responses
  - create safe bridge intents
  - track bridge status
  - emit proof logs
  - attach billing riders
  - record usage for monthly utility billing
  - simulate degraded routes and failover signals
```

## Final positioning

SkyGrid is not just moving Web3 traffic. It is building the API control layer that lets Layer 2 speed, mainnet verification, bridge monitoring, failover, billing, and proof logging work together.

That is the piece Web3 infrastructure needs now: clean APIs for movement in and out of Layer 2 and mainnet, with safety, usage metering, and recovery logic built in from the start.
