import { createHash } from "node:crypto";

export const THORIUM_POLICY_VERSION = "thorium-pad1-v1";

function assertCanonicalJson(value, field = "value", seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${field}_not_canonical_json`);
    return value;
  }
  if (["undefined", "bigint", "function", "symbol"].includes(typeof value)) {
    throw new Error(`${field}_not_canonical_json`);
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) throw new Error(`${field}_circular`);
    seen.add(value);
    const out = value.map((item, index) =>
      assertCanonicalJson(item, `${field}_${index}`, seen)
    );
    seen.delete(value);
    return out;
  }
  if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${field}_not_plain_object`);
    }
    if (seen.has(value)) throw new Error(`${field}_circular`);
    seen.add(value);
    const out = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      Object.defineProperty(out, key, {
        value: assertCanonicalJson(value[key], `${field}_${key}`, seen),
        enumerable: true,
        configurable: false,
        writable: false
      });
    }
    seen.delete(value);
    return out;
  }
  throw new Error(`${field}_not_canonical_json`);
}

export function hashCanonical(value) {
  return createHash("sha256")
    .update(JSON.stringify(assertCanonicalJson(value, "canonical")))
    .digest("hex");
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function atomicIntegerString(value, field) {
  let normalized;
  if (typeof value === "bigint") {
    if (value < 0n) throw new Error(`${field}_invalid`);
    normalized = value.toString();
  } else if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${field}_invalid`);
    }
    normalized = String(value);
  } else if (typeof value === "string") {
    normalized = value.trim();
  } else {
    throw new Error(`${field}_invalid`);
  }
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    throw new Error(`${field}_invalid`);
  }
  return normalized;
}

function normalizeChainRef(asset = {}) {
  const explicit = text(asset.chainRef ?? asset.chain);
  if (explicit) {
    if (!/^[a-z0-9][a-z0-9-]{0,31}:[A-Za-z0-9._-]{1,64}$/.test(explicit)) {
      throw new Error("chain_ref_invalid");
    }
    if (explicit.startsWith("eip155:")) {
      const suffix = explicit.slice("eip155:".length);
      if (!/^[1-9]\d*$/.test(suffix)) throw new Error("chain_ref_invalid");
      const n = Number(suffix);
      if (!Number.isSafeInteger(n) || n <= 0 || String(n) !== suffix) {
        throw new Error("chain_ref_invalid");
      }
      return `eip155:${n}`;
    }
    return explicit;
  }
  const n = Number(asset.chainId);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("chain_id_invalid");
  return `eip155:${n}`;
}

function normalizeDecimals(value, { defaultValue } = {}) {
  if (value === undefined || value === null) {
    if (defaultValue === undefined) throw new Error("asset_decimals_invalid");
    return defaultValue;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 255
  ) {
    throw new Error("asset_decimals_invalid");
  }
  return value;
}

function normalizeTokenReference(asset, chainRef) {
  const raw = text(asset.tokenRef ?? asset.address ?? asset.assetId);
  if (!raw) throw new Error("token_reference_required");

  if (chainRef.startsWith("eip155:")) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
      throw new Error("token_address_invalid");
    }
    return raw.toLowerCase();
  }

  if (raw.length > 200 || /[\u0000-\u001f\u007f\s]/.test(raw)) {
    throw new Error("token_reference_invalid");
  }
  return raw;
}

export function normalizeThoriumAsset(asset = {}) {
  const chainRef = normalizeChainRef(asset);
  const native = asset.native === true || asset.kind === "native";
  const symbol = text(asset.symbol);
  if (!symbol) throw new Error("asset_symbol_required");

  if (native) {
    return {
      chainRef,
      chainId: chainRef.startsWith("eip155:")
        ? Number(chainRef.slice("eip155:".length))
        : null,
      kind: "native",
      symbol,
      tokenRef: null,
      address: null,
      decimals: normalizeDecimals(asset.decimals, { defaultValue: 18 })
    };
  }

  const tokenRef = normalizeTokenReference(asset, chainRef);
  return {
    chainRef,
    chainId: chainRef.startsWith("eip155:")
      ? Number(chainRef.slice("eip155:".length))
      : null,
    kind: "token",
    symbol,
    tokenRef,
    address: chainRef.startsWith("eip155:") ? tokenRef : null,
    decimals: normalizeDecimals(asset.decimals)
  };
}

export function thoriumAssetId(asset) {
  const normalized = normalizeThoriumAsset(asset);
  return normalized.kind === "native"
    ? `${normalized.chainRef}:native`
    : `${normalized.chainRef}:token:${normalized.tokenRef}`;
}

function sameAsset(a, b) {
  return thoriumAssetId(a) === thoriumAssetId(b);
}

function sameAssetMetadata(a, b) {
  const left = normalizeThoriumAsset(a);
  const right = normalizeThoriumAsset(b);
  return (
    thoriumAssetId(left) === thoriumAssetId(right) &&
    left.symbol === right.symbol &&
    left.decimals === right.decimals
  );
}

function parseStrictRfc3339(value, field) {
  if (typeof value !== "string") throw new Error(`${field}_invalid`);
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/
  );
  if (!match) throw new Error(`${field}_invalid`);

  const [, y, mo, d, h, mi, s, , zone] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s);

  if (
    month < 1 || month > 12 ||
    day < 1 || day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    throw new Error(`${field}_invalid`);
  }

  const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day ||
    check.getUTCHours() !== hour ||
    check.getUTCMinutes() !== minute ||
    check.getUTCSeconds() !== second
  ) {
    throw new Error(`${field}_invalid`);
  }

  if (zone !== "Z") {
    const offsetHour = Number(zone.slice(1, 3));
    const offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) {
      throw new Error(`${field}_invalid`);
    }
  }

  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`${field}_invalid`);
  return ms;
}

function nonnegativeFiniteNumber(value, field, { allowNull = false } = {}) {
  if ((value === undefined || value === null) && allowNull) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field}_invalid`);
  }
  return value;
}

