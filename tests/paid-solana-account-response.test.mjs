import assert from "node:assert/strict";
import test from "node:test";

import {
  PAID_SOLANA_ASSET,
  buildPaidAccountAssetResponse
} from "../lib/assets/paid-solana.mjs";

test("normalizes the Coinbase PAID Solana asset identity", () => {
  const response = buildPaidAccountAssetResponse();

  assert.equal(response.asset.name, "Paid");
  assert.equal(response.asset.symbol, "PAID");
  assert.equal(response.asset.network, "Solana");
  assert.equal(
    response.asset.mint_address,
    "98kfF7rmsg1QDUEoCqNE7g7M1FdrTt92TEp2CLzypump"
  );
  assert.equal(response.market_data.hardcoded_price, false);
  assert.equal(response.settlement.paid, false);
  assert.equal(response.settlement.status, "unverified");
});

test("calculates account valuation only from supplied observed market data", () => {
  const response = buildPaidAccountAssetResponse({
    balance: "100",
    priceUsd: "0.0287",
    priceObservedAt: "2026-09-27T16:00:00Z",
    priceSource: PAID_SOLANA_ASSET.coinbasePriceUrl
  });

  assert.equal(response.account.balance, 100);
  assert.equal(response.market_data.price_usd, 0.0287);
  assert.equal(response.account.valuation_usd, 2.87);
  assert.equal(response.account.valuation_verified, true);
  assert.equal(response.settlement.paid, false);
});

test("does not treat the PAID ticker as settlement proof", () => {
  const response = buildPaidAccountAssetResponse({
    balance: 1,
    priceUsd: 1,
    priceSource: PAID_SOLANA_ASSET.coinbasePriceUrl
  });

  assert.notEqual(response.asset.symbol.toLowerCase(), response.settlement.status);
  assert.equal(response.settlement.paid, false);
});
