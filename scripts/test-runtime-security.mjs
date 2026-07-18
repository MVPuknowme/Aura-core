import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Readable } from "node:stream";

import handler, {
  resetSecurityStateForTests,
  signProofForTests,
  validatePayload,
  verifySignature
} from "../api/runtime.mjs";

function makeRequest({
  method = "GET",
  url = "/",
  headers = {},
  body = "",
  remoteAddress = "127.0.0.1"
} = {}) {
  const request = Readable.from(body ? [Buffer.from(body)] : []);
  request.method = method;
  request.url = url;
  request.headers = { host: "localhost", ...headers };
  request.socket = { remoteAddress };
  return request;
}

function makeResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: "",
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), String(value));
    },
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    end(body = "") {
      this.body = String(body);
      this.ended = true;
    }
  };
}

async function invoke(options) {
  const request = makeRequest(options);
  const response = makeResponse();
  await handler(request, response);
  return {
    status: response.statusCode,
    headers: response,
    payload: response.body ? JSON.parse(response.body) : null
  };
}

function signedHeaders(secret, rawBody, nonce) {
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${rawBody}`)
    .digest("hex");
  return {
    "content-type": "application/json",
    "x-skygrid-timestamp": timestamp,
    "x-skygrid-nonce": nonce,
    "x-skygrid-signature": signature
  };
}

const previousEnvironment = {
  ingest: process.env.SKYGRID_INGEST_SECRET,
  proof: process.env.SKYGRID_PROOF_SECRET,
  proofJson: process.env.SKYGRID_AUTODRILL_PROOF_JSON
};

try {
  resetSecurityStateForTests();

  const secret = "test-secret-not-for-production";
  const timestamp = String(Date.now());
  const nonce = "unit_nonce_1234567890";
  const rawBody = JSON.stringify({ source: "diagnostic", type: "system-health" });
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${rawBody}`)
    .digest("hex");

  assert.deepEqual(
    verifySignature({ secret, timestamp, nonce, signature, rawBody }),
    { ok: true },
    "valid HMAC signature should pass"
  );
  assert.equal(
    verifySignature({
      secret,
      timestamp,
      nonce: "invalid_nonce_1234567",
      signature: "0".repeat(64),
      rawBody
    }).reason,
    "invalid_signature"
  );
  assert.equal(
    verifySignature({
      secret: "",
      timestamp,
      nonce: "missing_secret_12345",
      signature,
      rawBody
    }).reason,
    "ingest_auth_not_configured"
  );

  assert.deepEqual(
    validatePayload("/api/agent/signals", {
      source: "probe",
      type: "health",
      latencyMs: 42
    }),
    { ok: true }
  );
  assert.equal(
    validatePayload("/api/agent/signals", { type: "health" }).reason,
    "source_required"
  );
  assert.equal(
    validatePayload("/api/skygrid/intake", { source: "probe" }).reason,
    "event_type_required"
  );
  assert.equal(
    validatePayload("/api/skygrid/intake", { route_type: "emergency" }).ok,
    true
  );
  assert.equal(
    validatePayload("/api/build-pad/quote", { hardware_usd: -1 }).ok,
    false
  );
  assert.equal(
    validatePayload("/api/build-pad/quote", { hardware_usd: 1200 }).ok,
    true
  );
  assert.equal(
    validatePayload("/api/agent/signals", {
      source: "x",
      type: "y",
      note: "a".repeat(4097)
    }).reason,
    "string_length_exceeded"
  );
  assert.equal(
    validatePayload("/api/agent/signals", JSON.parse('{"source":"x","type":"y","__proto__":{}}')).reason,
    "unsafe_object_key"
  );

  const wrongContentType = await invoke({
    method: "POST",
    url: "/api/build-pad/quote",
    headers: { "content-type": "text/plain" },
    body: "{}",
    remoteAddress: "127.0.0.2"
  });
  assert.equal(wrongContentType.status, 415);
  assert.equal(wrongContentType.payload.error, "application_json_required");

  const invalidJson = await invoke({
    method: "POST",
    url: "/api/build-pad/quote",
    headers: { "content-type": "application/json" },
    body: "{",
    remoteAddress: "127.0.0.3"
  });
  assert.equal(invalidJson.status, 400);
  assert.equal(invalidJson.payload.error, "invalid_json");

  const oversized = await invoke({
    method: "POST",
    url: "/api/build-pad/quote",
    headers: {
      "content-type": "application/json",
      "content-length": String(64 * 1024 + 1)
    },
    body: "{}",
    remoteAddress: "127.0.0.4"
  });
  assert.equal(oversized.status, 413);
  assert.equal(oversized.payload.error, "payload_too_large");

  delete process.env.SKYGRID_INGEST_SECRET;
  const missingAuthConfiguration = await invoke({
    method: "POST",
    url: "/api/agent/signals",
    headers: { "content-type": "application/json" },
    body: rawBody,
    remoteAddress: "127.0.0.5"
  });
  assert.equal(missingAuthConfiguration.status, 503);
  assert.equal(
    missingAuthConfiguration.payload.error,
    "ingest_auth_not_configured"
  );

  resetSecurityStateForTests();
  process.env.SKYGRID_INGEST_SECRET = secret;
  const integrationNonce = "integration_nonce_12345";
  const first = await invoke({
    method: "POST",
    url: "/api/agent/signals",
    headers: signedHeaders(secret, rawBody, integrationNonce),
    body: rawBody,
    remoteAddress: "127.0.0.6"
  });
  assert.notEqual(first.status, 401);
  assert.notEqual(first.status, 503);
  assert.equal(first.headers.getHeader("x-skygrid-security"), "fail-closed-v1");
  assert.equal(first.payload.event.payload, undefined);
  assert.equal(first.payload.event.payload_receipt.redacted_from_response, true);
  assert.match(first.payload.event.payload_receipt.sha256, /^[a-f0-9]{64}$/);

  const replay = await invoke({
    method: "POST",
    url: "/api/agent/signals",
    headers: signedHeaders(secret, rawBody, integrationNonce),
    body: rawBody,
    remoteAddress: "127.0.0.6"
  });
  assert.equal(replay.status, 409);
  assert.equal(replay.payload.error, "replayed_nonce");

  delete process.env.SKYGRID_INGEST_SECRET;
  const health = await invoke({
    method: "GET",
    url: "/api/health",
    remoteAddress: "127.0.0.7"
  });
  assert.equal(health.status, 200);
  assert.equal(health.payload.status, "degraded");
  assert.equal(health.payload.readiness.process_healthy, true);
  assert.equal(health.payload.readiness.authentication_ready, false);
  assert.equal(health.payload.readiness.overall_ready, false);

  resetSecurityStateForTests();
  const proofSecret = "proof-secret-not-for-production";
  const proof = {
    run_id: "test-run-1",
    generated_at: new Date().toISOString(),
    ok: true,
    checks: [
      { name: "health", ok: true },
      { name: "intake", ok: true }
    ]
  };
  proof.signature = signProofForTests(proof, proofSecret);
  process.env.SKYGRID_PROOF_SECRET = proofSecret;
  process.env.SKYGRID_AUTODRILL_PROOF_JSON = JSON.stringify(proof);

  const verifiedProof = await invoke({
    method: "GET",
    url: "/api/autodrill/latest",
    remoteAddress: "127.0.0.8"
  });
  assert.equal(verifiedProof.status, 200);
  assert.equal(verifiedProof.payload.verified, true);

  const tampered = {
    ...proof,
    checks: [...proof.checks, { name: "tampered", ok: true }]
  };
  process.env.SKYGRID_AUTODRILL_PROOF_JSON = JSON.stringify(tampered);
  const invalidProof = await invoke({
    method: "GET",
    url: "/api/autodrill/latest",
    remoteAddress: "127.0.0.9"
  });
  assert.equal(invalidProof.status, 503);
  assert.equal(invalidProof.payload.verified, false);
  assert.equal(invalidProof.payload.error, "invalid_proof_signature");

  console.log("SKYGRID runtime security tests passed");
} finally {
  resetSecurityStateForTests();
  if (previousEnvironment.ingest === undefined) delete process.env.SKYGRID_INGEST_SECRET;
  else process.env.SKYGRID_INGEST_SECRET = previousEnvironment.ingest;
  if (previousEnvironment.proof === undefined) delete process.env.SKYGRID_PROOF_SECRET;
  else process.env.SKYGRID_PROOF_SECRET = previousEnvironment.proof;
  if (previousEnvironment.proofJson === undefined) {
    delete process.env.SKYGRID_AUTODRILL_PROOF_JSON;
  } else {
    process.env.SKYGRID_AUTODRILL_PROOF_JSON = previousEnvironment.proofJson;
  }
}
