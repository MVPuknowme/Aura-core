# Thorium — PAD-1

Thorium PAD-1 is SKYGRID-protocol's open-asset exchange-routing layer.

## Meaning of "no token limit"

Thorium does **not** maintain a static token allowlist. The asset universe is
provider-discovered: any asset can be evaluated when it has a valid chain
identifier, token metadata, and at least one provider route.

That is different from unlimited execution authority. A token can be
discoverable even when a route is unavailable because of liquidity, wallet,
venue, network, jurisdiction, or provider constraints.

## PAD-1 responsibilities

1. Normalize assets by chain and token address.
2. Accept quotes from multiple DEX, bridge, or exchange adapters.
3. Reject expired, malformed, excessive-slippage, or excessive-impact quotes.
4. Rank valid routes by effective output.
5. Hash-bind the request and selected quote.
6. Emit a Thorium route receipt that can be carried into PNPK.
7. Keep wallet signing and transaction broadcast outside PAD-1.

## Open-ended asset model

```text
token/coin request
    -> provider discovery
    -> quote adapters
    -> normalized asset IDs
    -> risk/expiry/slippage checks
    -> best valid route
    -> SHA-256 route receipt
    -> PNPK
    -> separately authorized execution layer
```

There is no hard-coded token-count or chain-count limit in PAD-1.

## Files

- `src/exchange/thorium-router.mjs`
- `tests/thorium-router.test.mjs`
- `config/thorium-pad1.v1.json`

## Current execution boundary

PAD-1 is deliberately plan-only. It does not custody assets, sign wallets,
approve token allowances, or broadcast swaps. Those capabilities belong in a
separate execution adapter with venue-specific authorization and receipts.
