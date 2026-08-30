# SKYGRID Etherscan read-only route

`GET /api/skygrid/etherscan-read` provides three explicitly allowlisted Etherscan V2 reads. It does not accept arbitrary Etherscan `module` or `action` values.

## Operations

| Operation | Required query | Upstream action | Availability |
|---|---|---|---|
| `balance` | `chainid`, `address` | `account.balance` at `latest` | Standard read |
| `transaction_receipt` | `chainid`, `txhash` | `proxy.eth_getTransactionReceipt` | Standard read |
| `token_info` | `chainid`, `contractaddress` | `token.tokeninfo` | Etherscan Standard plan or above; explicit opt-in required |

Transaction receipts are reduced to a bounded summary. Raw logs are not returned. Token metadata is copied through an allowlist of known fields.

## Required server configuration

```text
ETHERSCAN_API_KEY=<server-side Etherscan V2 key>
ETHERSCAN_READ_ACCESS_TOKEN=<separate strong route token>
ETHERSCAN_ALLOWED_CHAIN_IDS=1,8453,534352
ETHERSCAN_ENABLE_PRO_ENDPOINTS=false
```

Choose only chain IDs supported by the account plan. Set `ETHERSCAN_ENABLE_PRO_ENDPOINTS=true` only when the Etherscan plan supports PRO endpoints.

Clients send the separate route token in `x-skygrid-read-token`. The Etherscan API key remains server-side and is never returned.

## PowerShell examples

```powershell
$Headers = @{ "x-skygrid-read-token" = $env:ETHERSCAN_READ_ACCESS_TOKEN }

Invoke-RestMethod `
  -Headers $Headers `
  -Uri "https://aurcore.skygrid-protocol.net/api/skygrid/etherscan-read?operation=balance&chainid=8453&address=0x1111111111111111111111111111111111111111"

Invoke-RestMethod `
  -Headers $Headers `
  -Uri "https://aurcore.skygrid-protocol.net/api/skygrid/etherscan-read?operation=transaction_receipt&chainid=8453&txhash=0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

Invoke-RestMethod `
  -Headers $Headers `
  -Uri "https://aurcore.skygrid-protocol.net/api/skygrid/etherscan-read?operation=token_info&chainid=8453&contractaddress=0x1111111111111111111111111111111111111111"
```

## Safety boundary

- GET only; every other HTTP method returns `405`.
- Requires a separate constant-time-compared access token.
- Chain IDs are restricted by a server-side allowlist.
- Arbitrary module/action forwarding is prohibited.
- Signing, private-key access, transaction broadcast, and `eth_sendRawTransaction` are disabled.
- Responses declare `execution_allowed: false` and use `Cache-Control: no-store`.
- Missing configuration, invalid targets, upstream errors, and unknown operations fail closed.

Official references: [Etherscan V2 balance](https://docs.etherscan.io/api-reference/endpoint/balance), [transaction receipt](https://docs.etherscan.io/api-reference/endpoint/ethgettransactionreceipt), [token info](https://docs.etherscan.io/api-reference/endpoint/tokeninfo), [supported chains](https://docs.etherscan.io/supported-chains), and [rate limits](https://docs.etherscan.io/rate-limits).
