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

export function mayExport({
  operatorApproved = false,
  purpose = "",
  destination = "",
  legalRequirementVerified = false,
  recipientVerified = false,
  scopeMinimized = false,
} = {}) {
  if (typeof destination !== "string" || destination.trim().length === 0 ||
      /[\u0000-\u001f\u007f]/u.test(destination)) return false;

  if (purpose === "required-legal-response") {
    return legalRequirementVerified === true && recipientVerified === true &&
      scopeMinimized === true;
  }

  return operatorApproved === true && USER_AUTHORIZED_PURPOSES.has(purpose);
}

export function redactSensitive(value) {
  // Do not preserve fragments, object keys, lengths, or value shape.
  return "[REDACTED]";
}
