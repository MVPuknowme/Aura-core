import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import runtimeHandler from "./runtime.mjs";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const MAX_BODY_BYTES = 64 * 1024;
const AUTH_WINDOW_MS = 5 * 60 * 1000;
const NONCE_TTL_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const PUBLIC_RATE_LIMIT = 30;
const AUTHENTICATED_RATE_LIMIT = 120;

const protectedPosts = new Set([
  "/api/skygrid/intake",
  "/intake",
  "/api/aura-core/decide",
  "/api/agent/signals",
  "/api/node-lease/intake"
]);
const healthPaths = new Set(["/health.json", "/api/skygrid/status", "/api/highway/status"]);
const nonceCache = new Map();
const rateBuckets = new Map();

const nativeFetch = globalThis.fetch;
if (nativeFetch && !globalThis.__skygridFetchTimeoutInstalled) {
  globalThis.fetch = (input, init = {}) => nativeFetch(input, {
    ...init,
    signal: init.signal || AbortSignal.timeout(Number(process.env.SKYGRID_UPSTREAM_TIMEOUT_MS || 8000))
  });
  globalThis.__skygridFetchTimeoutInstalled = true;
}

function pathOf(req) {
  const host = req.headers?.host || "localhost";
  return new URL(req.url || "/", `https://${host}`).pathname;
}

function header(req, name) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : String(value || "");
}

function clientKey(req) {
  return header(req, "x-forwarded-for").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Security", "fail-closed-v1");
  res.end(JSON.stringify(payload, null, 2));
}

function safeEqualHex(actual, expected) {
  if (!/^[a-f0-9]{64}$/i.test(actual) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function cleanupCaches(now = Date.now()) {
  for (const [nonce, expires] of nonceCache) if (expires <= now) nonceCache.delete(nonce);
  for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(key);
}

function consumeRateLimit(key, limit, now = Date.now()) {
  cleanupCaches(now);
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + RATE_WINDOW_MS };
  }
  current.count += 1;
  return { allowed: current.count <= limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt };
}

export function verifySignature({ secret, timestamp, nonce, signature, rawBody, now = Date.now() }) {
  if (!secret) return { ok: false, status: 503, reason: "ingest_auth_not_configured" };
  if (!timestamp || !nonce || !signature) return { ok: false, status: 401, reason: "missing_signature_headers" };
  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(now - timestampMs) > AUTH_WINDOW_MS) {
    return { ok: false, status: 401, reason: "signature_timestamp_outside_window" };
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) return { ok: false, status: 401, reason: "invalid_nonce" };
  cleanupCaches(now);
  if (nonceCache.has(nonce)) return { ok: false, status: 409, reason: "replayed_nonce" };
  const expected = createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");
  if (!safeEqualHex(signature, expected)) return { ok: false, status: 401, reason: "invalid_signature" };
  nonceCache.set(nonce, now + NONCE_TTL_MS);
  return { ok: true };
}

function inspectValue(value, depth = 0, stats = { keys: 0 }) {
  if (depth > 6) throw new Error("payload_depth_exceeded");
  if (typeof value === "string" && value.length > 4096) throw new Error("string_length_exceeded");
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("non_finite_number");
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error("array_length_exceeded");
    for (const item of value) inspectValue(item, depth + 1, stats);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      stats.keys += 1;
      if (stats.keys > 100) throw new Error("key_count_exceeded");
      if (["__proto__", "prototype", "constructor"].includes(key)) throw new Error("unsafe_object_key");
      inspectValue(child, depth + 1, stats);
    }
  }
}

export function validatePayload(path, payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, reason: "json_object_required" };
  try { inspectValue(payload); } catch (error) { return { ok: false, reason: error.message }; }

  if (path === "/api/agent/signals") {
    if (typeof payload.source !== "string" || !payload.source.trim()) return { ok: false, reason: "source_required" };
    if (typeof payload.type !== "string" || !payload.type.trim()) return { ok: false, reason: "type_required" };
  }
  if (["/api/skygrid/intake", "/intake", "/api/aura-core/decide"].includes(path)) {
    const eventType = payload.type || payload.event_type || payload.need;
    if (typeof eventType !== "string" || !eventType.trim()) return { ok: false, reason: "event_type_required" };
  }
  if (path === "/api/build-pad/quote") {
    for (const [key, value] of Object.entries(payload)) {
      if (/(usd|cost|support|hardware|connectivity|energy|reserve)/i.test(key) && (typeof value !== "number" || value < 0 || value > 10_000_000)) {
        return { ok: false, reason: `invalid_numeric_field:${key}` };
      }
    }
  }
  return { ok: true };
}