function optionalBoolean(value, field, defaultValue = false) {
  if (value === undefined) return defaultValue;
  if (typeof value !== "boolean") throw new Error(`${field}_invalid`);
  return value;
}

function normalizeQuote(quote, request, nowMs) {
  const provider = text(quote?.provider);
  const quoteId = text(quote?.quoteId);
  if (!provider || !quoteId) throw new Error("quote_identity_required");

  if (!sameAsset(quote.inputAsset, request.inputAsset)) {
    throw new Error("quote_input_asset_mismatch");
  }
  if (!sameAsset(quote.outputAsset, request.outputAsset)) {
    throw new Error("quote_output_asset_mismatch");
  }
  if (!sameAssetMetadata(quote.inputAsset, request.inputAsset)) {
    throw new Error("quote_input_metadata_mismatch");
  }
  if (!sameAssetMetadata(quote.outputAsset, request.outputAsset)) {
    throw new Error("quote_output_metadata_mismatch");
  }

  const amountIn = atomicIntegerString(quote.amountInBaseUnits, "quote_amount_in");
  if (amountIn !== request.amountInBaseUnits) {
    throw new Error("quote_amount_in_mismatch");
  }

  const amountOut = BigInt(
    atomicIntegerString(quote.amountOutBaseUnits, "quote_amount_out")
  );
  const outputFee = BigInt(
    atomicIntegerString(quote.outputFeeBaseUnits ?? "0", "quote_output_fee")
  );
  if (outputFee > amountOut) throw new Error("quote_output_fee_exceeds_output");

  const expiresAtMs = parseStrictRfc3339(quote.expiresAt, "quote_expires_at");
  const stale = expiresAtMs <= nowMs;
  const slippageBps = nonnegativeFiniteNumber(
    quote.slippageBps,
    "quote_slippage"
  );
  const priceImpactBps = nonnegativeFiniteNumber(
    quote.priceImpactBps,
    "quote_price_impact"
  );
  const gasCostUsd = nonnegativeFiniteNumber(
    quote.gasCostUsd,
    "quote_gas_cost",
    { allowNull: true }
  );
  const requiresApproval = optionalBoolean(
    quote.requiresApproval,
    "quote_requires_approval"
  );
  const metadata =
    quote.metadata === undefined || quote.metadata === null
      ? null
      : assertCanonicalJson(quote.metadata, "quote_metadata");

  return {
    provider,
    quoteId,
    routeId: text(quote.routeId) || quoteId,
    sourceUrl: text(quote.sourceUrl) || null,
    inputAsset: request.inputAsset,
    outputAsset: request.outputAsset,
    amountInBaseUnits: amountIn,
    amountOutBaseUnits: amountOut.toString(),
    outputFeeBaseUnits: outputFee.toString(),
    effectiveOutputBaseUnits: (amountOut - outputFee).toString(),
    gasCostUsd,
    slippageBps,
    priceImpactBps,
    expiresAt: new Date(expiresAtMs).toISOString(),
    stale,
    requiresApproval,
    bridge: quote.bridge ? String(quote.bridge) : null,
    metadata
  };
}

