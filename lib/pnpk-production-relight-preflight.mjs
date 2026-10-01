import {
  createHash,
  createPublicKey,
  verify as verifyBytes
} from "node:crypto";

const MAX_WINDOW_MS = 15 * 60 * 1000;

function text(value, field) {
  const out = String(value ?? "").trim();
  if (!out) throw new Error(`${field}_required`);
  return out;
}

function bool(value, field) {
  if (value !== true && value !== false) throw new Error(`${field}_invalid`);
  return value;
}

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function grantPayload(grant) {
  return JSON.stringify({
    schema: "pnpk.production-network-relight-grant.v1",
    grant_id: grant.grantId,
    route_id: grant.routeId,
    issued_at: grant.issuedAt,
    expires_at: grant.expiresAt,
    nonce: grant.nonce
  });
}

function signatureValid({ signerId, signature }, trusted, grant) {
  try {
    const pem = trusted?.[signerId];
    if (!pem || !signature) return false;
    return verifyBytes(
      null,
      Buffer.from(grantPayload(grant)),
      createPublicKey(pem),
      Buffer.from(signature, "base64")
    );
  } catch {
    return false;
  }
}

export function evaluateProductionRelightPreflight(
  input = {},
  now = new Date(),
  trustedSigners = {}
) {
  const routeId = text(input.routeId, "route_id");
  const grant = input.activationGrant && typeof input.activationGrant === "object"
    ? input.activationGrant
    : {};
  const grantId = text(
    input.activationGrantId ?? grant.grantId,
    "activation_grant_id"
  );

  const failures = [];
  const checks = {
    owned_route: bool(input.ownedRoute, "owned_route"),
    previously_authorized: bool(
      input.previouslyAuthorized,
      "previously_authorized"
    ),
    degraded_or_down: bool(input.degradedOrDown, "degraded_or_down"),
    pnpk_passed: bool(input.pnpkPassed, "pnpk_passed"),
    health_quorum: bool(input.healthQuorum, "health_quorum"),
    rollback_proof: bool(input.rollbackProof, "rollback_proof"),
    pre_receipt_written: bool(
      input.preReceiptWritten,
      "pre_receipt_written"
    )
  };

  for (const [name, passed] of Object.entries(checks)) {
    if (!passed) failures.push(name);
  }

  if (grant.grantId !== grantId) {
    failures.push("activation_grant_id_mismatch");
  }
  if (grant.routeId !== routeId) {
    failures.push("activation_grant_route_mismatch");
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const issuedMs = new Date(grant.issuedAt).getTime();
  const expiresMs = new Date(grant.expiresAt).getTime();

  if (!Number.isFinite(issuedMs)) {
    failures.push("activation_grant_issued_at_invalid");
  }
  if (!Number.isFinite(expiresMs)) {
    failures.push("activation_grant_expires_at_invalid");
  }
  if (Number.isFinite(issuedMs) && issuedMs > nowMs) {
    failures.push("activation_grant_not_yet_valid");
  }
  if (Number.isFinite(expiresMs) && expiresMs <= nowMs) {
    failures.push("activation_grant_expired");
  }
  if (
    Number.isFinite(issuedMs) &&
    Number.isFinite(expiresMs) &&
    expiresMs - issuedMs > MAX_WINDOW_MS
  ) {
    failures.push("activation_grant_window_exceeded");
  }

  if (
    !signatureValid(
      { signerId: grant.signerId, signature: grant.signature },
      trustedSigners.activationGrant,
      grant
    )
  ) {
    failures.push("activation_grant_signature_invalid");
  }

  const ownerApproval = input.approvals?.owner || {};
  if (
    !signatureValid(
      ownerApproval,
      trustedSigners.owner,
      grant
    )
  ) {
    failures.push("owner_approval_signature_invalid");
  }

  const operatorApproval = input.approvals?.emergencyOperator || {};
  if (
    !signatureValid(
      operatorApproval,
      trustedSigners.emergencyOperator,
      grant
    )
  ) {
    failures.push("emergency_operator_approval_signature_invalid");
  }

  const decision = failures.length === 0
    ? "RELIGHT_APPROVED"
    : "FAIL_CLOSED";

  const receipt = {
    schema: "pnpk.production-network-relight-preflight.v1",
    route_id: routeId,
    activation_grant_id: grantId,
    observed_at: new Date(nowMs).toISOString(),
    decision,
    failures,
    checks,
    authorization: {
      authenticated: decision === "RELIGHT_APPROVED",
      route_id: grant.routeId || null,
      grant_id: grant.grantId || null,
      expires_at: grant.expiresAt || null,
      max_activation_window_minutes: 15,
      owner_signer_id: ownerApproval.signerId || null,
      emergency_operator_signer_id: operatorApproval.signerId || null,
      grant_signer_id: grant.signerId || null
    },
    scope: {
      previously_authorized_routes_only: true,
      third_party_network_mutation_allowed: false,
      os_interface_reconfiguration_allowed: false,
      max_activation_window_minutes: 15
    },
    execution: {
      autonomous_route_creation_allowed: false,
      payment_execution_allowed: false,
      wallet_signing_allowed: false,
      transaction_broadcast_allowed: false,
      post_receipt_required: true
    }
  };

  return {
    ...receipt,
    receipt_hash: hash(receipt)
  };
}
