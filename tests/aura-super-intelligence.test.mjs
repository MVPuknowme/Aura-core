import assert from "node:assert/strict";
import test from "node:test";

import {
  AURA_SUPER_INTELLIGENCE_DECISIONS,
  AURA_SUPER_INTELLIGENCE_POLICY_VERSION,
  evaluateAuraSuperIntelligence,
  hashCanonical
} from "../src/intelligence/aura-super-intelligence.mjs";

const NOW = "2026-09-29T21:30:00.000Z";

function request(overrides = {}) {
  return {
    requestId: "asi-001",
    operator: "MVPuknowme",
    requestedAction: "assess validator readiness",
    target: "validator-health/us-west-2",
    requestedEvidenceScopes: [
      "validator-health/us-west-2",
      "deployment/github-run-123"
    ],
    severity: "advisory",
    alternatives: ["request additional validator telemetry"],
    counterEvidence: [],
    ...overrides
  };
}

function evidence(overrides = {}) {
  return [
    {
      id: "validator-health/us-west-2",
      source: "skygrid-validator",
      evidenceClass: "observed",
      authorized: true,
      provenanceValid: true,
      stale: false,
      conflicting: false,
      observedAt: NOW,
      payload: { healthy: true, quorum: 3 },
      ...overrides
    },
    {
      id: "deployment/github-run-123",
      source: "github-actions",
      evidenceClass: "observed",
      authorized: true,
      provenanceValid: true,
      stale: false,
      conflicting: false,
      observedAt: NOW,
      payload: { conclusion: "success", commit: "abc123" }
    }
  ];
}

function evaluate(overrides = {}) {
  return evaluateAuraSuperIntelligence({
    request: request(overrides.request),
    evidencePlanes: overrides.evidencePlanes ?? evidence(),
    pnpk: {
      policyVersion: AURA_SUPER_INTELLIGENCE_POLICY_VERSION,
      authorityCheck: true,
      receiptRequired: true,
      ...overrides.pnpk
    },
    approval: overrides.approval ?? null,
    now: () => NOW
  });
}

test("authorized observed evidence produces an advisory recommendation", () => {
  const result = evaluate();

  assert.equal(
    result.architecture.decide.decision,
    AURA_SUPER_INTELLIGENCE_DECISIONS.RECOMMEND
  );
  assert.equal(result.architecture.reason.confidence.level, "high");
  assert.equal(result.executionAllowed, false);
  assert.equal(result.architecture.execution.allowed, false);
  assert.equal(result.receipt.evidenceBindings.length, 2);
  assert.match(result.receipt.decisionHash, /^[a-f0-9]{64}$/);
});

test("GLOBAL exposes evidence metadata but not payloads", () => {
  const result = evaluate();
  const serialized = JSON.stringify(result.architecture.global);

  assert.equal(serialized.includes("quorum"), false);
  assert.equal(serialized.includes("commit"), false);
  assert.deepEqual(
    Object.keys(result.architecture.global.evidencePlanes[0]).sort(),
    [
      "authorized",
      "conflicting",
      "evidenceClass",
      "id",
      "provenanceValid",
      "source",
      "stale"
    ]
  );
});

test("unauthorized requested evidence fails closed", () => {
  const planes = evidence();
  planes[0] = { ...planes[0], authorized: false };

  const result = evaluate({ evidencePlanes: planes });

  assert.equal(
    result.architecture.decide.decision,
    AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED
  );
  assert.equal(result.architecture.decide.reason, "evidence_scope_not_authorized");
  assert.equal(result.executionAllowed, false);
});

test("invalid provenance fails the PNPK gate", () => {
  const planes = evidence();
  planes[0] = { ...planes[0], provenanceValid: false };

  const result = evaluate({ evidencePlanes: planes });

  assert.equal(
    result.architecture.decide.decision,
    AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED
  );
  assert.equal(result.architecture.decide.reason, "pnpk_gate_failed");
  assert.equal(result.receipt.pnpk.provenanceCheck, false);
});

test("stale evidence escalates instead of authorizing execution", () => {
  const planes = evidence();
  planes[0] = { ...planes[0], stale: true };

  const result = evaluate({ evidencePlanes: planes });

  assert.equal(
    result.architecture.decide.decision,
    AURA_SUPER_INTELLIGENCE_DECISIONS.ESCALATE
  );
  assert.equal(result.architecture.reason.confidence.level, "low");
  assert.equal(result.executionAllowed, false);
});

test("critical decisions await explicit operator approval", () => {
  const waiting = evaluate({ request: { severity: "critical" } });

  assert.equal(
    waiting.architecture.decide.decision,
    AURA_SUPER_INTELLIGENCE_DECISIONS.AWAIT_APPROVAL
  );

  const approved = evaluate({
    request: { severity: "critical" },
    approval: { approved: true, approvedBy: "MVPuknowme" }
  });

  assert.equal(
    approved.architecture.decide.decision,
    AURA_SUPER_INTELLIGENCE_DECISIONS.RECOMMEND
  );
  assert.equal(approved.executionAllowed, false);
});

test("policy mismatch fails closed", () => {
  const result = evaluate({
    pnpk: { policyVersion: "aura-super-intelligence-v0" }
  });

  assert.equal(
    result.architecture.decide.decision,
    AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED
  );
  assert.equal(result.architecture.decide.reason, "pnpk_gate_failed");
});

test("canonical evidence hashing is stable across object key order", () => {
  assert.equal(
    hashCanonical({ b: 2, a: { y: 2, x: 1 } }),
    hashCanonical({ a: { x: 1, y: 2 }, b: 2 })
  );
});
