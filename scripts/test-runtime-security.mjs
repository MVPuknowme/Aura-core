import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validatePayload, verifySignature } from "../api/runtime-hardened.mjs";

const secret = "test-secret-not-for-production";
const timestamp = String(Date.now());
const nonce = "test_nonce_1234567890";
const rawBody = JSON.stringify({ source: "diagnostic", type: "system-health" });
const signature = createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");

assert.deepEqual(
  verifySignature({ secret, timestamp, nonce, signature, rawBody }),
  { ok: true },
  "valid HMAC signature should pass"
);

assert.equal(
  verifySignature({ secret, timestamp, nonce: "another_nonce_12345", signature: "0".repeat(64), rawBody }).ok,
  false,
  "invalid HMAC signature should fail"
);

assert.equal(
  verifySignature({ secret: "", timestamp, nonce: "third_nonce_1234567", signature, rawBody }).reason,
  "ingest_auth_not_configured",
  "missing production secret must fail closed"
);

assert.deepEqual(
  validatePayload("/api/agent/signals", { source: "probe", type: "health", latencyMs: 42 }),
  { ok: true }
);
assert.equal(validatePayload("/api/agent/signals", { type: "health" }).reason, "source_required");
assert.equal(validatePayload("/api/skygrid/intake", { source: "probe" }).reason, "event_type_required");
assert.equal(validatePayload("/api/build-pad/quote", { hardware_usd: -1 }).ok, false);
assert.equal(validatePayload("/api/build-pad/quote", { hardware_usd: 1200 }).ok, true);
assert.equal(validatePayload("/api/agent/signals", { source: "x", type: "y", note: "a".repeat(4097) }).reason, "string_length_exceeded");

console.log("SKYGRID runtime security tests passed");
