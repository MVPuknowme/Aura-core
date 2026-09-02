# Bank Phoenix Pay Design

## Status

Approved architecture for implementation planning. This design extends Aura-Core / Sun Pay Phoenix with a fail-closed multi-network asset movement fabric while preserving the existing accounting source of truth and the audited Phoenix Legacy boundary.

## Goal

Build Bank Phoenix Pay as an Aura-Core settlement orchestration layer that can describe, quote, prepare, authorize, receipt, and reconcile movement of registered fiat and crypto assets across supported networks without embedding custody secrets or weakening existing payment-execution controls.

## Non-goals

- Do not modify the audited Phoenix Legacy Solana program in `MVPuknowme/phoenix-v1`.
- Do not add autonomous wallet signing, private-key custody, seed-phrase handling, or unattended bank release.
- Do not claim a movement is `Paid` until chain, bank, or processor evidence is reconciled.
- Do not treat an unknown asset, bridge, network, or bank destination as routable.
- Do not store full bank account numbers, routing numbers, bank credentials, Plaid access tokens, wallet private keys, or seed phrases.

## Existing boundaries to preserve

Aura-Core currently exposes quote-only payment behavior at `/api/pay/quote`. The guarded BasePay action provider validates Base mainnet / Base Sepolia, USDC, recipient allowlists, amount caps, and requires external wallet approval. The Aura-Core ramp manifest blocks wallet signing, Allbridge transaction execution, and payment execution. Sun Pay Phoenix accounting separates `Needs Review`, `Projected`, `Estimated`, `Verified`, `Pending Payout`, and `Paid` and requires settlement references before final classification.

The `phoenix-v1` repository remains an attributed maintenance fork of Phoenix Legacy. Aura/SKYGRID integration must consume it through clients, SDKs, indexed events, or adapters outside the audited on-chain source.

## Architecture

Bank Phoenix Pay is split into six focused units:

1. **Asset and network registry** — canonical identifiers and movement capabilities.
2. **Route planner** — produces deterministic movement plans without executing them.
3. **Policy engine** — applies allowlists, amount limits, network gates, operator approval requirements, and fail-closed rules.
4. **Settlement adapters** — prepare provider-specific intents for EVM, Solana/Phoenix, bridge, and fiat rails.
5. **Receipt and reconciliation engine** — records immutable movement intent metadata and promotes status only from external settlement evidence.
6. **HTTP/API facade** — exposes quote, route, prepare, and reconcile operations while preserving current `/api/pay/quote` compatibility.

No component may possess both secret material and unilateral broadcast authority.

## Canonical movement model

A movement request is normalized to:

```json
{
  "movement_id": "phx_<uuid>",
  "source": {
    "network": "base",
    "chain_id": 8453,
    "asset_id": "USDC",
    "amount": "25.00"
  },
  "destination": {
    "network": "bank-us",
    "asset_id": "USD",
    "destination_ref": "sofi-checking-****1234"
  },
  "constraints": {
    "max_fee_bps": 300,
    "max_slippage_bps": 100,
    "operator_approval_required": true
  }
}
```

Amounts are decimal strings at API boundaries to prevent binary floating-point accounting drift. Adapters convert to integer base units only after registry validation supplies asset decimals.

## Registry

The registry records each network and asset with explicit capabilities. Required fields:

- `network_id`
- `family`: `evm | solana | fiat | internal`
- `chain_id` or `cluster` when applicable
- `asset_id`
- `symbol`
- `decimals`
- `movement_modes`: `native_transfer | token_transfer | swap | bridge | bank_offramp | bank_onramp`
- `adapter_id`
- `enabled`

Initial implementation should include only routes already supported or safely preparable by the repository: Base USDC, Solana/Phoenix advisory integration, generic EVM descriptors, Allbridge advisory bridge descriptors, USD bank destinations, and ledger-only internal settlement. Additional networks and assets are added through registry entries plus adapter tests rather than special-case branching.

Unknown or disabled registry entries fail closed.

## Route planner

The planner constructs a sequence of typed legs. Example:

`SOL/Solana -> USDC/Solana -> bridge advisory -> USDC/Base -> bank off-ramp -> USD`

Each leg contains:

- input/output network and asset
- adapter
- quote source
- estimated fee
- slippage ceiling where applicable
- approval requirement
- execution capability: `advisory | prepare_only | externally_authorized`

The planner must not invent liquidity, exchange rates, bridge support, or bank availability. Missing quote/provider evidence yields `route_unavailable` or `requires_more_proof`.

## Policy engine

Policy is evaluated before a route is returned and again before an intent is prepared. Minimum controls:

- source and destination network allowlists
- asset allowlists
- per-adapter maximum amount
- recipient/destination allowlists where configured
- explicit chain/cluster match
- operator approval requirement
- bridge availability evidence
- bank destination verification state
- duplicate movement-id protection
- maximum route fee and slippage ceilings

Default posture is `fail_closed`.

The existing BasePay constraints remain authoritative for Base USDC preparation. Bank Phoenix Pay may wrap them but may not silently expand their execution scope.

## Settlement adapters

Adapters implement one interface:

```ts
interface SettlementAdapter {
  id: string;
  supports(input: MovementLeg): boolean;
  quote(input: MovementLeg): Promise<LegQuote>;
  prepare(input: MovementLeg, context: PrepareContext): Promise<PreparedLeg>;
  reconcile(evidence: SettlementEvidence): Promise<ReconciliationResult>;
}
```

