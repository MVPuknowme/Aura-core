# SkyGrid Postman Mock Server Runbook

## Purpose

Use the Postman API to create a mock-first API superhighway for SkyGrid / Aura-Core before the live backend endpoints are fully deployed.

The mock server simulates:

- Web3 chain health
- L2 to Ethereum bridge quote
- bridge intent creation
- bridge intent status
- P2P node heartbeat
- Kafka-style P2P event bridge
- ISP route status
- failover signals
- usage metering
- proof lookup

## Files

```text
postman/skygrid-web3-p2p-superhighway.postman_collection.json
scripts/postman-create-skygrid-mock.mjs
```

The script is the preferred path because it builds a Postman collection with saved examples, creates the collection through the Postman API, then creates a mock server from that collection.

## Required environment variables

```powershell
$env:POSTMAN_API_KEY = "PMAK_REPLACE_ME"
```

Optional but recommended:

```powershell
$env:POSTMAN_WORKSPACE_ID = "POSTMAN_WORKSPACE_ID_REPLACE_ME"
```

By default, the script creates a private mock server. Private Postman mocks require the `x-api-key` header when calling the mock URL.

To create a public mock server instead:

```powershell
$env:POSTMAN_MOCK_PRIVATE = "false"
```

To also write a generated collection JSON locally:

```powershell
$env:POSTMAN_WRITE_COLLECTION = "true"
```

## Run

```powershell
node scripts/postman-create-skygrid-mock.mjs
```

Expected output shape:

```json
{
  "collectionUid": "12345678-collection-id",
  "mockId": "mock-id",
  "mockUrl": "https://example.mock.pstmn.io",
  "private": true,
  "smoke": {
    "powershell": "Invoke-RestMethod -Headers @{ 'x-api-key' = $env:POSTMAN_API_KEY } -Uri 'https://example.mock.pstmn.io/api/health'",
    "curl": "curl -H \"x-api-key: $POSTMAN_API_KEY\" \"https://example.mock.pstmn.io/api/health\""
  }
}
```

## Smoke test a private mock

```powershell
$mockUrl = "https://example.mock.pstmn.io"
Invoke-RestMethod -Headers @{ "x-api-key" = $env:POSTMAN_API_KEY } -Uri "$mockUrl/api/health"
```

## Smoke test a public mock

```powershell
$mockUrl = "https://example.mock.pstmn.io"
Invoke-RestMethod -Uri "$mockUrl/api/health"
```

## Mock endpoint sequence

Run these against the created mock URL:

```text
GET  /api/health
GET  /api/web3/chains/health
POST /api/p2p/nodes/heartbeat
POST /api/p2p/kafka/events
POST /api/web3/bridge/quote
POST /api/web3/bridge/intents
GET  /api/web3/bridge/intents/{{intent_id}}/status
POST /api/failover/signals
POST /api/isp/route/status
POST /api/billing/usage/web3-bridge
POST /api/billing/usage/p2p-node
GET  /api/proofs/{{proof_id}}
```

## Safety gates

The mock collection is intentionally designed around coordination and proof logging, not custody.

Blocked by design:

```yaml
blocked:
  - private key submission
  - seed phrase submission
  - raw wallet credentials
  - hidden bridge execution
  - automatic asset movement without user approval
  - unlogged route changes
  - unmetered infrastructure support
```

## How this helps SkyGrid

The mock server gives SkyGrid a working API contract before production endpoints are ready. Postman can now demonstrate the superhighway path:

```text
P2P device/node signal
        ↓
SkyGrid route and proof layer
        ↓
Web3 L2/mainnet bridge status
        ↓
failover / ISP trend check
        ↓
billing usage rider
        ↓
proof lookup and reconciliation
```

## Next integration step

After the mock responds correctly, point `base_url` from the Postman mock URL to the staging SkyGrid API URL and rerun the same collection as a live contract test.
