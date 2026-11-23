import { createHash } from "node:crypto";
import configuredPolicy from "../../config/pnpk-exchange-preflight.v1.json" with { type: "json" };

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

// trustedPolicy is server/operator configuration, never a request-body field.
export function evaluateExchangePreflight(input = {}, now = new Date(), trustedPolicy = configuredPolicy) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("clock_invalid");
  if (trustedPolicy?.schema !== "pnpk.exchange-preflight-policy.v1" || trustedPolicy.mode !== "fail_closed") {
    throw new Error("exchange_policy_invalid");
  }
  for (const field of ["approved_providers", "approved_route_networks"]) {
    if (!Array.isArray(trustedPolicy[field]) || trustedPolicy[field].some(value => typeof value !== "string" || !value.trim())) {
      throw new Error("exchange_allowlist_invalid");
    }
  }
  const intentId = text(input.intentId, "intent_id");
  const routeNetworkId = text(input.routeNetworkId, "route_network_id");
  const assetPair = text(input.assetPair, "asset_pair");
  const provider = text(input.provider, "provider");

  const network = input.network ?? {};
  const vpn = input.vpn ?? {};
  const quote = input.quote ?? {};
  const market = input.market ?? {};
  const policyVpnRequired = bool(trustedPolicy.vpn_required, "policy_vpn_required");

  const checks = {
    network_reachable: bool(network.reachable, "network_reachable"),
    dns_valid: bool(network.dnsValid, "dns_valid"),
    tls_valid: bool(network.tlsValid, "tls_valid"),
    clock_synchronized: bool(network.clockSynchronized, "clock_synchronized"),
    provider_healthy: bool(network.providerHealthy, "provider_healthy"),
    provider_authorized: trustedPolicy.approved_providers.includes(provider),
    route_network_authorized: trustedPolicy.approved_route_networks.includes(routeNetworkId),
    vpn_required: bool(vpn.required, "vpn_required") || policyVpnRequired,
    vpn_present: bool(vpn.present, "vpn_present"),
    vpn_route_valid: bool(vpn.routeValid, "vpn_route_valid"),
    vpn_dns_leak_check_passed: bool(vpn.dnsLeakCheckPassed, "vpn_dns_leak_check_passed"),
    asset_supported: bool(market.assetSupported, "asset_supported"),
    venue_available: bool(market.venueAvailable, "venue_available"),
    liquidity_sufficient: bool(market.liquiditySufficient, "liquidity_sufficient")
  };

  const quoteAgeMs = finiteNonnegative(quote.ageMs, "quote_age_ms");
  const maxQuoteAgeMs = effectiveLimit("maxQuoteAgeMs", "max_quote_age_ms");
  const slippageBps = finiteNonnegative(quote.slippageBps, "slippage_bps");
  const maxSlippageBps = effectiveLimit("maxSlippageBps", "max_slippage_bps");
  const priceImpactBps = finiteNonnegative(quote.priceImpactBps, "price_impact_bps");
  const maxPriceImpactBps = effectiveLimit("maxPriceImpactBps", "max_price_impact_bps");

  function effectiveLimit(inputField, policyField) {
    const configured = finiteNonnegative(trustedPolicy.default_limits?.[policyField], policyField);
    const requested = finiteNonnegative(input.policy?.[inputField] ?? configured, inputField);
    return Math.min(configured, requested);
  }

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
    report_visibility: "public",
    beneficiary: {
      id: text(trustedPolicy.reporting?.beneficiary?.id, "beneficiary_id"),
      name: text(trustedPolicy.reporting?.beneficiary?.name, "beneficiary_name"),
      github: text(trustedPolicy.reporting?.beneficiary?.github, "beneficiary_github"),
    },
    policy_hash: digest(trustedPolicy),
    evidence_scope: "caller-supplied observations; not independent venue or bank verification",
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
