# SKYGRID Dual-Lane Wallet RPC

This integration connects a **public EVM wallet address** to the SKYGRID Emergency Data On-Ramp through two independent read-only lanes:

- **Base / Aerodrome** — Base ETH and AERO balances, plus Aerodrome contract verification.
- **OP Mainnet / Optimism** — OP Mainnet ETH and OP balances, plus OP token contract verification.

It does not request, store, or use a seed phrase or private key. It cannot sign transactions, broadcast transactions, bridge assets, grant token approvals, execute swaps, or take custody of assets.

## Endpoints

The dual-lane endpoint checks both lanes by default:

```text
GET /api/wallet/dual-lane?address=0x...
```

A single lane can be selected explicitly:

```text
GET /api/wallet/dual-lane?address=0x...&lane=base
GET /api/wallet/dual-lane?address=0x...&lane=optimism
```

The original Base/Aerodrome compatibility endpoint remains available:

```text
GET /api/aerodrome/wallet?address=0x...
```

The combined endpoint declares the wallet link healthy only when every requested lane verifies successfully. A partial or incorrect-chain result fails closed and identifies the unhealthy lane.

## Verified network state

The adapter verifies:

- Base chain ID `8453`;
- OP Mainnet chain ID `10`;
- latest block and native ETH balance on each requested lane;
- AERO balance and Aerodrome AERO/Router bytecode on Base;
- OP balance and OP token bytecode on OP Mainnet.

## Environment variables

```text
SKYGRID_WALLET_ADDRESS
SKYGRID_BASE_RPC_URL
SKYGRID_OPTIMISM_RPC_URL
SKYGRID_WALLET_RPC_TIMEOUT_MS
SKYGRID_BASE_RPC_TIMEOUT_MS
SKYGRID_OPTIMISM_RPC_TIMEOUT_MS
```

`SKYGRID_WALLET_ADDRESS` is an optional public wallet address used when `address` is omitted. The legacy `SKYGRID_AERODROME_WALLET_ADDRESS` variable remains supported.

Use private or authenticated provider URLs for production. The adapter falls back to the public Base and OP Mainnet RPC endpoints for development and diagnostics.

Lane-specific timeout variables override `SKYGRID_WALLET_RPC_TIMEOUT_MS`. Valid timeout values are 500 through 30000 milliseconds; the default is 8000.

## Controlled-pilot placement

The dual-lane test uses mocked JSON-RPC responses so the controlled pilot remains deterministic and does not fail because of public-provider downtime or rate limits.

`pnpm run security:test` includes both the existing Base/Aerodrome regression and the new Base/Optimism dual-lane regression. The emergency training drill remains exactly five scenarios; wallet lane verification is an additional security check, not a sixth emergency scenario.

After PR #137 is rebased onto the current `MVPuknowme` branch, add an explicit controlled-pilot step for `pnpm run wallet:dual-lane:test` or rely on the build's `security:test` chain. Live RPC verification belongs in the deployment smoke test, not the deterministic CI gate.

## PowerShell local setup

```powershell
$env:SKYGRID_WALLET_ADDRESS = "0xYOUR_PUBLIC_WALLET_ADDRESS"
$env:SKYGRID_BASE_RPC_URL = "https://your-base-mainnet-rpc.example"
$env:SKYGRID_OPTIMISM_RPC_URL = "https://your-op-mainnet-rpc.example"
$env:SKYGRID_WALLET_RPC_TIMEOUT_MS = "8000"

pnpm run aerodrome:rpc:test
pnpm run wallet:dual-lane:test
pnpm run security:test
```

Never place a seed phrase, private key, wallet password, or approval signature in an environment variable.

## Call the deployed endpoint

```powershell
$SkygridUrl = "https://YOUR-SKYGRID-DEPLOYMENT"
$Wallet = "0xYOUR_PUBLIC_WALLET_ADDRESS"

Invoke-RestMethod `
  -Method Get `
  -Uri "$SkygridUrl/api/wallet/dual-lane?address=$Wallet"
```

Check only OP Mainnet:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "$SkygridUrl/api/wallet/dual-lane?address=$Wallet&lane=optimism"
```

## Expected safety state

The response must report:

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

The dual-lane adapter does not provide cross-chain bridging or failover transaction execution. It only verifies and reads the same public wallet address independently on Base and OP Mainnet.
