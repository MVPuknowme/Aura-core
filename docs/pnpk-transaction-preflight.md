# PNPK transaction preview

PNPK previews supported unsigned EVM calls before signing. It simulates a call, checks the observed effects against an operator policy, and returns a transaction-bound, policy-bound receipt. This implementation is a controlled pilot, not a deployed or audited asset-protection service.

## Supported coverage

Native currency transfers between accounts without code; direct ERC-20 transfer and approve calls for operator-pinned token bytecode. All amounts are exact base units (wei or token units), never floating point dollars. Inputs must use lowercase addresses and canonical hexadecimal quantities. Contract/delegated senders, contract native recipients, arbitrary calls, batch calls, NFT transfers, permit, signatures, fee fields and nonce fields are unsupported and blocked. Smart wallets, including account-abstraction wallets, need a separate adapter.

Token transfers require the owner's balance to decrease by exactly the intended amount and the recipient's balance to increase by exactly that amount. Fee-on-transfer and rebasing behavior therefore blocks. Approvals must be finite, within the configured cap, issued to an approved spender, produce the exact expected allowance, and leave the owner balance unchanged. Existing nonzero approvals must first be reset to zero before setting a new nonzero allowance. Standard Transfer/Approval evidence is mandatory; additional or mismatched events block.

## Simulation and trust

The read-only adapter supports exactly eth_chainId, eth_getBlockByNumber, eth_getCode, eth_call and eth_simulateV1. It uses HTTPS, forbids redirects and URL user/password credentials, bounds each response to 1 MiB, and applies an 8-second timeout. Provider credentials may be configured through a private endpoint URL; that URL is never included in receipts or logs.

The block is pinned by number, its hash is recorded and checked again to catch a reorganization during evaluation, and stale/future blocks block. No state or balance override is used. Simulation uses validation=false to permit auxiliary balance/allowance reads; this is a behavioral preview, not verification of signature, nonce, account funding or fee validity. Geth documentation: https://geth.ethereum.org/docs/interacting-with-geth/rpc/ns-eth#eth-simulatev1 . ERC-20 interface: https://eips.ethereum.org/EIPS/eip-20 .

The provider and token code pins are trust dependencies. A code pin alone does not vet a token or resolve a proxy implementation. Malicious or upgradeable token behavior can lie about balances or change unrelated state silently. Only operator-reviewed tokens should be configured; proxy tokens need separate implementation/storage pinning before broader assurance. A malicious RPC can falsify results. Simulation state can change before a later signing decision. The provider sees public addresses and unsigned calldata: use a provider authorized for that disclosure. Do not submit secret calldata or private communications.

Receipts expire after at most 120 seconds and bind the exact transaction input, policy, block and observed effects with canonical SHA-256 checksums. verifyReceipt checks binding, expiry and checksum. This detects accidental/local changes; an unsigned checksum is NOT proof of issuer authenticity. It must never be used as an execution authorization token. There is no wallet key, signing method, broadcast method or automated fund movement in this feature. No live signing path has been integrated; an external wallet can bypass an advisory service unless it explicitly enforces its outcome.

## Local use (PowerShell)

Node 24; no new dependencies. The example addresses are synthetic and must not be treated as verified customer or SKYGRID wallets.

```powershell
node --test tests/pnpk-transaction-preflight.test.mjs tests/pnpk-transaction-rpc.test.mjs tests/pnpk-transaction-api.test.mjs tests/pnpk-transaction-cli.test.mjs
# Set PNPK_SIMULATION_RPC_URL privately to your approved HTTPS provider supporting eth_simulateV1.
node scripts/pnpk-transaction-preflight.mjs examples/pnpk-transaction/native-transfer.json examples/pnpk-transaction/policy.json receipt.json
```

Exit 0 means preflight passed, 2 means blocked, 1 means input/output failure. Without a provider, the example creates a blocked receipt. Receipt files are created privately (0600 where supported) and never overwritten. Store receipts only through an approved private route; they contain public chain addresses and intended transaction details.

For ERC-20 configuration, add a lowercase token address under tokens with codeSha256 (SHA-256 of the exact lowercase eth_getCode hex STRING, including 0x), maxTransferUnits and maxApprovalUnits as decimal strings. Do not copy a token's current code hash into policy without reviewing the token. Policy files are operator-controlled inputs, not authorization grants.

## Authenticated API

POST /api/skygrid/transaction-preflight, body {"transaction": {...}}, Authorization: Bearer <server token>. Requires PNPK_PREFLIGHT_API_TOKEN (at least 32 characters), PNPK_SIMULATION_RPC_URL and PNPK_TRANSACTION_POLICY_JSON in server configuration. Client policy/provider overrides are rejected. Unconfigured service blocks. A pass returns HTTP 200; a denied assessment returns 422. Replies are no-store. Configure per-client authentication, edge rate limits, quotas and private receipt retention before offering a hosted service; the pilot uses one shared server token and has no customer account or durable usage ledger.

No deployment or provider credential was configured in this change. Unit and transport integration tests use synthetic responses, not a live EVM/node. Live-provider validation against known testnet cases is still required. Tests cover unexpected transfers, unlimited approvals, nonzero approval replacement, changed code, failed/malformed simulation, stale blocks, wrong chain, transport timeouts, authentication and receipt tampering. Full repository build was not run in the isolated implementation workspace.

## Commercial positioning

Proposed copy: **PNPK: preview asset movements and flag risky permissions before you sign.** Proposed price: USD 0.01 per assessment, subject to measuring provider cost and demand. No charge, payment integration, booked revenue, insurance or guaranteed protection is implemented. A paid pilot needs live-provider conformance, security review, integration with a consenting wallet/customer, usage metering and the approved Bancorp payment path. Keep marketing bounded to the supported checks above.

No Bluetooth scan is required. No Bluetooth tool is available in this workspace; no device connection or scan occurred.
