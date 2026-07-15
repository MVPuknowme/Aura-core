# SKYGRID Aerodrome Wallet RPC

This integration connects a **public wallet address** to the SKYGRID Emergency Data On-Ramp through Base read-only JSON-RPC calls.

It does not request, store, or use a seed phrase or private key. It cannot sign transactions, broadcast transactions, grant token approvals, execute swaps, or take custody of assets.

## Endpoint

```text
GET /api/aerodrome/wallet?address=0x...
```

The endpoint verifies:

- the RPC reports Base chain ID `8453`;
- the Aerodrome AERO token contract has deployed bytecode;
- the Aerodrome Router contract has deployed bytecode;
- the wallet's Base ETH balance;
- the wallet's AERO token balance.

## Environment variables

```text
SKYGRID_BASE_RPC_URL
SKYGRID_AERODROME_WALLET_ADDRESS
SKYGRID_BASE_RPC_TIMEOUT_MS
```

`SKYGRID_BASE_RPC_URL` should be a private or authenticated Base mainnet provider URL for production. If it is omitted, the adapter uses the Base public mainnet RPC endpoint.

`SKYGRID_AERODROME_WALLET_ADDRESS` is optional. It lets the endpoint use one configured public wallet when the `address` query parameter is omitted.

## PowerShell local setup

```powershell
$env:SKYGRID_BASE_RPC_URL = "https://your-base-mainnet-rpc.example"
$env:SKYGRID_AERODROME_WALLET_ADDRESS = "0xYOUR_PUBLIC_WALLET_ADDRESS"
$env:SKYGRID_BASE_RPC_TIMEOUT_MS = "8000"

pnpm run aerodrome:rpc:test
```

Never place a seed phrase, private key, wallet password, or approval signature in an environment variable.

## Call the deployed endpoint

```powershell
$BaseUrl = "https://YOUR-SKYGRID-DEPLOYMENT"
$Wallet = "0xYOUR_PUBLIC_WALLET_ADDRESS"

Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/aerodrome/wallet?address=$Wallet"
```

Or, when `SKYGRID_AERODROME_WALLET_ADDRESS` is configured:

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/aerodrome/wallet"
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
