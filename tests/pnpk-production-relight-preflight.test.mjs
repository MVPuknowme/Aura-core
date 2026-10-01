import assert from "node:assert/strict";
import test from "node:test";
import { evaluateProductionRelightPreflight } from "../lib/pnpk-production-relight-preflight.mjs";

function good(overrides={}) {
  return {
    routeId:"skygrid:route:west-anchor",
    activationGrantId:"grant-001",
    ownedRoute:true,
    previouslyAuthorized:true,
    degradedOrDown:true,
    pnpkPassed:true,
    signedActivationGrant:true,
    ownerApproved:true,
    emergencyOperatorApproved:true,
    healthQuorum:true,
    rollbackProof:true,
    preReceiptWritten:true,
    ...overrides
  };
}

test("approves bounded relight only when every production gate passes", () => {
  const out=evaluateProductionRelightPreflight(good(), new Date("2026-10-01T14:36:00Z"));
  assert.equal(out.decision,"RELIGHT_APPROVED");
  assert.equal(out.failures.length,0);
});

test("fails closed without signed grant or health quorum", () => {
  const out=evaluateProductionRelightPreflight(good({signedActivationGrant:false,healthQuorum:false}));
  assert.equal(out.decision,"FAIL_CLOSED");
  assert.ok(out.failures.includes("signed_activation_grant"));
  assert.ok(out.failures.includes("health_quorum"));
});

test("never grants third-party mutation or autonomous route creation", () => {
  const out=evaluateProductionRelightPreflight(good());
  assert.equal(out.scope.third_party_network_mutation_allowed,false);
  assert.equal(out.execution.autonomous_route_creation_allowed,false);
});