Initial adapter classes:

- `BaseUsdcAdapter`: wraps current guarded BasePay preparation semantics.
- `SolanaPhoenixAdapter`: consumes Phoenix/Solana market or client information but never edits the Phoenix Legacy program and defaults to prepare-only/advisory behavior.
- `EvmTransferAdapter`: generic descriptor and preparation boundary for allowlisted EVM networks.
- `AllbridgeAdvisoryAdapter`: route/quote advisory only until a separately authorized execution path exists.
- `BankOfframpAdapter`: creates a bank payout intent against a verified masked destination and requires external provider/bank authorization.
- `LedgerOnlyAdapter`: internal non-cash accounting movement; never reports bank or chain settlement.

## Bank boundary

A bank destination is represented only by an internal destination ID and masked label. Provider secrets and full bank coordinates remain outside GitHub, Airtable, receipts, and API payloads.

A bank leg can move to `Pending Payout` only when:

- destination verification is present,
- amount and currency are exact,
- operator approval is present,
- the configured provider accepts the prepared payout request.

A bank leg can move to `Paid` only when reconciliation contains the provider/bank reference, posting date, masked destination, exact amount, and matching movement/payout ID.

## Receipts and accounting

Every route and preparation produces a receipt containing:

- `movement_id`
- route hash / configuration hash
- source and destination descriptors
- ordered leg IDs
- quote timestamps and quote sources
- fee/slippage constraints
- approval state
- prepared provider references
- chain transaction signatures or bank/processor references after settlement
- reconciliation state

Receipt states map to the existing Sun Pay accounting lifecycle. Bank Phoenix Pay must never promote a financial record directly from `Projected` or `Estimated` to `Paid`.

The existing SKYGRID verified infrastructure revenue ledger remains the accounting authority for recognized business revenue; Bank Phoenix Pay supplies movement and settlement evidence to it rather than replacing it.

## HTTP API

Preserve `/api/pay/quote` and extend the payment surface with:

- `POST /api/pay/route` — validate request and return a deterministic route plan.
- `POST /api/pay/prepare` — prepare all permitted route legs; no autonomous signing/broadcast.
- `POST /api/pay/reconcile` — accept settlement evidence and return reconciled status.
- `GET /api/pay/assets` — return enabled public registry descriptors without secrets.

All responses include `movement_id`, `mode`, `execution`, and `timestamp`. Mutation-like endpoints remain stateless in the first implementation unless an existing controlled store is explicitly wired.

## Failure behavior

The system returns explicit machine-readable failures, including:

- `unknown_network`
- `unknown_asset`
- `unsupported_pair`
- `route_unavailable`
- `policy_denied`
- `operator_approval_required`
- `destination_unverified`
- `quote_expired`
- `fee_limit_exceeded`
- `slippage_limit_exceeded`
- `duplicate_movement`
- `settlement_evidence_incomplete`
- `reconciliation_mismatch`

A partial route is never represented as executable when a required leg is unavailable.

## Security and trust boundaries

- No private key, seed phrase, bank credential, routing number, full account number, or provider secret in source, logs, receipts, tests, fixtures, Airtable, or public APIs.
- Every executable external leg requires an adapter-specific authorization boundary.
- Human/operator approval remains mandatory unless an independently reviewed future policy explicitly allows a narrower automated action.
- Network identity must be explicit; no implicit mainnet fallback.
- Reconciliation evidence is append-only in meaning: later evidence may correct status through a new receipt but must not rewrite historical proof.
- Provider failures must not be interpreted as success.

## Testing and acceptance

Implementation uses Node 24-compatible tests and PowerShell-friendly package commands. Acceptance requires tests for:

1. zero, negative, malformed, null, and blank amounts fail closed;
2. numeric decimal strings preserve exact asset precision;
3. unknown/disabled networks and assets are rejected;
4. Base USDC policy caps and recipient allowlists remain enforced;
5. route planner produces deterministic leg ordering;
6. unsupported bridge or missing quote evidence fails closed;
7. bank destinations require verified masked references;
8. preparation never reports transaction broadcast when no external authorization occurred;
9. duplicate movement IDs are rejected;
10. incomplete or mismatched settlement evidence cannot produce `Paid`;
11. successful chain or bank reconciliation requires matching exact amount, destination, and reference;
12. revenue-ledger recognition remains separate from movement preparation;
13. no test fixture contains forbidden secret material.

CI must run syntax/type validation as applicable and the focused Bank Phoenix Pay test suite on Node 24.

## Rollout

Phase 1 is controlled-pilot, prepare-only/external-authorization mode. Production execution is not enabled merely by merging this feature. Each adapter must independently prove provider connectivity, authorization, receipt integrity, and reconciliation before its execution capability can be raised.

## Completion criteria

Bank Phoenix Pay is complete for the controlled pilot when:

- registered supported assets can be normalized and routed;
- Base USDC, Solana/Phoenix advisory, generic EVM, Allbridge advisory, bank off-ramp, and ledger-only adapters conform to one interface;
- quote/route/prepare/reconcile APIs are covered by tests;
- every externally settled leg can be reconciled into the existing payout lifecycle;
- unsupported networks/assets fail closed;
- no audited Phoenix Legacy source is modified;
- no custody/bank secrets are stored;
- CI passes on Node 24;
- PowerShell commands documented for local verification work without Bash-only syntax.