async function readLimitedBody(req) {
  const declared = Number(header(req, "content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw Object.assign(new Error("payload_too_large"), { status: 413 });
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw Object.assign(new Error("payload_too_large"), { status: 413 });
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function replayRequest(req, rawBody) {
  const stream = Readable.from(rawBody ? [Buffer.from(rawBody)] : []);
  stream.method = req.method;
  stream.url = req.url;
  stream.headers = req.headers;
  stream.socket = req.socket;
  return stream;
}

function sanitizeResponse(payload, path) {
  if (payload?.event?.payload) {
    const raw = JSON.stringify(payload.event.payload);
    payload.event.payload_receipt = {
      sha256: createHash("sha256").update(raw).digest("hex"),
      bytes: Buffer.byteLength(raw),
      stored: false,
      redacted_from_response: true
    };
    delete payload.event.payload;
  }
  if (healthPaths.has(path)) {
    const authConfigured = Boolean(process.env.SKYGRID_INGEST_SECRET);
    const awsConfigured = Boolean(payload?.configured?.awsStatusUrl && payload?.configured?.awsIntakeUrl);
    const awsReachable = payload?.aws?.ok === true;
    payload.security = {
      gateway: "fail-closed-v1",
      authentication_configured: authConfigured,
      body_limit_bytes: MAX_BODY_BYTES,
      replay_protection: true,
      upstream_timeout_ms: Number(process.env.SKYGRID_UPSTREAM_TIMEOUT_MS || 8000)
    };
    payload.readiness = {
      process_healthy: true,
      authentication_ready: authConfigured,
      aws_configured: awsConfigured,
      aws_reachable: awsReachable,
      overall_ready: authConfigured && awsConfigured && awsReachable
    };
    payload.status = payload.readiness.overall_ready ? "ready" : "degraded";
  }
  return payload;
}

function captureResponse(res, path) {
  return new Proxy(res, {
    get(target, property) {
      if (property !== "end") return Reflect.get(target, property, target);
      return (body) => {
        if (typeof body === "string" && String(target.getHeader?.("content-type") || "").includes("application/json")) {
          try {
            const sanitized = sanitizeResponse(JSON.parse(body), path);
            return target.end(JSON.stringify(sanitized, null, 2));
          } catch { /* preserve original body */ }
        }
        return target.end(body);
      };
    },
    set(target, property, value) { return Reflect.set(target, property, value, target); }
  });
}

async function readProof() {
  let proof;
  if (process.env.SKYGRID_AUTODRILL_PROOF_JSON) {
    proof = JSON.parse(process.env.SKYGRID_AUTODRILL_PROOF_JSON);
  } else {
    proof = JSON.parse(await readFile("artifacts/newman/latest-summary.json", "utf8"));
  }
  const required = ["run_id", "generated_at", "ok", "checks", "signature"];
  if (required.some((key) => !(key in proof)) || !Array.isArray(proof.checks)) throw new Error("invalid_proof_shape");
  const secret = process.env.SKYGRID_PROOF_SECRET;
  if (!secret) throw new Error("proof_verification_not_configured");
  const expected = createHmac("sha256", secret).update(`${proof.run_id}.${proof.generated_at}.${proof.ok}`).digest("hex");
  if (!safeEqualHex(proof.signature, expected)) throw new Error("invalid_proof_signature");
  return proof;
}

export default async function hardenedHandler(req, res) {
  const path = pathOf(req);
  const isPost = req.method === "POST";
  const needsAuth = isPost && protectedPosts.has(path);
  const rate = consumeRateLimit(`${clientKey(req)}:${needsAuth ? "auth" : "public"}`, needsAuth ? AUTHENTICATED_RATE_LIMIT : PUBLIC_RATE_LIMIT);
  res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(rate.resetAt / 1000)));
  if (!rate.allowed) return json(res, 429, { ok: false, product: PRODUCT, error: "rate_limit_exceeded" });

  if (req.method === "GET" && path === "/api/autodrill/latest") {
    try {
      const proof = await readProof();
      return json(res, proof.ok ? 200 : 503, { ok: proof.ok, verified: true, product: PRODUCT, route: path, proof });
    } catch (error) {
      return json(res, 503, {
        ok: false,
        verified: false,
        product: PRODUCT,
        route: path,
        error: String(error?.message || error),
        required: "Attach a signed Newman summary at artifacts/newman/latest-summary.json or SKYGRID_AUTODRILL_PROOF_JSON."
      });
    }
  }

  let rawBody = "";
  let safeReq = req;
  if (isPost) {
    if (!header(req, "content-type").toLowerCase().startsWith("application/json")) {
      return json(res, 415, { ok: false, product: PRODUCT, error: "application_json_required" });
    }
    try { rawBody = await readLimitedBody(req); }
    catch (error) { return json(res, error.status || 400, { ok: false, product: PRODUCT, error: error.message }); }

    let payload;
    try { payload = rawBody ? JSON.parse(rawBody) : {}; }
    catch { return json(res, 400, { ok: false, product: PRODUCT, error: "invalid_json" }); }

    const validation = validatePayload(path, payload);
    if (!validation.ok) return json(res, 422, { ok: false, product: PRODUCT, error: validation.reason });

    if (needsAuth) {
      const verification = verifySignature({
        secret: process.env.SKYGRID_INGEST_SECRET,
        timestamp: header(req, "x-skygrid-timestamp"),
        nonce: header(req, "x-skygrid-nonce"),
        signature: header(req, "x-skygrid-signature"),
        rawBody
      });
      if (!verification.ok) return json(res, verification.status, { ok: false, product: PRODUCT, error: verification.reason });
    }
    safeReq = replayRequest(req, rawBody);
  }

  return runtimeHandler(safeReq, captureResponse(res, path));
}
