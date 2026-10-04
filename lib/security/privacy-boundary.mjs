const PERMITTED_EXPORT_PURPOSES = new Set([
  "authorized-security-disclosure",
  "user-requested-export",
  "required-legal-response"
]);

export function buildAuditRecord(event, metadata = {}, now = new Date()) {
  return {
    event: String(event || "unknown"),
    timestamp: now.toISOString(),
    recordCount: Number.isFinite(metadata.recordCount) ? metadata.recordCount : null,
    status: typeof metadata.status === "string" ? metadata.status : "ok"
  };
}

export function emitAudit(record, { enabled = false, sink = console.info } = {}) {
  if (!enabled) return false;
  sink(JSON.stringify(record));
  return true;
}

export function mayExport({
  operatorApproved = false,
  purpose,
  destination,
  legalBasis = null
} = {}) {
  if (!operatorApproved) return false;
  if (!PERMITTED_EXPORT_PURPOSES.has(purpose)) return false;
  if (!destination || String(destination).trim() === "") return false;

  if (purpose === "required-legal-response") {
    return Boolean(legalBasis && String(legalBasis).trim());
  }

  return true;
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
