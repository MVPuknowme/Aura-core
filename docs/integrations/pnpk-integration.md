# SKYGRID-protocol: PNPK integration notes

Status: transaction-preview pilot implemented in [PR #252](https://github.com/MVPuknowme/Aura-core/pull/252); integration and live-provider validation pending. Implementation inspected at commit `81846a33a95d9cd55cbc9875cfcd351dfb13a96d` on 2026-10-04.

## AuraSky site

AuraSky: [https://aurasky.Skygrid-protocol.net](https://aurasky.Skygrid-protocol.net).

This is the site address supplied by the operator. The PNPK API route and live deployment at this domain have not been verified by this documentation update.

## Purpose

Integrate PNPK into SKYGRID-protocol/Aura-Core to preview supported asset movements and permissions before a user makes a signing decision. The service name remains **SKYGRID Emergency Data On-Ramp**. Preserve `controlled_pilot` and `fail_closed`.

Product statement: **PNPK: preview asset movements and flag risky permissions before you sign.**

This transaction-preview feature does not grant payment, deployment, wallet-signing, production-failover, device-activation or private-data-movement authority. Existing PNPK/runtime authorization requirements remain separate.

## Where the implementation lives

| Component | Repository path | Role |
| --- | --- | --- |
| Policy evaluator | `lib/pnpk-transaction-preflight.mjs` | Decode supported intent, simulate, compare effects, produce receipt |
| Read-only provider | `lib/pnpk-transaction-rpc.mjs` | Five-method HTTPS JSON-RPC allowlist, size bounds and timeout |
| API | `api/skygrid/transaction-preflight.mjs` | Authenticate; accept transaction only; apply server-controlled policy |
| Local command | `scripts/pnpk-transaction-preflight.mjs` | Read local inputs; create a new private receipt |
| Examples | `examples/pnpk-transaction/` | Synthetic native-transfer and policy inputs |
| CI | `.github/workflows/pnpk-transaction-preflight.yml` | Node 24 checks of the feature |
| Detailed documentation | [Transaction preview](../pnpk-transaction-preflight.md) | Coverage, trust assumptions and configuration |

## Integration flow

1. Capture the exact unsigned transaction intent from the consenting customer flow.
2. Submit the supported transaction fields to the preflight service through a trusted backend. Keep the shared API token out of browser/mobile code.
3. The server selects its approved RPC and policy, verifies chain and block freshness, checks code pins, simulates and compares effects.
4. Present the decision, intended movement/approval, observed effects and failure reasons to the customer.
5. A blocked or unavailable assessment must stop the integrated flow. A passed assessment is advisory: any later signing requires separate wallet/user authorization.
6. If any field changes, the receipt expires, or policy/state changes materially, request a fresh assessment. The current adapter does not validate final fee or nonce fields; adding those to a final transaction requires an expanded adapter before claiming full signed-transaction binding.
7. Retain the receipt only through the approved private retention/delivery path. Do not publish customer transaction details.

An external wallet can bypass an advisory service. Enforcement in a wallet or signing flow is not implemented by this PR.

## Supported transaction input

Only `chainId`, `from`, `to`, `value`, `data`, `gas` are accepted. All six are required. Addresses and calldata must be lowercase; quantities must use canonical hex. Gas is bounded from 21,000 to 16,000,000.

Example request body (synthetic addresses; amount is **5 wei**, not USD 5):

```json
{
  "transaction": {
    "chainId": "0x1",
    "from": "0x1111111111111111111111111111111111111111",
    "to": "0x2222222222222222222222222222222222222222",
    "value": "0x5",
    "data": "0x",
    "gas": "0x5208"
  }
}
```

Do not treat example addresses as confirmed customer wallets. Chain ID support depends on the configured node implementing `eth_simulateV1`; EVM compatibility alone does not establish provider support. Scroll, Arbitrum, Base or other chain integrations require independent provider conformance testing.

## Server configuration

| Variable | Required value |
| --- | --- |
| `PNPK_PREFLIGHT_API_TOKEN` | Secret shared pilot token, at least 32 characters |
| `PNPK_SIMULATION_RPC_URL` | Operator-approved HTTPS RPC supporting `eth_simulateV1` |
| `PNPK_TRANSACTION_POLICY_JSON` | Operator-controlled JSON policy shown below |

Do not accept policy/provider overrides from request bodies. No wallet key, seed phrase or signer environment variable is required.

```json
{
  "chainId": "0x1",
  "maxNativeValueWei": "100",
  "recipients": ["0x2222222222222222222222222222222222222222"],
  "spenders": [],
  "tokens": {},
  "receiptTtlSeconds": 60,
  "maxBlockAgeSeconds": 120
}
```

For each reviewed ERC-20 token, the `tokens` entry requires `codeSha256`, `maxTransferUnits` and `maxApprovalUnits`. The code pin is SHA-256 of the exact lowercase `eth_getCode` hex string including `0x`, not Keccak or a hash of decoded bytes. Limits are decimal integer strings in base units. Token code pins are trust dependencies; they do not vet a token or resolve proxy implementations.

## API contract

`POST /api/skygrid/transaction-preflight`
with `Authorization: Bearer <server token>` and `Content-Type: application/json`.

| HTTP status | Meaning | Integrated-flow behavior |
| --- | --- | --- |
| 200 | `PREFLIGHT_PASSED` receipt | Display assessment; no automatic signing/sending |
| 422 | `BLOCKED` assessment receipt | Stop; display failures |
| 400 / 413 | Invalid or oversized request | Stop; fix input |
| 401 | Authentication failed | Stop; repair backend authentication |
| 405 | Unsupported method | Use POST |
| 503 | Server/provider configuration missing | Stop; repair operator configuration |
| Transport failure or invalid response | No usable assessment | Stop; no permissive fallback |

Replies are `no-store`. Authentication/configuration failures return a blocked response with `reason`; evaluated receipts use `failures`. RPC failure inside an assessment results in a blocked receipt, not a pass.

## Policy checks and scope

| Operation | Implemented checks |
| --- | --- |
| Native EOA transfer | Approved recipient, amount cap, sender/recipient without code, successful simulation, expected native transfer event |
| ERC-20 transfer | Reviewed token code pin, approved recipient, finite amount/cap, exact sender debit and recipient credit, expected Transfer evidence |
| ERC-20 approve | Reviewed token code pin, approved spender, finite cap, exact resulting allowance, unchanged owner balance, expected Approval evidence, reset existing nonzero allowance before replacing it |
| All assessments | Chain match; recent pinned block; failed/malformed simulation denial; reorganization check; expiry; transaction/policy binding |

Unsupported calls fail closed: arbitrary contracts, swaps, batches, NFT, permit, account-abstraction wallets, delegated/contract senders, and final signature/fee/nonce validation. Fee-on-transfer and rebasing effects fail the exact-delta check.

Read-only RPC methods: `eth_chainId`, `eth_getBlockByNumber`, `eth_getCode`, `eth_call`, `eth_simulateV1`. No signing or broadcast method exists.

## Receipt interpretation

Schema: `pnpk.transaction-preflight.v1`. Receipts include decision, failure codes, hashes of input/policy, creation/expiry timestamps, block and observed effects. Execution/signing/broadcast flags remain false.

`verifyReceipt(receipt, transaction, policy)` checks a passed receipt's exact input/policy binding, expiry and canonical SHA-256 checksum. The checksum is unsigned: anyone able to rewrite the receipt can recompute it. It is not issuer authentication, operator approval, proof of ownership, or execution authorization.

Simulation is a state snapshot. It uses `validation: false`, no state overrides, and does not prove nonce, fees, funding or signature validity. Malicious RPCs or tokens can misrepresent observable effects; unrelated silent token behavior is outside this adapter's coverage.

This receipt schema is separate from local `aura.pnpk` proof packages and the runtime-policy profile. Do not apply one profile's schema to another.

## Verification and launch notes

At implementation commit `81846a3`, 44 Node 24 tests passed locally and the dedicated PNPK transaction preflight CI run passed. Tests use synthetic responses; they do not establish live-node compatibility or production protection. The full repository build was not run in the isolated implementation workspace.

Before offering a paid pilot:

- Validate approved RPC behavior on known testnet cases, including transfer, finite approval, unlimited approval denial, unexpected balance effects and failure modes.
- Review token trust, proxy exclusions, policy ownership, authentication and receipt handling.
- Integrate assessment into a consenting customer's transaction flow; explicitly stop on blocked/unavailable results.
- Add per-customer authentication, rate limits, quotas, durable usage accounting and private retention.
- Measure RPC cost/latency, then validate the proposed USD 0.01 per assessment price.
- Connect the approved Bancorp payment path separately; no Stripe billing integration, payment execution or booked revenue is introduced here.

Safe marketing is limited to supported previews and checks. Do not advertise guaranteed asset protection or worldwide/live coverage based on these tests.

## Device and privacy boundary

Bluetooth is not required. No Bluetooth tool was available during this integration-note update, and no device scan or connection occurred. PNPK installation does not establish a VPN, encrypt traffic, intercept communications or protect uninstrumented channels. The approved simulation provider receives public addresses and unsigned calldata; do not submit secrets or private communications.

## AuraSky ownership, Auto-Drill and licensing

Michael Vincent Patrick — MVPuknowme identifies AuraSky (https://aurasky.Skygrid-protocol.net) as entirely his design and the umbrella for Aura-Core, PNPK and Auto-Drill. Until documented partnerships are present, no partner ownership is assigned.

See [Auto-Drill lease-use integration](autodrill-lease-use.md) for signed usage/invoice/payment reconciliation and same-owner revenue attribution. See [exclusive licensing scope](../licensing/exclusive-rights.md) and the root [LICENSE](../../LICENSE) for proprietary rights in new owner-controlled material while preserving previously granted MIT/CC0 and third-party permissions. [README](../../README.md) is the public entry point.

