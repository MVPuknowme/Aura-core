const USER_AUTHORIZED_PURPOSES = new Set([
  "authorized-security-disclosure",
  "user-requested-export",
]);

const AUDIT_EVENTS = new Set(["evidence.review", "export.allowed", "export.denied"]);
const AUDIT_STATUSES = new Set(["ok", "denied", "error"]);

export function safeAudit(event, metadata = {}, now = new Date()) {
  return Object.freeze({
    event: AUDIT_EVENTS.has(event) ? event : "unknown",
    timestamp: now.toISOString(),
    recordCount: Number.isSafeInteger(metadata?.recordCount) && metadata.recordCount >= 0
      ? metadata.recordCount : null,
    status: AUDIT_STATUSES.has(metadata?.status) ? metadata.status : "unknown",
  });
}

export function mayExport(request = {}) {
  if (!request || typeof request !== "object" || Array.isArray(request)) return false;
  const {
  operatorApproved = false,
  purpose = "",
  destination = "",
  legalRequirementVerified = false,
  recipientVerified = false,
  scopeMinimized = false,
  } = request;
  if (typeof destination !== "string" || destination.trim().length === 0 ||
      /[\u0000-\u001f\u007f]/u.test(destination)) return false;
  if (recipientVerified !== true || scopeMinimized !== true) return false;

  if (purpose === "required-legal-response") {
    return legalRequirementVerified === true && recipientVerified === true &&
      scopeMinimized === true;
  }

  return operatorApproved === true && USER_AUTHORIZED_PURPOSES.has(purpose);
}

export function exportPrivacyReceipt(request = {}, now = new Date()) {
  const allowed = mayExport(request);
  return Object.freeze({
    schema: "pnpk.private-export-preflight.v1",
    observed_at: now.toISOString(),
    decision: allowed ? "export_preflight_verified" : "fail_closed",
    enforcement_scope: "instrumented_boundary_only",
    monitoring_status: "unknown",
    content_capture: false,
    execution_authority: "none",
    // Verification signals are trusted-caller attestations, never surveillance claims.
    recipient_verified: request?.recipientVerified === true,
    scope_minimized: request?.scopeMinimized === true,
  });
}

export function redactSensitive(value) {
  // Do not preserve fragments, object keys, lengths, or value shape.
  return "[REDACTED]";
}
