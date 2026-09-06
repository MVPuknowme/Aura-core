# PNPK Settlement Routing Firewall Design

## Goal

Make PNPK the receipt-first routing control for value movement across SKYGRID accounts, bank rails, wallets, chains, and token contracts. Every movement must be attributable to a named source account, a canonical route, an exact destination, and a durable receipt chain. Crypto-capable routes must fail closed before execution when the actual chain, asset contract, spender, destination, amount, or authorization differs from the approved intent.

This design is intended to prevent or sharply reduce wrong-address transfers, wrong-chain transfers, address-poisoning mistakes, ticker/logo spoofing, malicious token approvals, and unreconciled “where did it go?” events. It does not claim that all crypto loss can be prevented.

## Existing boundaries preserved

This feature extends the current PNPK fail-closed model and receipt pipeline. It does not weaken existing controlled-pilot restrictions.

Current runtime restrictions remain authoritative:
- no payment execution;
- no wallet signing;
- no transaction broadcast;
- no device activation;
- no production failover;
- no private data movement.

The first implementation evaluates intent, returns deterministic approval/rejection receipt objects, persists those receipt objects through a separate artifact writer, and reconciles externally observed settlement evidence. It does not introduce a live execution adapter.

The existing global route matrix remains the authoritative analytical evaluator for route health, evidence freshness, confidence, settlement destination, and payment-execution eligibility. The settlement routing firewall adds account identity, asset identity, authorization binding, and transaction reconciliation. It may consume matrix output, but must not replace or silently relax the global route matrix.

## Security invariant

No movement is PNPK-approved unless the route-specific identity tuple is resolved before execution.

Common fields:

`source_account_id + route_id + rail + route_network_id + asset_id + destination_account_id + destination_fingerprint + authorization_id`

`route_network_id` is mandatory but rail-specific:
- EVM: canonical chain identifier such as `eip155:8453`;
- Bitcoin: canonical network identifier such as `bip122:...` or an implementation-approved equivalent;
- bank rails: canonical provider/rail network identifier such as `bank:ach:provider-name`;
- internal ledger: canonical ledger namespace identifier.

For EVM crypto assets:

`asset_id = chain_id + contract_address`

Native assets use a chain-scoped canonical identifier such as:

`eip155:8453/native`

ERC-20 assets use a chain-scoped contract identifier such as:

`eip155:8453/erc20:0x...`

Token name, ticker, logo, wallet UI label, or symbol alone is never sufficient identity.

A preflight receipt must be present and approved before any future execution adapter is allowed to sign or broadcast.

## Canonical account registry

Introduce a read-only canonical account registry for routing identity. Each record has one stable `account_id` and one account type.

Supported initial account types:
- `bank_account`;
- `evm_wallet`;
- `bitcoin_address`;
- `custodial_crypto_account`;
- `internal_ledger_account`.

Each account record includes:
- `account_id`;
- `display_name`;
- `account_type`;
- `owner_scope`;
- `provider` when applicable;
- `masked_identifier` for bank/custodial accounts;
- `address` for blockchain accounts;
- `allowed_route_network_ids`;
- `status` (`active`, `disabled`, `quarantined`);
- `verification_method`;
- `verified_at`;
- `metadata_hash`.

The registry must not store private keys, seed phrases, bank passwords, or signing secrets.

Human-facing labels such as “Rainbow,” “SoFi,” or “USDC wallet” are presentation fields, not routing keys.

## Canonical route registry

Each approved route is a versioned record with a stable `route_id`.

A route binds:
- source account;
- destination account;
- rail (`ach`, `wire`, `internal_bank`, `evm`, `bitcoin`, or another explicitly supported rail);
- `route_network_id`;
- permitted assets;
- permitted spender/contract targets when applicable;
- amount policy;
- authorization policy;
- expected settlement semantics;
- return/reversal behavior;
- route status and version.

A route version is immutable after use in an approved receipt. Material changes create a new version.

For crypto routes, the route binds exact chain and contract identities. An asset allowlist entry is not portable across chains merely because the symbol is identical.

## Settlement intent

A settlement intent is the immutable request envelope created before execution or external handoff.

