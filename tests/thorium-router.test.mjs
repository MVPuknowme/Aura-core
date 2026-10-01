import assert from "node:assert/strict";
import test from "node:test";

import {
  hashCanonical,
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

test("does not impose a static token or chain allowlist", () => {
  const result = planThoriumExchange({
    request: request(),
    quotes: [quote()],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.assetUniverse.staticTokenAllowlist, false);
  assert.equal(result.assetUniverse.tokenCountLimit, null);
  assert.equal(result.assetUniverse.chainCountLimit, null);
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
  const crossChainAsset = {
    chainRef: "solana:mainnet",
    tokenRef: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    decimals: 9
  };

  const result = planThoriumExchange({
    request: {
      ...request(),
      outputAsset: crossChainAsset
    },
    quotes: [
      quote({
        outputAsset: crossChainAsset,
        bridge: "provider-bridge",
        amountOutBaseUnits: "123456789",
        outputFeeBaseUnits: "1000000"
      })
    ],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.selected.outputAsset.chainRef, "solana:mainnet");
  assert.equal(result.selected.bridge, "provider-bridge");
});

test("native asset identity does not depend on display symbol", () => {
  const nativeA = { chainId: 8453, native: true, symbol: "ETH", decimals: 18 };
  const nativeB = { chainId: 8453, native: true, symbol: "Base ETH", decimals: 18 };
  assert.equal(thoriumAssetId(nativeA), thoriumAssetId(nativeB));

  assert.throws(
    () =>
      planThoriumExchange({
        request: {
          ...request(),
          inputAsset: nativeA,
          outputAsset: nativeB
        },
        quotes: []
      }),
    /thorium_assets_must_differ/
  );
});

test("rejects unsafe numeric atomic amounts and zero input", () => {
  assert.throws(
    () =>
      planThoriumExchange({
        request: { ...request(), amountInBaseUnits: 9007199254740993 },
        quotes: []
      }),
    /request_amount_in_invalid/
  );

  assert.throws(
    () =>
      planThoriumExchange({
        request: { ...request(), amountInBaseUnits: "0" },
        quotes: []
      }),
    /request_amount_in_must_be_positive/
  );
});

test("rejects invalid risk limits and negative gas costs", () => {
  assert.throws(
    () =>
      planThoriumExchange({
        request: request(),
        quotes: [quote()],
        maxSlippageBps: Number.NaN
      }),
    /thorium_max_slippage_bps_invalid/
  );

  const result = planThoriumExchange({
    request: request(),
    quotes: [quote({ gasCostUsd: -1 })],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });
  assert.equal(result.selected, null);
  assert.match(result.rejected[0].reasons[0], /quote_gas_cost_invalid/);
});

test("rejects mismatched provider asset metadata", () => {
  const result = planThoriumExchange({
    request: request(),
    quotes: [
      quote({
        outputAsset: { ...WETH_BASE, decimals: 6 }
      })
    ],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.selected, null);
  assert.match(result.rejected[0].reasons[0], /quote_output_metadata_mismatch/);
});

test("rejects malformed or timezone-ambiguous quote expiry", () => {
  for (const expiresAt of [
    "2099-02-30T00:00:00Z",
    "2026-10-01T07:30:00"
  ]) {
    const result = planThoriumExchange({
      request: request(),
      quotes: [quote({ expiresAt })],
      now: () => Date.parse("2026-10-01T07:00:00.000Z")
    });
    assert.equal(result.selected, null);
    assert.match(result.rejected[0].reasons[0], /quote_expires_at_invalid/);
  }
});

test("rejects non-canonical provider metadata without aborting all quotes", () => {
  const circular = {};
  circular.self = circular;

  const result = planThoriumExchange({
    request: request(),
    quotes: [
      quote({ quoteId: "bad", metadata: circular }),
      quote({ quoteId: "good", metadata: { venue: "safe" } })
    ],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.selected.quoteId, "good");
  assert.match(result.rejected[0].reasons[0], /quote_metadata.*circular/);
});

test("receipt binds request and quote selection in one digest", () => {
  const result = planThoriumExchange({
    request: request(),
    quotes: [quote()],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  const expected = hashCanonical({
    schema: "thorium-route-receipt/v1",
    policyVersion: result.policyVersion,
    status: result.receipt.status,
    requestHash: result.receipt.requestHash,
    selectedQuoteHash: result.receipt.selectedQuoteHash,
    selectedProvider: result.receipt.selectedProvider,
    selectedQuoteId: result.receipt.selectedQuoteId,
    riskLimits: result.receipt.riskLimits
  });

  assert.equal(result.receipt.receiptHash, expected);
});

test("native decimals must be explicit valid integers when supplied", () => {
  assert.throws(
    () =>
      thoriumAssetId({
        chainId: 8453,
        native: true,
        symbol: "ETH",
        decimals: "18"
      }),
    /asset_decimals_invalid/
  );
  assert.throws(
    () =>
      thoriumAssetId({
        chainId: 8453,
        native: true,
        symbol: "ETH",
        decimals: -1
      }),
    /asset_decimals_invalid/
  );
});

test("asset ids are deterministic", () => {
  assert.equal(
    thoriumAssetId(USDC_BASE),
    "eip155:8453:token:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
  );
});


test("rejects quotes with missing or nonnumeric risk metrics", () => {
  for (const overrides of [
    { slippageBps: undefined },
    { priceImpactBps: undefined },
    { slippageBps: "0" },
    { priceImpactBps: false }
  ]) {
    const result = planThoriumExchange({
      request: request(),
      quotes: [quote(overrides)],
      now: () => Date.parse("2026-10-01T07:00:00.000Z")
    });
    assert.equal(result.selected, null);
    assert.match(
      result.rejected[0].reasons[0],
      /quote_(slippage|price_impact)_invalid/
    );
  }
});

test("rejects malformed explicit EIP-155 chain references", () => {
  for (const chainRef of ["eip155:-1", "eip155:01", "eip155:base", "eip155:9007199254740992"]) {
    assert.throws(
      () =>
        thoriumAssetId({
          chainRef,
          address: USDC_BASE.address,
          symbol: "USDC",
          decimals: 6
        }),
      /chain_ref_invalid/
    );
  }
});

test("receipt binds the effective risk limits", () => {
  const result = planThoriumExchange({
    request: request(),
    quotes: [quote()],
    maxSlippageBps: 75,
    maxPriceImpactBps: 125,
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.deepEqual(result.receipt.riskLimits, {
    maxSlippageBps: 75,
    maxPriceImpactBps: 125
  });

  const expected = hashCanonical({
    schema: "thorium-route-receipt/v1",
    policyVersion: result.policyVersion,
    status: result.receipt.status,
    requestHash: result.receipt.requestHash,
    selectedQuoteHash: result.receipt.selectedQuoteHash,
    selectedProvider: result.receipt.selectedProvider,
    selectedQuoteId: result.receipt.selectedQuoteId,
    riskLimits: result.receipt.riskLimits
  });
  assert.equal(result.receipt.receiptHash, expected);
});

test("canonical metadata preserves __proto__ as data", () => {
  const metadata = JSON.parse('{"__proto__":{"x":1},"venue":"safe"}');
  const result = planThoriumExchange({
    request: request(),
    quotes: [quote({ metadata })],
    now: () => Date.parse("2026-10-01T07:00:00.000Z")
  });

  assert.equal(result.selected.quoteId, "qa");
  assert.equal(Object.prototype.x, undefined);
  assert.equal(result.selected.metadata.__proto__.x, 1);
});

test("rejects malformed approval flags", () => {
  for (const requiresApproval of ["true", 1, null]) {
    const result = planThoriumExchange({
      request: request(),
      quotes: [quote({ requiresApproval })],
      now: () => Date.parse("2026-10-01T07:00:00.000Z")
    });

    assert.equal(result.selected, null);
    assert.match(
      result.rejected[0].reasons[0],
      /quote_requires_approval_invalid/
    );
  }
});


test("accepts canonical explicit EIP-155 references", () => {
  assert.equal(
    thoriumAssetId({
      chainRef: "eip155:8453",
      address: USDC_BASE.address,
      symbol: "USDC",
      decimals: 6
    }),
    "eip155:8453:token:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"
  );
});
