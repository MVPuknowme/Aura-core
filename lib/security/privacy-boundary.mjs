import { safeAudit, mayExport as privacyMayExport } from "../../src/security/privacy-gate.mjs";

export function buildAuditRecord(event, metadata = {}, now = new Date()) {
  return safeAudit(event === "evidence_review" ? "evidence.review" : event, metadata, now);
}

export function emitAudit(record, { enabled = false, sink = console.info } = {}) {
  if (!enabled) return false;
  sink(JSON.stringify(buildAuditRecord(record?.event, record)));
  return true;
}

export function mayExport({
  operatorApproved = false,
  purpose,
  destination,
  legalBasis = null,
  legalRequirementVerified = false,
  recipientVerified = false,
  scopeMinimized = false
} = {}) {
  if (operatorApproved !== true) return false;

  if (purpose === "required-legal-response") {
    if (typeof legalBasis !== "string" || !legalBasis.trim()) return false;
  }

  return privacyMayExport({ operatorApproved, purpose, destination,
    legalRequirementVerified, recipientVerified, scopeMinimized });
}

export function privacyDefaults() {
  return Object.freeze({
    default: "private",
    telemetry: "disabled",
    sensitiveStdout: "disabled",
    externalExport: "explicit-only",
    publicSharing: "disabled",
    rawEvidenceMutation: "prohibited"
  });
}
