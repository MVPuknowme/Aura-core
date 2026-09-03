import { createHash } from "node:crypto";
import path from "node:path";

export const PREFLIGHT_SCHEMA = "aura.deploy.intent.v1";

const ALLOWED_INTENT_FIELDS = new Set([
  "schema",
  "action",
  "surface",
  "transport",
  "files"
]);

const ALLOWED_FILE_FIELDS = new Set(["path", "content"]);
const ALLOWED_ACTIONS = new Set(["verify", "prepare"]);
const ALLOWED_SURFACES = new Set(["codemirror"]);
const ALLOWED_TRANSPORTS = new Set(["t.me", "none"]);

const ALLOWED_PATH_PREFIXES = Object.freeze([
  "apps/codemirror-console/",
  "api/codemirror/",
  "scripts/skygrid-codemirror-",
  "tests/"
]);

const PROTECTED_PATH_PREFIXES = Object.freeze([
  ".git/",
  ".github/",
  ".vercel/",
  "node_modules/"
]);

const MAX_FILES = 50;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_TOTAL_BYTES = 1024 * 1024;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function failClosed(reason, status = 400, details = {}) {
  return {
    ok: false,
    status,
    receipt: {
      receipt_type: "aura_codemirror_preflight",
      receipt_version: "1.0.0",
      schema: PREFLIGHT_SCHEMA,
      mode: "controlled_pilot",
      sentinel: "fail_closed",
      decision: "fail_closed",
      reason,
      execution_allowed: false,
      deployment_authorized: false,
      transport_publish_allowed: false,
      ...details
    }
  };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function unsupportedField(record, allowlist) {
  return Object.keys(record).find((field) => !allowlist.has(field));
}

function normalizeCandidatePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0")) {
    return { ok: false };
  }

  const slashPath = value.replaceAll("\\", "/");
  if (slashPath.startsWith("/") || /^[A-Za-z]:\//.test(slashPath)) {
    return { ok: false };
  }

  const normalized = path.posix.normalize(slashPath);
  if (
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return { ok: false };
  }

  const lower = normalized.toLowerCase();
  if (
    lower === ".env" ||
    lower.startsWith(".env.") ||
    lower.includes("/.env") ||
    PROTECTED_PATH_PREFIXES.some((prefix) => lower.startsWith(prefix))
  ) {
    return { ok: false };
  }

  return { ok: true, path: normalized };
}

function pathIsAllowlisted(candidatePath) {
  return ALLOWED_PATH_PREFIXES.some((prefix) => candidatePath.startsWith(prefix));
}

function validateFiles(files) {
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
    return failClosed("candidate_files_invalid");
  }

  const normalized = [];
  const seen = new Set();
  let totalBytes = 0;

  for (const file of files) {
    if (!isRecord(file)) return failClosed("candidate_file_invalid");

    const extraField = unsupportedField(file, ALLOWED_FILE_FIELDS);
    if (extraField) {
      return failClosed("unsupported_file_field", 400, { field: extraField });
    }

    const normalizedPath = normalizeCandidatePath(file.path);
    if (!normalizedPath.ok) return failClosed("candidate_path_not_allowed");
    if (!pathIsAllowlisted(normalizedPath.path)) {
      return failClosed("candidate_path_not_allowlisted", 403);
    }
    if (seen.has(normalizedPath.path)) return failClosed("duplicate_candidate_path");
    if (typeof file.content !== "string") return failClosed("candidate_content_invalid");

    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes > MAX_FILE_BYTES) return failClosed("candidate_file_too_large", 413);
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) return failClosed("candidate_too_large", 413);

    seen.add(normalizedPath.path);
    normalized.push({
      path: normalizedPath.path,
      content_sha256: `sha256:${sha256(file.content)}`,
      bytes
    });
  }

  normalized.sort((a, b) => a.path.localeCompare(b.path));
  return { ok: true, files: normalized };
}

export function evaluateCodeMirrorPreflight(intent, { now = () => new Date().toISOString() } = {}) {
  if (!isRecord(intent)) return failClosed("intent_invalid");

  const extraField = unsupportedField(intent, ALLOWED_INTENT_FIELDS);
  if (extraField) {
    return failClosed("unsupported_intent_field", 400, { field: extraField });
  }

  if (intent.schema !== PREFLIGHT_SCHEMA) return failClosed("intent_schema_invalid");
  if (!ALLOWED_ACTIONS.has(intent.action)) {
    return failClosed("preflight_action_not_allowed", 403);
  }
  if (!ALLOWED_SURFACES.has(intent.surface)) return failClosed("surface_not_allowed", 403);
  if (!ALLOWED_TRANSPORTS.has(intent.transport)) return failClosed("transport_not_allowed", 403);

  const fileResult = validateFiles(intent.files);
  if (!fileResult.ok) return fileResult;

  const canonical = JSON.stringify({
    schema: PREFLIGHT_SCHEMA,
    surface: intent.surface,
    transport: intent.transport,
    files: fileResult.files
  });
  const candidateHash = sha256(canonical);
  const checkedAt = now();

  const candidate = {
    candidate_id: `cand_${candidateHash.slice(0, 16)}`,
    candidate_sha256: `sha256:${candidateHash}`,
    schema: PREFLIGHT_SCHEMA,
    action: intent.action,
    surface: intent.surface,
    transport: intent.transport,
    files: fileResult.files
  };

  return {
    ok: true,
    status: 200,
    candidate,
    receipt: {
      receipt_type: "aura_codemirror_preflight",
      receipt_version: "1.0.0",
      schema: PREFLIGHT_SCHEMA,
      mode: "controlled_pilot",
      sentinel: "fail_closed",
      decision: "preflight_verified",
      checked_at: checkedAt,
      action: intent.action,
      surface: intent.surface,
      transport: intent.transport,
      candidate_id: candidate.candidate_id,
      candidate_sha256: candidate.candidate_sha256,
      files_count: candidate.files.length,
      execution_allowed: false,
      deployment_authorized: false,
      transport_publish_allowed: false
    }
  };
}
