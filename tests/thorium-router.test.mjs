import assert from "node:assert/strict";
import test from "node:test";

import {
  planThoriumExchange,
  thoriumAssetId
} from "../src/exchange/thorium-router.mjs";

const USDC_BASE = {
  chainId: 8453,
  address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  symbol: "USDC",
  decimals: 6
};

const WETH_BASE = {
  chainId: 8453,
  address: "0x4200000000000000000000000000000000000006",
  symbol: "WETH",
  decimals: 18
};

function request() {
  return {
    requestId: "thorium-001",
    operator: "MVPuknowme",
    inputAsset: USDC_BASE,
    outputAsset: WETH_BASE,
    amountInBaseUnits: "1000000"
  };
}

function quote(overrides = {}) {
  return {
    provider: "provider-a",
    quoteId: "qa",
    routeId: "route-a",
    sourceUrl: "https://example.exchange/quote/qa",
    inputAsset: USDC_BASE,
    outputAsset: WETH_BASE,
    amountInBaseUnits: "1000000",
    amountOutBaseUnits: "250000000000000",
    outputFeeBaseUnits: "1000000000000",
    slippageBps: 50,
    priceImpactBps: 40,
    gasCostUsd: 0.02,
    expiresAt: "2026-10-01T07:30:00.000Z",
    ...overrides
  };
}

test("does not impose a static token allowlist", () => {
  const result = planThoriumExchange({
    request: request(),
    quotes: [quote()],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.assetUniverse.staticTokenAllowlist, false);
  assert.equal(result.assetUniverse.tokenCountLimit, null);
  assert.equal(result.selected.provider, "provider-a");
  assert.equal(result.execution.allowed, false);
});

test("selects the highest effective output", () => {
  const result = planThoriumExchange({
    request: request(),
    quotes: [
      quote(),
      quote({
        provider: "provider-b",
        quoteId: "qb",
        routeId: "route-b",
        amountOutBaseUnits: "260000000000000",
        outputFeeBaseUnits: "1000000000000"
      })
    ],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.selected.provider, "provider-b");
});

test("rejects expired or excessive-impact routes", () => {
  const result = planThoriumExchange({
    request: request(),
    quotes: [
      quote({
        quoteId: "expired",
        expiresAt: "2026-10-01T06:59:59.000Z"
      }),
      quote({
        quoteId: "impact",
        priceImpactBps: 800
      })
    ],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.selected, null);
  assert.equal(result.rejected.length, 2);
});

test("supports cross-chain assets without hard-coded chain allowlists", () => {
  const SOL_WRAPPED = {
    chainId: 534352,
    address: "0x1111111111111111111111111111111111111111",
    symbol: "XASSET",
    decimals: 18
  };

  const result = planThoriumExchange({
    request: {
      ...request(),
      outputAsset: SOL_WRAPPED
    },
    quotes: [
      quote({
        outputAsset: SOL_WRAPPED,
        bridge: "provider-bridge",
        amountOutBaseUnits: "123456789"
      })
    ],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.selected.outputAsset.chainId, 534352);
  assert.equal(result.selected.bridge, "provider-bridge");
});

test("asset ids are deterministic", () => {
  assert.equal(
    thoriumAssetId(USDC_BASE),
    "8453:erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
  );
});
