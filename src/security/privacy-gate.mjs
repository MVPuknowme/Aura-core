const USER_AUTHORIZED_PURPOSES = new Set([
  "authorized-security-disclosure",
  "user-requested-export",
]);

export function safeAudit(event, metadata = {}, now = new Date()) {
  return Object.freeze({
    event: String(event || "unknown"),
    timestamp: now.toISOString(),
    recordCount: Number.isFinite(metadata.recordCount) ? metadata.recordCount : null,
    status: typeof metadata.status === "string" ? metadata.status : "ok",
  });
}

export function mayExport({
  operatorApproved = false,
  purpose = "",
  destination = "",
  legalRequirementVerified = false,
} = {}) {
  if (!destination) return false;

  if (purpose === "required-legal-response") {
    return legalRequirementVerified === true;
  }

  return operatorApproved === true && USER_AUTHORIZED_PURPOSES.has(purpose);
}

export function redactSensitive(value) {
  if (value == null) return value;

  if (typeof value === "string") {
    if (value.length <= 4) return "[REDACTED]";
    return `${value.slice(0, 2)}…${value.slice(-2)}`;
  }

  if (Array.isArray(value)) {
    return value.map(() => "[REDACTED]");
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).map((key) => [key, "[REDACTED]"])
    );
  }

  return "[REDACTED]";
}