export function planThoriumExchange({
  request,
  quotes = [],
  maxSlippageBps = 100,
  maxPriceImpactBps = 300,
  now = () => Date.now()
} = {}) {
  if (!request || typeof request !== "object") {
    throw new Error("thorium_request_required");
  }
  if (!Array.isArray(quotes)) throw new Error("thorium_quotes_invalid");

  const slippageLimit = nonnegativeFiniteNumber(
    maxSlippageBps,
    "thorium_max_slippage_bps"
  );
  const priceImpactLimit = nonnegativeFiniteNumber(
    maxPriceImpactBps,
    "thorium_max_price_impact_bps"
  );
  const riskLimits = {
    maxSlippageBps: slippageLimit,
    maxPriceImpactBps: priceImpactLimit
  };

  const normalizedRequest = {
    requestId: text(request.requestId),
    operator: text(request.operator),
    inputAsset: normalizeThoriumAsset(request.inputAsset),
    outputAsset: normalizeThoriumAsset(request.outputAsset),
    amountInBaseUnits: atomicIntegerString(
      request.amountInBaseUnits,
      "request_amount_in"
    ),
    recipient: text(request.recipient) || null
  };

  if (!normalizedRequest.requestId || !normalizedRequest.operator) {
    throw new Error("thorium_request_identity_required");
  }
  if (BigInt(normalizedRequest.amountInBaseUnits) <= 0n) {
    throw new Error("request_amount_in_must_be_positive");
  }
  if (sameAsset(normalizedRequest.inputAsset, normalizedRequest.outputAsset)) {
    throw new Error("thorium_assets_must_differ");
  }

  const nowMs = Number(now());
  if (!Number.isFinite(nowMs)) throw new Error("thorium_now_invalid");

  const accepted = [];
  const rejected = [];

  for (const quote of quotes) {
    try {
      const normalized = normalizeQuote(quote, normalizedRequest, nowMs);
      const reasons = [];
      if (normalized.stale) reasons.push("quote_expired");
      if (normalized.slippageBps > slippageLimit) {
        reasons.push("slippage_above_limit");
      }
      if (normalized.priceImpactBps > priceImpactLimit) {
        reasons.push("price_impact_above_limit");
      }
      if (BigInt(normalized.effectiveOutputBaseUnits) <= 0n) {
        reasons.push("non_positive_effective_output");
      }

      if (reasons.length) {
        rejected.push({
          provider: normalized.provider,
          quoteId: normalized.quoteId,
          reasons
        });
      } else {
        accepted.push(normalized);
      }
    } catch (error) {
      rejected.push({
        provider: text(quote?.provider) || "unknown",
        quoteId: text(quote?.quoteId) || "unknown",
        reasons: [error instanceof Error ? error.message : "quote_invalid"]
      });
    }
  }

  accepted.sort((a, b) => {
    const outputA = BigInt(a.effectiveOutputBaseUnits);
    const outputB = BigInt(b.effectiveOutputBaseUnits);
    if (outputA === outputB) {
      const gasA = a.gasCostUsd ?? Number.POSITIVE_INFINITY;
      const gasB = b.gasCostUsd ?? Number.POSITIVE_INFINITY;
      return gasA - gasB;
    }
    return outputA > outputB ? -1 : 1;
  });

  const selected = accepted[0] ?? null;
  const requestHash = hashCanonical(normalizedRequest);
  const quoteHash = selected ? hashCanonical(selected) : null;
  const status = selected ? "ROUTE_SELECTED" : "NO_VALID_ROUTE";
  const receiptHash = hashCanonical({
    schema: "thorium-route-receipt/v1",
    policyVersion: THORIUM_POLICY_VERSION,
    status,
    requestHash,
    selectedQuoteHash: quoteHash,
    selectedProvider: selected?.provider ?? null,
    selectedQuoteId: selected?.quoteId ?? null,
    riskLimits
  });

  return {
    system: "Thorium",
    pad: "PAD-1",
    policyVersion: THORIUM_POLICY_VERSION,
    assetUniverse: {
      mode: "provider_discovered",
      staticTokenAllowlist: false,
      tokenCountLimit: null,
      chainCountLimit: null,
      note:
        "Any provider-qualified asset may be evaluated using a CAIP-style chain reference and token reference; execution still depends on wallet, liquidity, network, venue, and legal constraints."
    },
    request: normalizedRequest,
    requestHash,
    riskLimits,
    candidates: accepted,
    rejected,
    selected,
    receipt: {
      schema: "thorium-route-receipt/v1",
      requestHash,
      selectedQuoteHash: quoteHash,
      receiptHash,
      selectedProvider: selected?.provider ?? null,
      selectedQuoteId: selected?.quoteId ?? null,
      riskLimits,
      status
    },
    execution: {
      allowed: false,
      mode: "plan_only",
      reason:
        "PAD-1 discovers and selects routes but does not sign wallets or broadcast transactions."
    }
  };
}