Required fields:
- `intent_id`;
- `created_at`;
- `expires_at`;
- `source_account_id`;
- `route_id`;
- `route_version`;
- `rail`;
- `route_network_id`;
- `asset_id`;
- `asset_contract` when applicable;
- `asset_decimals` when applicable;
- `amount_atomic` for crypto or exact minor-unit amount for fiat;
- `amount_display`;
- `destination_account_id`;
- `destination_fingerprint`;
- `spender_or_target` when applicable;
- `authorization_id`;
- `operator_scope`;
- `nonce_or_idempotency_key`;
- `intent_hash`.

Crypto amounts are validated in atomic units. Fiat amounts are validated in exact minor units. Display-formatted decimals are informational and cannot be the sole execution amount.

## Destination fingerprint

The destination fingerprint is a deterministic digest over normalized destination identity.

For an EVM route, the fingerprint input includes at minimum:

`route_network_id + normalized_destination_address + destination_account_id`

For a bank route, it includes:

`route_network_id + canonical_internal_account_identifier + provider_identity + destination_account_id`

Full bank routing/account numbers must not appear in ordinary receipts.

The preflight validator compares the fingerprint generated from the proposed transaction target with the fingerprint stored in the intent. Any mismatch is a hard failure.

## Asset verification and suspicious-token quarantine

Crypto assets are classified before route approval:
- `verified` — exact chain + contract identity is explicitly trusted by policy;
- `known_unverified` — recognized but not execution-eligible;
- `unsolicited` — appeared without a matching approved intent;
- `blocked` — known malicious, deceptive, or policy-denied asset.

`known_unverified`, `unsolicited`, and `blocked` assets are not approval-eligible by default.

Unsolicited assets produce a quarantine receipt with:

`decision = QUARANTINE`

and guidance state:

`DO_NOT_APPROVE / DO_NOT_SWAP / DO_NOT_VISIT_TOKEN_LINK`

The quarantine path must not sign, approve, swap, transfer, claim, or otherwise invoke the unsolicited token contract. Read-only external indexing may be used to identify the observed contract without wallet interaction.

A displayed symbol such as `USDC`, `USDT`, `ETH`, or any branded ticker does not override contract identity.

## Address-poisoning protection

The firewall must never approve a destination based on abbreviated address similarity or recent transaction history alone.

Rules:
- compare full normalized addresses;
- require destination-account registry resolution;
- compute and compare destination fingerprint;
- do not auto-promote a recent counterparty into the allowlist;
- display a human-verifiable short fingerprint derived from the full approved destination, not merely the first/last address characters;
- treat any change in the full destination as a route mismatch.

## Pure preflight evaluator

The preflight evaluator is deterministic and side-effect free. It returns a decision plus a complete receipt object but does not persist the receipt itself.

Inputs:
- settlement intent;
- canonical account registry snapshot;
- canonical route registry snapshot;
- proposed transaction envelope;
- asset registry/policy snapshot;
- idempotency-history snapshot;
- optional global route matrix decision;
- current timestamp.

Checks include:
1. intent schema validity;
2. intent freshness and non-expiration;
3. source account exists and is active;
4. destination account exists and is active;
5. route exists, version matches, and is active;
6. proposed source matches route source;
7. proposed destination matches route destination;
8. rail and `route_network_id` match route;
9. exact asset identity matches route allowlist;
10. asset classification is `verified`;
11. spender/target is allowed when applicable;
12. amount is within route policy and exactly matches the approved intent;
13. authorization scope is valid;
14. idempotency key/nonce has not been reused for a conflicting intent in the supplied history snapshot;
15. destination fingerprint matches;
16. any required global-route-matrix decision is execution-eligible;
17. no conflicting evidence exists.

Decision values:
- `ROUTE_APPROVED`;
- `FAIL_CLOSED`;
- `QUARANTINE`.

The evaluator never signs, sends, broadcasts, swaps, bridges, approves token allowances, persists provider mutations, or moves funds.

## Receipt artifact writer

A separate artifact writer persists the receipt object returned by the evaluator.

The writer:
- accepts only schema-valid receipt objects;
- writes append-only artifacts;
- uses deterministic canonical serialization and hashing;
- rejects overwrite attempts for an existing receipt ID unless content is byte-for-byte/canonically identical;
- never changes the evaluator decision;
- never performs settlement execution.

