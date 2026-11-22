import { createHash } from "node:crypto";

// Public discovery metadata only. Never add subscriber, carrier-control, or credentialed APIs.
export const ATT_DISCOVERY_ENDPOINTS = Object.freeze([
  { id: "llms_txt", path: "/llms.txt", type: "text" },
  { id: "agent_card", path: "/.well-known/agent-card.json", type: "json" },
  { id: "mcp_server_card", path: "/.well-known/mcp/server-card.json", type: "json" },
  { id: "agent_skills_index", path: "/.well-known/agent-skills/index.json", type: "json" }
]);
const ORIGIN = "https://www.att.com";
const MAX_BYTES = 262_144;

function sha256(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

async function boundedBytes(response) {
  const declared = response.headers?.get?.("content-length");
  if (declared && /^\d+$/.test(declared) && Number(declared) > MAX_BYTES) {
    throw new Error("body_too_large");
  }
  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw new Error("body_too_large");
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
      if (size > MAX_BYTES) await response.body.cancel?.().catch?.(() => {});
    }
    return Buffer.concat(chunks.map((part) => Buffer.from(part)), size);
  }
  // Supports simple synthetic response mocks. Production fetch uses streaming path above.
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) throw new Error("body_too_large");
  return bytes;
}

function checkFormat(bytes, type) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (type === "json") {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid_document");
    }
  } else if (!text.startsWith("# AT&T")) {
    throw new Error("invalid_document");
  }
}

function failureCode(error) {
  if (error?.message === "body_too_large") return "body_too_large";
  if (error instanceof SyntaxError || error?.message === "invalid_document") return "invalid_document";
  if (error?.name === "TypeError") return "transport_error";
  if (error?.name === "TimeoutError" || error?.name === "AbortError") return "timeout";
  return "fetch_unavailable";
}

/**
 * Collect hashes and HTTP metadata for AT&T's published *public* discovery files.
 * The receipt is deliberately NEVER a carrier authorization or PNPK execution grant.
 */
export async function inspectAttDiscovery({
  fetchImpl = globalThis.fetch,
  observedAt = new Date(),
  timeoutMs = 5000
} = {}) {
  if (typeof fetchImpl !== "function") throw new TypeError("fetchImpl_required");
  if (!(observedAt instanceof Date) || !Number.isFinite(observedAt.getTime())) {
    throw new TypeError("observedAt_invalid");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10000) {
    throw new RangeError("timeoutMs_invalid");
  }
  const results = [];
  for (const endpoint of ATT_DISCOVERY_ENDPOINTS) {
    const url = new URL(endpoint.path, ORIGIN);
    const result = { id: endpoint.id, path: endpoint.path, verified: false };
    try {
      const response = await fetchImpl(url.toString(), {
        method: "GET",
        redirect: "error",
        credentials: "omit",
        headers: { accept: endpoint.type === "json" ? "application/json" : "text/plain" },
        signal: AbortSignal.timeout(timeoutMs)
      });
      result.http_status = Number.isInteger(response.status) ? response.status : null;
      if (response.url && response.url !== url.toString()) {
        result.reason = "redirect_blocked";
      } else if (!response.ok || response.status < 200 || response.status >= 300) {
        result.reason = "http_unavailable";
      } else {
        const contentType = (response.headers?.get?.("content-type") || "").toLowerCase();
        const accepted = endpoint.type === "json"
          ? /^application\/(json|[\w.-]+\+json)(?:\s*;|$)/.test(contentType)
          : /^text\/plain(?:\s*;|$)/.test(contentType);
        if (!accepted) {
          result.reason = "unexpected_content_type";
        } else {
          const bytes = await boundedBytes(response);
          checkFormat(bytes, endpoint.type);
          result.verified = true;
          result.byte_length = bytes.byteLength;
          result.content_hash = sha256(bytes);
        }
      }
    } catch (error) {
      result.reason = failureCode(error);
    }
    results.push(result);
  }
  const receipt = {
    schema: "skygrid.att-public-discovery.v1",
    observed_at: observedAt.toISOString(),
    source: ORIGIN,
    mode: "public_metadata_only",
    decision: results.every((result) => result.verified) ? "DISCOVERY_VERIFIED" : "FAIL_CLOSED",
    results,
    pnpk_preflight: {
      decision: "HOLD_UNAUTHORIZED",
      authorization_receipt_issued: false,
      carrier_data_access_allowed: false,
      production_failover_allowed: false,
      network_switching_allowed: false,
      device_activation_allowed: false,
      private_data_movement_allowed: false,
      wallet_signing_allowed: false,
      transaction_broadcast_allowed: false
    }
  };
  return { ...receipt, receipt_hash: sha256(Buffer.from(JSON.stringify(receipt))) };
}
