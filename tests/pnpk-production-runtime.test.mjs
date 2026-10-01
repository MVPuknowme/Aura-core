import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign as signBytes
} from "node:crypto";
import test from "node:test";

import handler from "../api/runtime-core.mjs";

function request(method, path, body = {}) {
  const raw = JSON.stringify(body);
  return {
    method,
    url: path,
    headers: {
      host: "127.0.0.1:3000",
      "content-type": "application/json"
    },
    async *[Symbol.asyncIterator]() {
      if (method !== "GET") yield Buffer.from(raw);
    }
  };
}

function response() {
  let body = "";
  return {
    statusCode: 200,
    setHeader() {},
    end(chunk = "") { body += String(chunk); },
    json() { return JSON.parse(body); }
  };
}

async function invoke(method, path, body = {}) {
  const res = response();
  await handler(request(method, path, body), res);
  return { status: res.statusCode, body: res.json() };
}

function signer(id) {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    id,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }),
    privateKey
  };
}

function canonicalGrant(grant) {
  return JSON.stringify({
    schema: "pnpk.production-network-relight-grant.v1",
    grant_id: grant.grantId,
    route_id: grant.routeId,
    issued_at: grant.issuedAt,
    expires_at: grant.expiresAt,
    nonce: grant.nonce
  });
}

function signature(privateKey, grant) {
  return signBytes(
    null,
    Buffer.from(canonicalGrant(grant)),
    privateKey
  ).toString("base64");
}

test("production relight preflight endpoint authenticates trusted signed evidence", async () => {
  const authority = signer("relight-authority");
  const owner = signer("owner-mvp");
  const operator = signer("emergency-operator");
  const grant = {
    grantId: "grant-runtime-001",
    routeId: "skygrid:route:west-anchor",
    issuedAt: new Date(Date.now() - 60_000).toISOString(),
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    nonce: "relight:runtime:0001"
  };

  process.env.PNPK_RELIGHT_TRUSTED_SIGNERS_JSON = JSON.stringify({
    activationGrant: { [authority.id]: authority.publicKeyPem },
    owner: { [owner.id]: owner.publicKeyPem },
    emergencyOperator: { [operator.id]: operator.publicKeyPem }
  });

  const result = await invoke(
    "POST",
    "/api/skygrid/network-relight/preflight",
    {
      routeId: grant.routeId,
      activationGrantId: grant.grantId,
      ownedRoute: true,
      previouslyAuthorized: true,
      degradedOrDown: true,
      pnpkPassed: true,
      healthQuorum: true,
      rollbackProof: true,
      preReceiptWritten: true,
      activationGrant: {
        ...grant,
        signerId: authority.id,
        signature: signature(authority.privateKey, grant)
      },
      approvals: {
        owner: {
          signerId: owner.id,
          signature: signature(owner.privateKey, grant)
        },
        emergencyOperator: {
          signerId: operator.id,
          signature: signature(operator.privateKey, grant)
        }
      }
    }
  );

  delete process.env.PNPK_RELIGHT_TRUSTED_SIGNERS_JSON;

  assert.equal(result.status, 202);
  assert.equal(result.body.decision, "RELIGHT_APPROVED");
  assert.equal(result.body.authorization.authenticated, true);
});

test("production relight execution endpoint fails closed when executor is not configured", async () => {
  delete process.env.SKYGRID_RELIGHT_EXECUTOR_ENABLED;
  delete process.env.SKYGRID_RELIGHT_EXECUTOR_URL;
  delete process.env.SKYGRID_RELIGHT_HEALTH_URL;

  const result = await invoke(
    "POST",
    "/api/skygrid/network-relight/execute",
    {
      routeId: "skygrid:route:west-anchor",
      preflight: {
        decision: "RELIGHT_APPROVED",
        route_id: "skygrid:route:west-anchor",
        activation_grant_id: "grant-runtime-001",
        receipt_hash: "sha256:test",
        authorization: {
          authenticated: true,
          route_id: "skygrid:route:west-anchor",
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString()
        }
      }
    }
  );

  assert.equal(result.status, 503);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.reason, "relight_executor_not_configured");
  assert.equal(result.body.sentinel, "fail_closed");
});

test("failover status reports scoped relight readiness separately from global failover", async () => {
  const result = await invoke("GET", "/api/failover/status");

  assert.equal(result.status, 200);
  assert.equal(result.body.failover_state, "blocked");
  assert.equal(result.body.network_relight.preflight_route_live, true);
  assert.equal(result.body.network_relight.global_failover_enabled, false);
});
