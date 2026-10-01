# Thorium Taiwan launch economics

Taiwan is the first commercial launch market for Thorium routing.

## Commercial lane

Thorium should initially be positioned as B2B routing, quote optimization,
provenance, and PNPK receipt infrastructure for regulated virtual-asset
operators. The model does not assume that SKYGRID-protocol is itself operating
a licensed exchange, taking custody, signing customer wallets, or broadcasting
customer trades.

## Market snapshot

Snapshot date: 2026-10-01.

The model records 10 VASPs from the Taiwan regulator's current AML-registration
list and uses only two venues for which a clean third-party 24-hour volume
snapshot was captured:

- BitoPro: USD 22,466,882.22
- MAX MaiCoin: USD 13,568,371.00
- visible reference volume: USD 36,035,253.22/day

No volume is imputed for the other registered VASPs.

## Three planning tiers

| Tier | Visible-flow capture | Thorium take rate | Modeled daily revenue | Modeled annual revenue |
| --- | ---: | ---: | ---: | ---: |
| Pilot | 0.25% | 3 bps | $27.03 | $9,864.65 |
| Scaled | 2.00% | 5 bps | $360.35 | $131,528.67 |
| Best case | 10.00% | 8 bps | $2,882.82 | $1,052,229.39 |

These are routing-revenue scenarios, not booked or realized revenue.

## Why the advantage can matter

Thorium PAD-1 is designed to compare provider routes without a static token
allowlist, normalize same-chain and cross-chain opportunities, reject stale or
unsafe quotes, and hash-bind the selected route into a PNPK-compatible receipt.

The commercial thesis is that regulated venues may value:
- additional route liquidity without surrendering custody;
- evidence and route provenance;
- fail-closed slippage/impact controls;
- cross-chain reach through adapters;
- an auditable boundary between route planning and execution.

## Revenue recognition

A modeled take-rate becomes realized revenue only after a commercial agreement,
actual routed volume, invoicing/settlement, and evidence reconciliation through
the SKYGRID revenue ledger.

Run:

```powershell
pnpm run thorium:taiwan:economics
pnpm run thorium:taiwan:economics:test
```
