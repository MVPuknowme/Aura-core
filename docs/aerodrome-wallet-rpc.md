# SKYGRID dual-lane wallet RPC

This adapter connects a **public EVM wallet address** to the SKYGRID Emergency Data On-Ramp through two independent, read-only verification lanes:

- **Base / Aerodrome** — Base ETH and AERO balances plus deployed-code checks for the AERO token and Aerodrome router.
- **OP Mainnet / Optimism** — OP Mainnet ETH and OP balances plus a deployed-code check for the OP governance token.

It never requests, stores, or uses a seed phrase, private key, wallet password, approval signature, or transaction payload. It cannot sign or broadcast transactions, grant token approvals, bridge assets, execute swaps, or take custody.

## Endpoints

```text
GET /api/wallet/dual-lane?address=0x...
GET /api/wallet/dual-lane?address=0x...&lane=base
GET /api/wallet/dual-lane?address=0x...&lane=optimism
GET /api/aerodrome/wallet?address=0x...
```

The dual-lane route checks both lanes by default. It reports a healthy link only when every requested lane verifies the expected chain ID and required contract bytecode.

## Network checks

- Base chain ID: `8453`
- OP Mainnet chain ID: `10`
- Base development RPC fallback: `https://mainnet.base.org`
- OP Mainnet development RPC fallback: `https://mainnet.optimism.io`
- AERO token: `0x940181a94A35A4569E4529A3CDfB74e38FD98631`
- Aerodrome router: `0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43`
- OP governance token: `0x4200000000000000000000000000000000000042`

The public RPC endpoints are rate-limited and intended only as development or diagnostic fallbacks. Use authenticated provider URLs for production checks.

## Environment variables

```text
SKYGRID_WALLET_ADDRESS
SKYGRID_AERODROME_WALLET_ADDRESS
SKYGRID_BASE_RPC_URL
SKYGRID_OPTIMISM_RPC_URL
SKYGRID_WALLET_RPC_TIMEOUT_MS
SKYGRID_BASE_RPC_TIMEOUT_MS
SKYGRID_OPTIMISM_RPC_TIMEOUT_MS
```

`SKYGRID_WALLET_ADDRESS` is an optional public address used when the query parameter is omitted. The legacy Aerodrome address variable remains supported. Valid timeout values are 500–30000 milliseconds; the default is 8000.

## PowerShell validation

```powershell
$env:SKYGRID_WALLET_ADDRESS = "0xYOUR_PUBLIC_WALLET_ADDRESS"
$env:SKYGRID_BASE_RPC_URL = "https://your-authenticated-base-rpc.example"
$env:SKYGRID_OPTIMISM_RPC_URL = "https://your-authenticated-op-rpc.example"

pnpm run aerodrome:rpc:test
pnpm run wallet:dual-lane:test
pnpm run wallet:routing:test
```

Never put a seed phrase, private key, wallet password, or approval signature in an environment variable.

## Expected safety state

```json
{
  "mode": "read_only_non_custodial",
  "permissions": {
    "readOnly": true,
    "storesPrivateKeys": false,
    "signsTransactions": false,
    "broadcastsTransactions": false,
    "grantsTokenApprovals": false,
    "executesSwaps": false
  }
}
```

All CI tests use mocked JSON-RPC responses. Live-provider availability is not part of the deterministic merge gate.
