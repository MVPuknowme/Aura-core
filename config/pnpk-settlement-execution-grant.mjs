import { createHash } from "node:crypto";

const DEFAULT_MAX_USD = 25;
const DEFAULT_MAX_TTL_SECONDS = 15 * 60;
const REQUIRED_SCOPE = "allbridge_settlement";
const REQUIRED_BRIDGE = "allbridge_core";
const REQUIRED_PREFLIGHT_DECISION = "ROUTE_APPROVED";

function text(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function parseCsvSet(value, normalize = lower) {
  return new Set(
    text(value)
      .split(",")
      .map((item) => normalize(item))
      .filter(Boolean),
  );
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseChainAllowlist(raw) {
  return parseCsvSet(raw, (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : "";
  });
}

function parseNow(now) {
  const value = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(value)) throw new Error("settlement_execution_now_invalid");
  return value;
}

function assertNonEmpty(value, code) {
  if (!text(value)) throw new Error(code);
  return text(value);
}

function assertNonce(value) {
  const nonce = assertNonEmpty(value, "settlement_execution_nonce_required");
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(nonce)) {
    throw new Error("settlement_execution_nonce_invalid");
  }
  return nonce;
}

function stableGrantHash(payload) {
  const canonical = JSON.stringify({
    profile: payload.profile,
    scope: payload.scope,
    bridge: payload.bridge,
    operator_id: payload.operator_id,
    authorization_id: payload.authorization_id,
    nonce: payload.nonce,
    chain_id: payload.chain_id,
    recipient: payload.recipient,
    asset_id: payload.asset_id,
    amount_atomic: payload.amount_atomic,
    amount_usd: payload.amount_usd,
    destination_fingerprint: payload.destination_fingerprint,
    preflight_receipt_id: payload.preflight_receipt_id,
    preflight_intent_hash: payload.preflight_intent_hash,
    expires_at: payload.expires_at,
  });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function resolvePnpkSettlementExecutionGrant(
  env = {},
  request = {},
  now = new Date(),
) {
  if (lower(env.PNPK_SETTLEMENT_EXECUTION_ENABLED) !== "true") {
    throw new Error("settlement_execution_disabled");
  }

  if (request.humanApproval !== true) {
    throw new Error("settlement_execution_human_approval_required");
  }

  if (text(request.scope) !== REQUIRED_SCOPE) {
    throw new Error("settlement_execution_scope_mismatch");
  }

  if (text(request.bridge) !== REQUIRED_BRIDGE) {
    throw new Error("settlement_execution_bridge_mismatch");
  }

  const operatorId = assertNonEmpty(
    request.operatorId,
    "settlement_execution_operator_id_required",
  );
  const authorizationId = assertNonEmpty(
    request.authorizationId,
    "settlement_execution_authorization_id_required",
  );
  const nonce = assertNonce(request.nonce);

  const usedNonces = new Set(
    Array.isArray(request.usedNonces) ? request.usedNonces.map(text) : [],
  );
  if (usedNonces.has(nonce)) {
    throw new Error("settlement_execution_nonce_reused");
  }

  const chainId = Number(request.chainId);
  const allowedChains = parseChainAllowlist(env.PNPK_SETTLEMENT_CHAIN_ALLOWLIST);
  if (allowedChains.size === 0) {
    throw new Error("settlement_execution_chain_allowlist_empty");
  }
  if (!Number.isInteger(chainId) || !allowedChains.has(String(chainId))) {
    throw new Error("settlement_execution_chain_not_allowed");
  }

  const recipient = lower(request.recipient);
  const allowedRecipients = parseCsvSet(
    env.PNPK_SETTLEMENT_RECIPIENT_ALLOWLIST,
  );
  if (allowedRecipients.size === 0) {
    throw new Error("settlement_execution_recipient_allowlist_empty");
  }
  if (!recipient || !allowedRecipients.has(recipient)) {
    throw new Error("settlement_execution_recipient_not_allowlisted");
  }

  const amountUsd = Number(request.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("settlement_execution_amount_invalid");
  }
  const maxUsd = parsePositiveNumber(
    env.PNPK_SETTLEMENT_MAX_USD,
    DEFAULT_MAX_USD,
  );
  if (amountUsd > maxUsd) {
    throw new Error("settlement_execution_amount_exceeds_cap");
  }

  const amountAtomic = assertNonEmpty(
    request.amountAtomic,
    "settlement_execution_amount_atomic_required",
  );
  if (!/^\d+$/.test(amountAtomic) || BigInt(amountAtomic) <= 0n) {
    throw new Error("settlement_execution_amount_atomic_invalid");
  }

  const assetId = assertNonEmpty(
    request.assetId,
    "settlement_execution_asset_id_required",
  );
  const destinationFingerprint = assertNonEmpty(
    request.destinationFingerprint,
    "settlement_execution_destination_fingerprint_required",
  );

  const nowMs = parseNow(now);
  const expiresMs = new Date(request.expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) {
    throw new Error("settlement_execution_expiry_invalid");
  }
  if (expiresMs <= nowMs) {
    throw new Error("settlement_execution_grant_expired");
  }
  const maxTtlSeconds = Math.min(
    parsePositiveNumber(
      env.PNPK_SETTLEMENT_MAX_TTL_SECONDS,
      DEFAULT_MAX_TTL_SECONDS,
    ),
    DEFAULT_MAX_TTL_SECONDS,
  );
  if (expiresMs - nowMs > maxTtlSeconds * 1000) {
    throw new Error("settlement_execution_expiry_too_long");
  }

  const preflight = request.preflight;
  if (!preflight || typeof preflight !== "object") {
    throw new Error("settlement_execution_preflight_required");
  }
  if (preflight.decision !== REQUIRED_PREFLIGHT_DECISION) {
    throw new Error("settlement_execution_preflight_not_approved");
  }

  const preflightReceiptId = assertNonEmpty(
    preflight.receiptId,
    "settlement_execution_preflight_receipt_required",
  );
  const preflightIntentHash = assertNonEmpty(
    preflight.intentHash,
    "settlement_execution_preflight_intent_hash_required",
  );

  const expectedRouteNetworkId = `eip155:${chainId}`;
  const bindingChecks = [
    [preflight.routeNetworkId, expectedRouteNetworkId, "route_network"],
    [preflight.assetId, assetId, "asset"],
    [String(preflight.amountAtomic ?? ""), amountAtomic, "amount"],
    [lower(preflight.recipient), recipient, "recipient"],
    [
      preflight.destinationFingerprint,
      destinationFingerprint,
      "destination_fingerprint",
    ],
    [preflight.authorizationId, authorizationId, "authorization"],
    [preflight.nonce, nonce, "nonce"],
  ];

  for (const [actual, expected, label] of bindingChecks) {
    if (actual !== expected) {
      throw new Error(`settlement_execution_preflight_${label}_mismatch`);
    }
  }

  const expiresAt = new Date(expiresMs).toISOString();
  const grant = {
    ok: true,
    profile: "settlement-execution-grant",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    scope: REQUIRED_SCOPE,
    bridge: REQUIRED_BRIDGE,
    operator_id: operatorId,
    authorization_id: authorizationId,
    nonce,
    chain_id: chainId,
    route_network_id: expectedRouteNetworkId,
    recipient,
    asset_id: assetId,
    amount_atomic: amountAtomic,
    amount_usd: amountUsd,
    max_usd: maxUsd,
    destination_fingerprint: destinationFingerprint,
    preflight_receipt_id: preflightReceiptId,
    preflight_intent_hash: preflightIntentHash,
    expires_at: expiresAt,
    permissions: {
      bridge_execution_allowed: true,
      wallet_signing_allowed: true,
      transaction_broadcast_allowed: true,
    },
    controls: {
      exact_transaction_binding_required: true,
      signer_handoff_required: true,
      raw_private_key_allowed: false,
      auto_broadcast: false,
      human_approval_present: true,
      post_execution_reference_required: true,
      destination_confirmation_required: true,
    },
  };

  return Object.freeze({
    ...grant,
    grant_hash: stableGrantHash(grant),
  });
}
