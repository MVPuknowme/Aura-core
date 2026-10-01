import { createHash } from "node:crypto";

export const THORIUM_POLICY_VERSION = "thorium-pad1-v1";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function hashCanonical(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function integerString(value, field) {
  const normalized = String(value ?? "").trim();
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    throw new Error(`${field}_invalid`);
  }
  return normalized;
}

function normalizeChainId(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new Error("chain_id_invalid");
  }
  return n;
}

function normalizeAddress(address) {
  const value = text(address);
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error("token_address_invalid");
  }
  return value.toLowerCase();
}

export function normalizeThoriumAsset(asset = {}) {
  const chainId = normalizeChainId(asset.chainId);
  const native = asset.native === true;
  const symbol = text(asset.symbol);

  if (!symbol) throw new Error("asset_symbol_required");

  if (native) {
    return {
      chainId,
      kind: "native",
      symbol,
      address: null,
      decimals: Number.isInteger(asset.decimals) ? asset.decimals : 18
    };
  }

  const decimals = Number(asset.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new Error("asset_decimals_invalid");
  }

  return {
    chainId,
    kind: "token",
    symbol,
    address: normalizeAddress(asset.address),
    decimals
  };
}

export function thoriumAssetId(asset) {
  const normalized = normalizeThoriumAsset(asset);
  return normalized.kind === "native"
    ? `${normalized.chainId}:native:${normalized.symbol.toUpperCase()}`
    : `${normalized.chainId}:erc20:${normalized.address}`;
}

function sameAsset(a, b) {
  return thoriumAssetId(a) === thoriumAssetId(b);
}

function parseTime(value, field) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`${field}_invalid`);
  return ms;
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

  const amountIn = integerString(quote.amountInBaseUnits, "quote_amount_in");
  if (amountIn !== request.amountInBaseUnits) {
    throw new Error("quote_amount_in_mismatch");
  }

  const amountOut = BigInt(
    integerString(quote.amountOutBaseUnits, "quote_amount_out")
  );
  const outputFee = BigInt(
    integerString(quote.outputFeeBaseUnits ?? "0", "quote_output_fee")
  );

  if (outputFee > amountOut) throw new Error("quote_output_fee_exceeds_output");

  const expiresAtMs = parseTime(quote.expiresAt, "quote_expires_at");
  const stale = expiresAtMs <= nowMs;
  const slippageBps = Number(quote.slippageBps ?? 0);
  const priceImpactBps = Number(quote.priceImpactBps ?? 0);

  if (!Number.isFinite(slippageBps) || slippageBps < 0) {
    throw new Error("quote_slippage_invalid");
  }
  if (!Number.isFinite(priceImpactBps) || priceImpactBps < 0) {
    throw new Error("quote_price_impact_invalid");
  }

  return {
    provider,
    quoteId,
    routeId: text(quote.routeId) || quoteId,
    sourceUrl: text(quote.sourceUrl) || null,
    inputAsset: normalizeThoriumAsset(quote.inputAsset),
    outputAsset: normalizeThoriumAsset(quote.outputAsset),
    amountInBaseUnits: amountIn,
    amountOutBaseUnits: amountOut.toString(),
    outputFeeBaseUnits: outputFee.toString(),
    effectiveOutputBaseUnits: (amountOut - outputFee).toString(),
    gasCostUsd: Number.isFinite(Number(quote.gasCostUsd))
      ? Number(quote.gasCostUsd)
      : null,
    slippageBps,
    priceImpactBps,
    expiresAt: new Date(expiresAtMs).toISOString(),
    stale,
    requiresApproval: quote.requiresApproval === true,
    bridge: quote.bridge ? String(quote.bridge) : null,
    metadata: quote.metadata ?? null
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

  const normalizedRequest = {
    requestId: text(request.requestId),
    operator: text(request.operator),
    inputAsset: normalizeThoriumAsset(request.inputAsset),
    outputAsset: normalizeThoriumAsset(request.outputAsset),
    amountInBaseUnits: integerString(
      request.amountInBaseUnits,
      "request_amount_in"
    ),
    recipient: text(request.recipient) || null
  };

  if (!normalizedRequest.requestId || !normalizedRequest.operator) {
    throw new Error("thorium_request_identity_required");
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
      if (normalized.slippageBps > maxSlippageBps) {
        reasons.push("slippage_above_limit");
      }
      if (normalized.priceImpactBps > maxPriceImpactBps) {
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

  return {
    system: "Thorium",
    pad: "PAD-1",
    policyVersion: THORIUM_POLICY_VERSION,
    assetUniverse: {
      mode: "provider_discovered",
      staticTokenAllowlist: false,
      tokenCountLimit: null,
      note:
        "Any asset may be evaluated when it has a valid chain identifier and provider quote; execution still depends on wallet, liquidity, network, and venue constraints."
    },
    request: normalizedRequest,
    requestHash,
    candidates: accepted,
    rejected,
    selected,
    receipt: {
      schema: "thorium-route-receipt/v1",
      requestHash,
      selectedQuoteHash: quoteHash,
      selectedProvider: selected?.provider ?? null,
      selectedQuoteId: selected?.quoteId ?? null,
      status: selected ? "ROUTE_SELECTED" : "NO_VALID_ROUTE"
    },
    execution: {
      allowed: false,
      mode: "plan_only",
      reason:
        "PAD-1 discovers and selects routes but does not sign wallets or broadcast transactions."
    }
  };
}
