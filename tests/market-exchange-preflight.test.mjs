import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExchangePreflight } from "../src/intelligence/market-exchange-preflight.mjs";

function valid(overrides = {}) {
  return {
    intentId: "intent-001",
    routeNetworkId: "eip155:8453",
    assetPair: "USDC/USD",
    provider: "example-provider",
    network: {
      reachable: true,
      dnsValid: true,
      tlsValid: true,
      clockSynchronized: true,
      providerHealthy: true
    },
    vpn: {
      required: true,
      present: true,
      routeValid: true,
      dnsLeakCheckPassed: true
    },
    market: {
      assetSupported: true,
      venueAvailable: true,
      liquiditySufficient: true
    },
    quote: {
      ageMs: 500,
      slippageBps: 5,
      priceImpactBps: 10
    },
    policy: {
      maxQuoteAgeMs: 5000,
      maxSlippageBps: 50,
      maxPriceImpactBps: 100
    },
    ...overrides
  };
}

test("approves only when network VPN market and quote checks pass", () => {
  const out = evaluateExchangePreflight(valid(), new Date("2026-10-01T12:00:00Z"));
  assert.equal(out.decision, "ROUTE_APPROVED");
  assert.equal(out.failures.length, 0);
  assert.equal(out.execution.auto_execution_allowed, false);
});

test("fails closed when VPN route is unhealthy", () => {
  const input = valid();
  input.vpn.routeValid = false;
  const out = evaluateExchangePreflight(input);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("vpn_route_valid"));
});

test("fails closed on stale or unsafe quote conditions", () => {
  const input = valid();
  input.quote.ageMs = 9000;
  input.quote.slippageBps = 75;
  const out = evaluateExchangePreflight(input);
  assert.ok(out.failures.includes("quote_stale"));
  assert.ok(out.failures.includes("slippage_above_limit"));
});

test("does not claim impossible guarantees", () => {
  const out = evaluateExchangePreflight(valid());
  assert.equal(out.guarantees.blocks_known_preflight_failures, true);
  assert.equal(out.guarantees.discovers_all_possible_failures, false);
  assert.equal(out.guarantees.guarantees_market_profit, false);
  assert.equal(out.guarantees.guarantees_loss_free_exchange, false);
});
