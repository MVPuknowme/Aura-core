import assert from "node:assert/strict";
import {
  generateKeyPairSync,
  sign as signBytes
} from "node:crypto";
import test from "node:test";

import { evaluateProductionRelightPreflight } from "../lib/pnpk-production-relight-preflight.mjs";

const NOW = new Date("2026-10-01T15:30:00.000Z");
const ROUTE_ID = "skygrid:route:west-anchor";

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

function good(overrides = {}) {
  const authority = signer("relight-authority");
  const owner = signer("owner-mvp");
  const operator = signer("emergency-operator");

  const grant = {
    grantId: "grant-001",
    routeId: ROUTE_ID,
    issuedAt: "2026-10-01T15:29:00.000Z",
    expiresAt: "2026-10-01T15:40:00.000Z",
    nonce: "relight:nonce:0001"
  };

  const input = {
    routeId: ROUTE_ID,
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
    },
    trustedSigners: {
      activationGrant: {
        [authority.id]: authority.publicKeyPem
      },
      owner: {
        [owner.id]: owner.publicKeyPem
      },
      emergencyOperator: {
        [operator.id]: operator.publicKeyPem
      }
    },
    ...overrides
  };

  return { input, grant };
}

test("approves only a trusted, exact-bound, unexpired relight grant", () => {
  const { input, grant } = good();
  const out = evaluateProductionRelightPreflight(input, NOW, input.trustedSigners);

  assert.equal(out.decision, "RELIGHT_APPROVED");
  assert.equal(out.failures.length, 0);
  assert.equal(out.authorization.authenticated, true);
  assert.equal(out.authorization.route_id, ROUTE_ID);
  assert.equal(out.authorization.expires_at, grant.expiresAt);
  assert.equal(out.execution.post_receipt_required, true);
});

test("fails closed when the activation grant is bound to another route", () => {
  const { input } = good({ routeId: "skygrid:route:other" });
  const out = evaluateProductionRelightPreflight(input, NOW, input.trustedSigners);

  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("activation_grant_route_mismatch"));
});

test("fails closed when the activation grant is expired or exceeds 15 minutes", () => {
  const expired = good();
  expired.input.activationGrant.expiresAt = "2026-10-01T15:29:59.000Z";
  let out = evaluateProductionRelightPreflight(expired.input, NOW, expired.input.trustedSigners);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("activation_grant_expired"));

  const overlong = good();
  overlong.input.activationGrant.issuedAt = "2026-10-01T15:20:00.000Z";
  overlong.input.activationGrant.expiresAt = "2026-10-01T15:40:00.000Z";
  out = evaluateProductionRelightPreflight(overlong.input, NOW, overlong.input.trustedSigners);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("activation_grant_window_exceeded"));
});

test("fails closed when owner approval signature is not authentic", () => {
  const { input } = good();
  input.approvals.owner.signature = Buffer.from("tampered").toString("base64");

  const out = evaluateProductionRelightPreflight(input, NOW, input.trustedSigners);
  assert.equal(out.decision, "FAIL_CLOSED");
  assert.ok(out.failures.includes("owner_approval_signature_invalid"));
});

test("never grants third-party mutation or autonomous route creation", () => {
  const { input } = good();
  const out = evaluateProductionRelightPreflight(input, NOW, input.trustedSigners);

  assert.equal(out.scope.third_party_network_mutation_allowed, false);
  assert.equal(out.execution.autonomous_route_creation_allowed, false);
  assert.equal(out.execution.payment_execution_allowed, false);
  assert.equal(out.execution.wallet_signing_allowed, false);
  assert.equal(out.execution.transaction_broadcast_allowed, false);
});