This separation preserves deterministic validation while still guaranteeing that every handled request can produce a durable receipt artifact.

## Preflight receipt

Every handled preflight produces a receipt object, including rejected requests. Production wiring must persist that object before any future execution adapter can consume `ROUTE_APPROVED`.

Required receipt fields:
- `receipt_type = pnpk_settlement_preflight`;
- `receipt_version`;
- `receipt_id`;
- `created_at`;
- `intent_id`;
- `intent_hash`;
- `route_id`;
- `route_version`;
- `source_account_id`;
- `destination_account_id`;
- `destination_fingerprint`;
- `rail`;
- `route_network_id`;
- `asset_id`;
- exact amount in atomic/minor units;
- `authorization_id`;
- `decision`;
- `failure_reasons`;
- `registry_snapshot_hash`;
- `route_snapshot_hash`;
- `asset_policy_snapshot_hash`;
- `idempotency_snapshot_hash`.

Rejected requests identify deterministic reason codes without leaking secrets.

Example hard-failure codes:
- `destination_mismatch`;
- `destination_fingerprint_mismatch`;
- `wrong_route_network`;
- `wrong_asset_contract`;
- `amount_mismatch`;
- `spender_not_allowed`;
- `route_disabled`;
- `account_disabled`;
- `authorization_invalid`;
- `intent_expired`;
- `idempotency_conflict`;
- `asset_unverified`;
- `asset_quarantined`;
- `route_matrix_not_eligible`.

## Post-execution reconciliation

A separate reconciler binds externally observed execution evidence to the original approved intent and persisted preflight receipt. This is read-only in the initial implementation.

Observed evidence may include:
- bank transaction/provider reference;
- blockchain transaction hash;
- route/network identifier;
- actual sender;
- actual destination;
- actual asset contract;
- actual amount;
- transaction status/confirmations;
- reversal/return reference;
- settlement timestamp.

The reconciler compares observed facts against the approved intent and emits one terminal or intermediate status:
- `PENDING`;
- `CONFIRMED`;
- `RETURNED`;
- `REVERSED`;
- `FAILED`;
- `MISMATCH`;
- `UNKNOWN`.

`MISMATCH` is used whenever observed execution differs materially from the approved route, even if the external transaction technically succeeded.

## Settlement receipt chain

The canonical chain is:

`ACCOUNT → ROUTE → INTENT → PREFLIGHT → EXECUTION_REFERENCE → DESTINATION_CONFIRMATION → FINAL_RECEIPT`

A final receipt includes references/hashes for every prior stage so an auditor can reconstruct the full movement without relying on wallet UI history or human memory.

A movement is not labeled `CONFIRMED` merely because a transaction hash exists. The destination, route/network, asset, and amount must reconcile to the approved intent.

## Bank self-transfer behavior

Bank routes use the same intent/receipt model even when no blockchain is involved.

For a self-transfer such as Chime → SoFi:
- source and intended destination are separate canonical account IDs;
- the bank rail/provider network is represented by `route_network_id` rather than a blockchain chain ID;
- the bank/provider reference is bound to the route;
- a return or reversal produces a `RETURNED` or `REVERSED` final receipt;
- returned principal is not classified as new income;
- no crypto wallet identity is inferred from a bank label;
- if the selected destination differs from the approved destination, the route is `MISMATCH` or `FAIL_CLOSED` depending on whether execution occurred.

## Receipt storage and tamper evidence

Receipts are append-only artifacts. Each receipt includes its own canonical hash and references the prior receipt hash in the chain where applicable.

Hashing is evidence of integrity, not proof that the underlying claim is true; source evidence still must be verified.

Receipt storage must avoid secrets and full sensitive bank identifiers.

## Integration with PNPK

The PNPK runtime policy gains a settlement-routing section that declares:
- receipt-first enforcement enabled;
- fail-closed enabled;
- account registry path;
- route registry path;
- asset registry path;
- preflight receipt path/pattern;
- reconciliation receipt path/pattern;
- live execution remains disabled unless separately approved in a future design.

The existing PNPK post-build and validation pipeline should validate the new schemas and run security test vectors.

