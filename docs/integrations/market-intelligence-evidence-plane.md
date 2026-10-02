# SKYGRID + Market Intelligence API evidence plane

**Status:** controlled-pilot adapter  
**System:** SKYGRID-protocol / Aura-Core / PNPK  
**Authority:** read-only evidence; no trading, signing, settlement, or automatic x402 spend

## Objective

Use Market Intelligence API as one upstream evidence source while preserving
AURA's independent reasoning and PNPK fail-closed controls.

The provider exposes market, on-chain, SEC, rates, news, risk, historical and
MCP surfaces. SKYGRID does not treat provider-derived signals or decisions as
ground truth.

## Competitive design

AURA's differentiation is not "a second signal." It is the evidence-control
layer around signals:

1. ingest provider output;
2. preserve source URL, route, timestamp, and payload;
3. classify directional outputs as inferred evidence;
4. represent provider track record as separate observed calibration evidence;
5. mark stale, weakly calibrated, or adverse-calibration evidence explicitly;
6. cross-check against independent sources before high-confidence promotion;
7. hash-bind evidence in AURA SUPER INTELLIGENCE;
8. require PNPK policy and receipt generation;
9. keep execution authority in a separate explicitly authorized layer.

## Payment boundary

The default approved spend is **$0**.

Paid x402 requests fail closed unless:
- payment is explicitly authorized;
- the exact request price is known;
- the request price is at or below the approved spend cap.

This adapter does not sign wallets, broadcast transactions, settle payments,
or place trades.

## Confidence rules

- A single directional provider response never becomes high-confidence evidence.
- Missing or insufficient calibration adds a quality flag.
- Weak empirical calibration adds a quality flag.
- Adverse empirical calibration marks directional evidence as conflicting.
- Stale observations are marked stale.
- Independent confirmation is required before promotion to high-confidence
  market conclusions.

## Integration

Implementation:
- `src/intelligence/market-intelligence-evidence.mjs`
- `tests/market-intelligence-evidence.test.mjs`
- `config/market-intelligence-evidence.v1.json`

The resulting evidence-plane objects are compatible with the existing
`evaluateAuraSuperIntelligence` flow and remain advisory by default.
