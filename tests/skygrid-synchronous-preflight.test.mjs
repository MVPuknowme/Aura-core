import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateSynchronousPreflight,
  fingerprintIntent,
  PROVIDERS
} from "../src/preflight/skygrid-synchronous-preflight.mjs";
import { getDryRunAdapter } from "../src/preflight/dry-run-adapters.mjs";

const NOW = "2026-09-21T05:40:00.000Z";

function intent(overrides = {}) {
  return {
    intentId: "intent-mvp-82-001",
    preflightId: "preflight-mvp-82-001",
    operator: "MVPuknowme",
    linearIssue: "MVP-82",
    provider: "github",
    targetEnvironment: "staging",
    requestedAction: "inspect branch and workflow readiness",
    riskLevel: "Low",
    mode: "dry-run",
    policyVersion: "mvp-82-v1",
    ...overrides
  };
}

async function evaluate(overrides = {}, options = {}) {
  const value = intent(overrides);
  return evaluateSynchronousPreflight({
    intent: value,
    adapter: getDryRunAdapter(value.provider),
    now: () => NOW,
    ...options
  });
}

test("non-dry-run requests fail closed before execution", async () => {
  const result = await evaluate({ mode: "execute" });
  assert.equal(result.state, "Blocked");
  assert.equal(result.reason, "dry_run_required");
  assert.equal(result.executionAllowed, false);
  assert.equal(result.receipt.executionAllowed, false);
});

test("all seven provider fixtures normalize without mutation", async () => {
  for (const provider of PROVIDERS) {
    const result = await evaluate({ provider });
    assert.equal(result.adapterResult.provider, provider);
    assert.equal(result.adapterResult.mutated, false);
    assert.equal(result.executionAllowed, false);
    assert.ok(["Passed", "Warning", "Skipped"].includes(result.state));
  }
});

test("high-risk operations stop at Waiting Human Approval", async () => {
  const cases = [
    { riskLevel: "High", requestedAction: "inspect production deployment" },
    { requestedAction: "delete production resource", destructive: true },
    { requestedAction: "rotate secret", infrastructureChange: true },
    { requestedAction: "publish client-facing proof", clientFacing: true },
    { requestedAction: "prepare legal invoice", legalAction: true },
    { requestedAction: "wallet transfer", walletRequired: true, financialAction: true }
  ];

  for (const highRisk of cases) {
    const result = await evaluate(highRisk);
    assert.equal(result.state, "Waiting Human Approval");
    assert.equal(result.executionAllowed, false);
    assert.deepEqual(result.requiredApprovals, ["human"]);
  }
});

test("approval is bound to the exact intent fingerprint", async () => {
  const highRisk = intent({
    provider: "azure",
    riskLevel: "High",
    requestedAction: "production promotion",
    targetEnvironment: "production"
  });

  const result = await evaluateSynchronousPreflight({
    intent: highRisk,
    adapter: getDryRunAdapter(highRisk.provider),
    approval: {
      approvedBy: "MVPuknowme",
      intentFingerprint: fingerprintIntent(highRisk)
    },
    now: () => NOW
  });

  assert.equal(result.state, "Approved");
  assert.equal(result.executionAllowed, false);

  const changed = { ...highRisk, requestedAction: "production promotion plus secret rotation" };
  const changedResult = await evaluateSynchronousPreflight({
    intent: changed,
    adapter: getDryRunAdapter(changed.provider),
    approval: {
      approvedBy: "MVPuknowme",
      intentFingerprint: fingerprintIntent(highRisk)
    },
    now: () => NOW
  });

  assert.equal(changedResult.state, "Waiting Human Approval");
});

test("GitHub failure stops downstream providers", async () => {
  for (const provider of ["railway", "azure", "vercel"]) {
    const result = await evaluate({ provider }, { dependencies: { github: "Failed" } });
    assert.equal(result.state, "Blocked");
    assert.equal(result.reason, "github_failed");
  }
});

test("Railway staging failure stops Azure", async () => {
  const result = await evaluate(
    { provider: "azure" },
    { dependencies: { railway: "Failed" } }
  );
  assert.equal(result.state, "Blocked");
  assert.equal(result.reason, "railway_staging_failed");
});

test("Azure identity or secret failures block client-facing readiness", async () => {
  const result = await evaluate(
    { provider: "skygrid-dashboard", clientFacing: true },
    { dependencies: { azureChecks: { identity: "Passed", secret: "Failed" } } }
  );
  assert.equal(result.state, "Blocked");
  assert.equal(result.reason, "azure_readiness_check_failed");
});

test("Vercel wrong commit fails the lane", async () => {
  const result = await evaluate(
    { provider: "vercel", gitCommit: "bad-commit" },
    { dependencies: { approvedGitCommit: "approved-commit" } }
  );
  assert.equal(result.state, "Failed");
  assert.equal(result.reason, "vercel_commit_mismatch");
});

test("optional Airtable and Clio credentials degrade to Skipped", async () => {
  for (const provider of ["airtable", "clio"]) {
    const result = await evaluate({
      provider,
      adapterFixture: { credentialsPresent: false, requiredForClient: false }
    });
    assert.equal(result.state, "Skipped");
    assert.equal(result.adapterResult.reason, "optional_credentials_missing");
    assert.equal(result.executionAllowed, false);
  }
});

test("required Airtable or Clio credentials fail closed", async () => {
  for (const provider of ["airtable", "clio"]) {
    const result = await evaluate({
      provider,
      adapterFixture: { credentialsPresent: false, requiredForClient: true }
    });
    assert.equal(result.state, "Failed");
    assert.equal(result.adapterResult.reason, "required_credentials_missing");
  }
});

test("receipts include the MVP-82 governance evidence fields", async () => {
  const result = await evaluate({
    gitCommit: "abc123",
    evidenceUrls: ["https://example.invalid/proof"]
  });

  assert.deepEqual(
    {
      intentId: result.receipt.intentId,
      operator: result.receipt.operator,
      linearIssue: result.receipt.linearIssue,
      gitCommit: result.receipt.gitCommit,
      targetEnvironment: result.receipt.targetEnvironment,
      requestedAction: result.receipt.requestedAction,
      riskLevel: result.receipt.riskLevel,
      policyVersion: result.receipt.policyVersion,
      timestamp: result.receipt.timestamp,
      finalDecision: result.receipt.finalDecision,
      executionAllowed: result.receipt.executionAllowed
    },
    {
      intentId: "intent-mvp-82-001",
      operator: "MVPuknowme",
      linearIssue: "MVP-82",
      gitCommit: "abc123",
      targetEnvironment: "staging",
      requestedAction: "inspect branch and workflow readiness",
      riskLevel: "Low",
      policyVersion: "mvp-82-v1",
      timestamp: NOW,
      finalDecision: "Passed",
      executionAllowed: false
    }
  );
});
