import assert from "node:assert/strict";
import test from "node:test";
import { evaluateExchangePreflight } from "../src/intelligence/market-exchange-preflight.mjs";
import configuredPolicy from "../config/pnpk-exchange-preflight.v1.json" with { type: "json" };
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const approvedPolicy = {
  ...configuredPolicy,
  approved_providers: ["example-provider"],
  approved_route_networks: ["eip155:8453"],
};
const evaluate = (input, now) => evaluateExchangePreflight(input, now, approvedPolicy);

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
  const out = evaluate(valid(), new Date("2026-10-01T12:00:00Z"));
  assert.equal(out.decision, "ROUTE_APPROVED");
  assert.equal(out.failures.length, 0);
  assert.equal(out.execution.auto_execution_allowed, false);
});

test("fails closed when VPN route is unhealthy", () => {
  const input = valid();
  input.vpn.routeValid = false;
  const out = evaluate(input);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("vpn_route_valid"));
});

test("fails closed on stale or unsafe quote conditions", () => {
  const input = valid();
  input.quote.ageMs = 9000;
  input.quote.slippageBps = 75;
  const out = evaluate(input);
  assert.ok(out.failures.includes("quote_stale"));
  assert.ok(out.failures.includes("slippage_above_limit"));
});

test("does not claim impossible guarantees", () => {
  const out = evaluate(valid());
  assert.equal(out.guarantees.blocks_known_preflight_failures, true);
  assert.equal(out.guarantees.discovers_all_possible_failures, false);
  assert.equal(out.guarantees.guarantees_market_profit, false);
  assert.equal(out.guarantees.guarantees_loss_free_exchange, false);
});

test("checked-in configuration allows Base mainnet but awaits provider selection", () => {
  const out = evaluateExchangePreflight(valid());
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("provider_authorized"));
  assert.equal(out.observations.checks.route_network_authorized, true);
  assert.ok(!out.failures.includes("route_network_authorized"));
});

test("Base selection does not authorize Ethereum mainnet or Base Sepolia", () => {
  for (const routeNetworkId of ["eip155:1", "eip155:84532"]) {
    const out = evaluateExchangePreflight(valid({ routeNetworkId }));
    assert.equal(out.decision, "FAIL_CLOSED");
    assert.ok(out.failures.includes("route_network_authorized"));
  }
});

test("request policy cannot raise configured quote and market risk limits", () => {
  const input = valid();
  input.policy = { maxQuoteAgeMs: 999999, maxSlippageBps: 9999, maxPriceImpactBps: 9999 };
  input.quote = { ageMs: 6000, slippageBps: 51, priceImpactBps: 101 };
  const out = evaluate(input);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.equal(out.limits.max_quote_age_ms, 5000);
  assert.equal(out.limits.max_slippage_bps, 50);
  assert.equal(out.limits.max_price_impact_bps, 100);
  for (const failure of ["quote_stale", "slippage_above_limit", "price_impact_above_limit"]) {
    assert.ok(out.failures.includes(failure));
  }
});

test("request may tighten limits but cannot allowlist its own provider", () => {
  const input = valid();
  input.policy.maxSlippageBps = 1;
  assert.ok(evaluate(input).failures.includes("slippage_above_limit"));
  input.policy = approvedPolicy;
  input.trustedPolicy = approvedPolicy;
  assert.equal(evaluateExchangePreflight(input).decision, "FAIL_CLOSED");
});

test("request cannot disable operator-required VPN checks", () => {
  const input = valid();
  input.vpn.required = false;
  input.vpn.present = false;
  const out = evaluateExchangePreflight(input, new Date(), { ...approvedPolicy, vpn_required: true });
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("vpn_present"));
});

test("invalid configuration and clocks do not yield an approval", () => {
  assert.throws(() => evaluateExchangePreflight(valid(), new Date("invalid")), /clock_invalid/);
  assert.throws(() => evaluateExchangePreflight(valid(), new Date(), {}), /exchange_policy_invalid/);
  assert.throws(() => evaluateExchangePreflight(valid(), new Date(), { ...approvedPolicy, approved_providers: null }), /exchange_allowlist_invalid/);
  assert.throws(() => evaluateExchangePreflight(valid(), new Date(), { ...approvedPolicy, default_limits: {} }), /max_quote_age_ms_invalid/);
});

test("public receipt identifies founder and policy without copying credentials", () => {
  const input = valid({ bank_token: "private-token-canary", account_number: "private-account-canary" });
  const out = evaluate(input);
  assert.equal(out.report_visibility, "public");
  assert.equal(out.beneficiary.name, "Michael Vincent Patrick");
  assert.match(out.policy_hash, /^sha256:[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(out).includes("private-"));
  assert.equal(out.execution.auto_execution_allowed, false);
});

test("CLI writes a blocked public receipt and rejects overwrite without printing raw input", () => {
  const dir = mkdtempSync(join(tmpdir(), "exchange-preflight-test-"));
  try {
    const output = join(dir, "receipt.json");
    const cli = new URL("../scripts/exchange-preflight.mjs", import.meta.url).pathname;
    const run = raw => spawnSync(process.execPath, [cli, "--output", output], {
      encoding: "utf8", env: { PATH: process.env.PATH, PNPK_EXCHANGE_PREFLIGHT_JSON: raw },
    });
    const result = run(JSON.stringify(valid()));
    assert.equal(result.status, 1);
    const report = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(report.decision, "FAIL_CLOSED");
    assert.ok(report.failures.includes("provider_authorized"));
    assert.deepEqual(report, JSON.parse(result.stdout));
    const second = run("{private-input-canary");
    assert.equal(second.status, 1);
    assert.ok(!(second.stdout + second.stderr).includes("private-input-canary"));
    assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), report);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