No existing `payment_execution: false`, `wallet_signing_allowed: false`, or `transaction_broadcast_allowed: false` guardrail may be changed by this feature.

## Components

Recommended initial modules:

1. `config/pnpk-account-registry.*`
   - canonical account records;
   - no secrets.

2. `config/pnpk-route-registry.*`
   - versioned route definitions;
   - exact rail/network/asset/destination policy.

3. `config/pnpk-asset-registry.*`
   - exact chain + contract identities;
   - verification/quarantine state.

4. `scripts/pnpk-settlement-preflight.*`
   - pure deterministic evaluator;
   - returns receipt object.

5. `scripts/pnpk-receipt-writer.*`
   - append-only persistence of schema-valid receipt objects.

6. `scripts/pnpk-settlement-reconcile.*`
   - read-only evidence reconciliation;
   - returns final receipt object.

7. `schemas/pnpk-settlement-intent.schema.json`
8. `schemas/pnpk-settlement-receipt.schema.json`
9. focused unit/security tests and fixtures.

Exact filenames may follow existing repository conventions during implementation, but the component boundaries above must remain distinct.

## Error handling

All malformed, missing, ambiguous, stale, conflicting, or unauthorized inputs fail closed.

The system distinguishes:
- hard mismatch → `FAIL_CLOSED`;
- suspicious/unsolicited asset → `QUARANTINE`;
- valid but externally pending settlement → `PENDING`;
- missing external evidence after approval → `UNKNOWN`, never assumed success.

No error path may silently fall back to ticker matching, recent-address matching, a different chain/network, a different route version, or a default wallet.

## Testing

Tests must include at minimum:
- exact valid EVM route approved;
- wrong destination address rejected;
- address-poisoning lookalike rejected;
- wrong chain rejected;
- same ticker/different contract rejected;
- same contract address on wrong chain rejected;
- unverified token quarantined;
- unsolicited token quarantined without contract invocation;
- wrong spender/target rejected;
- amount mismatch rejected;
- expired intent rejected;
- conflicting idempotency key rejected using supplied history snapshot;
- disabled account rejected;
- disabled route rejected;
- below-threshold global matrix decision rejected when required;
- valid bank route works without a blockchain chain ID;
- valid external transaction reconciles to `CONFIRMED`;
- successful but wrong-destination transaction reconciles to `MISMATCH`;
- bank transfer return reconciles to `RETURNED`;
- receipt hashes are deterministic;
- receipt writer rejects conflicting overwrite;
- secrets/private keys are never present in receipts;
- current no-signing/no-broadcast guardrails remain true.

## Acceptance criteria

Implementation must prove all of the following:
- every approved route references canonical source and destination account IDs;
- every route has a canonical rail-specific `route_network_id`;
- crypto assets are identified by chain + exact contract or canonical native-asset ID;
- token ticker/logo/name alone can never authorize a route;
- destination fingerprints are deterministic and enforced;
- preflight evaluation is deterministic and side-effect free;
- every preflight returns a complete receipt object;
- production wiring persists the preflight receipt before any future executor can consume approval;
- unsolicited/unverified tokens are quarantined and not invoked by the wallet;
- no recent-counterparty auto-allowlisting exists;
- externally observed execution is reconciled against the approved intent;
- final receipts distinguish confirmed, returned, reversed, failed, mismatch, pending, and unknown states;
- receipt chains are tamper-evident via deterministic hashes;
- sensitive credentials and full bank identifiers are excluded from receipts;
- the existing global route matrix remains authoritative for its current eligibility role;
- current PNPK controlled-pilot restrictions remain unchanged;
- no payment execution, wallet signing, or transaction broadcast capability is introduced by this work.

## Out of scope

This design does not include:
- private-key custody;
- seed phrase storage;
- wallet signing;
- transaction broadcast;
- automated token swaps;
- automatic token approvals;
- automatic bridging;
- recovery of already-lost funds;
- claims that a receipt alone proves legal ownership or economic value;
- automatic trust of tokens based on symbol, market listing, logo, or wallet UI metadata.

A future execution-adapter design, if ever approved, must consume a persisted `ROUTE_APPROVED` preflight receipt and preserve all route invariants above.