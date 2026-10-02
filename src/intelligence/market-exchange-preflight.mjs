import { createHash } from "node:crypto";

function bool(value, field) {
  if (value !== true && value !== false) throw new Error(`${field}_invalid`);
  return value;
}

function finiteNonnegative(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field}_invalid`);
  }
  return value;
}

function text(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field}_required`);
  return value.trim();
}

function stable(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stable);
  const out = {};
  for (const key of Object.keys(value).sort()) out[key] = stable(value[key]);
  return out;
}

function digest(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(stable(value))).digest("hex")}`;
}

export function evaluateExchangePreflight(input = {}, now = new Date()) {
  const intentId = text(input.intentId, "intent_id");
  const routeNetworkId = text(input.routeNetworkId, "route_network_id");
  const assetPair = text(input.assetPair, "asset_pair");
  const provider = text(input.provider, "provider");

  const network = input.network ?? {};
  const vpn = input.vpn ?? {};
  const quote = input.quote ?? {};
  const market = input.market ?? {};

  const checks = {
    network_reachable: bool(network.reachable, "network_reachable"),
    dns_valid: bool(network.dnsValid, "dns_valid"),
    tls_valid: bool(network.tlsValid, "tls_valid"),
    clock_synchronized: bool(network.clockSynchronized, "clock_synchronized"),
    provider_healthy: bool(network.providerHealthy, "provider_healthy"),
    vpn_required: bool(vpn.required, "vpn_required"),
    vpn_present: bool(vpn.present, "vpn_present"),
    vpn_route_valid: bool(vpn.routeValid, "vpn_route_valid"),
    vpn_dns_leak_check_passed: bool(vpn.dnsLeakCheckPassed, "vpn_dns_leak_check_passed"),
    asset_supported: bool(market.assetSupported, "asset_supported"),
    venue_available: bool(market.venueAvailable, "venue_available"),
    liquidity_sufficient: bool(market.liquiditySufficient, "liquidity_sufficient")
  };

  const quoteAgeMs = finiteNonnegative(quote.ageMs, "quote_age_ms");
  const maxQuoteAgeMs = finiteNonnegative(input.policy?.maxQuoteAgeMs ?? 5000, "max_quote_age_ms");
  const slippageBps = finiteNonnegative(quote.slippageBps, "slippage_bps");
  const maxSlippageBps = finiteNonnegative(input.policy?.maxSlippageBps ?? 50, "max_slippage_bps");
  const priceImpactBps = finiteNonnegative(quote.priceImpactBps, "price_impact_bps");
  const maxPriceImpactBps = finiteNonnegative(input.policy?.maxPriceImpactBps ?? 100, "max_price_impact_bps");

  const failures = [];
  for (const [name, passed] of Object.entries(checks)) {
    if (name === "vpn_required") continue;
    if (name.startsWith("vpn_") && checks.vpn_required === false) continue;
    if (!passed) failures.push(name);
  }

  if (quoteAgeMs > maxQuoteAgeMs) failures.push("quote_stale");
  if (slippageBps > maxSlippageBps) failures.push("slippage_above_limit");
  if (priceImpactBps > maxPriceImpactBps) failures.push("price_impact_above_limit");

  const decision = failures.length === 0 ? "ROUTE_APPROVED" : "FAIL_CLOSED";

  const receipt = {
    schema: "pnpk.exchange-preflight.v1",
    intent_id: intentId,
    route_network_id: routeNetworkId,
    asset_pair: assetPair,
    provider,
    observed_at: now.toISOString(),
    decision,
    failures,
    limits: {
      max_quote_age_ms: maxQuoteAgeMs,
      max_slippage_bps: maxSlippageBps,
      max_price_impact_bps: maxPriceImpactBps
    },
    observations: {
      checks,
      quote_age_ms: quoteAgeMs,
      slippage_bps: slippageBps,
      price_impact_bps: priceImpactBps
    },
    guarantees: {
      blocks_known_preflight_failures: true,
      discovers_all_possible_failures: false,
      guarantees_market_profit: false,
      guarantees_loss_free_exchange: false
    },
    execution: {
      wallet_signing_allowed: false,
      transaction_broadcast_allowed: false,
      auto_execution_allowed: false
    }
  };

  return Object.freeze({
    ...receipt,
    receipt_hash: digest(receipt)
  });
}
