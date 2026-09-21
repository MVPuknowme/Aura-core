import { createHash } from "node:crypto";

export const PROVIDERS = Object.freeze([
  "github",
  "railway",
  "azure",
  "vercel",
  "airtable",
  "clio",
  "skygrid-dashboard"
]);

const RISK_LEVELS = new Set(["Info", "Low", "Medium", "High", "Critical"]);
const HIGH_RISK_ACTION = /(production|promot|destroy|delete|secret|credential|permission|iam|client-facing|publish|legal|invoice|wallet|web3|contract|payment|token|ownership|value)/i;

function stableIntent(intent) {
  return {
    intentId: intent.intentId,
    operator: intent.operator,
    linearIssue: intent.linearIssue,
    provider: intent.provider,
    targetEnvironment: intent.targetEnvironment,
    requestedAction: intent.requestedAction,
    gitCommit: intent.gitCommit ?? null,
    riskLevel: intent.riskLevel,
    walletRequired: Boolean(intent.walletRequired),
    infrastructureChange: Boolean(intent.infrastructureChange),
    financialAction: Boolean(intent.financialAction),
    legalAction: Boolean(intent.legalAction),
    clientFacing: Boolean(intent.clientFacing),
    destructive: Boolean(intent.destructive),
    payloadFingerprint: intent.payloadFingerprint ?? null,
    policyVersion: intent.policyVersion ?? "mvp-82-v1"
  };
}

export function fingerprintIntent(intent) {
  return createHash("sha256")
    .update(JSON.stringify(stableIntent(intent)))
    .digest("hex");
}

function missingRequired(intent) {
  const required = [
    "intentId",
    "operator",
    "linearIssue",
    "provider",
    "targetEnvironment",
    "requestedAction",
    "riskLevel",
    "mode"
  ];
  return required.filter((key) => !intent?.[key]);
}

function requiresHumanApproval(intent) {
  return (
    intent.riskLevel === "High" ||
    intent.riskLevel === "Critical" ||
    intent.walletRequired === true ||
    intent.financialAction === true ||
    intent.legalAction === true ||
    intent.clientFacing === true ||
    intent.destructive === true ||
    HIGH_RISK_ACTION.test(intent.requestedAction)
  );
}

function approvalMatches(intent, approval) {
  if (!approval?.approvedBy || !approval?.intentFingerprint) return false;
  return approval.intentFingerprint === fingerprintIntent(intent);
}

function dependencyStop(intent, dependencies = {}) {
  if (dependencies.github === "Failed") {
    return { state: "Blocked", reason: "github_failed" };
  }

  if (intent.provider === "azure" && dependencies.railway === "Failed") {
    return { state: "Blocked", reason: "railway_staging_failed" };
  }

  if (
    intent.clientFacing === true &&
    ["identity", "secret", "resource", "target"].some(
      (check) => dependencies.azureChecks?.[check] === "Failed"
    )
  ) {
    return { state: "Blocked", reason: "azure_readiness_check_failed" };
  }

  if (
    intent.provider === "vercel" &&
    dependencies.approvedGitCommit &&
    intent.gitCommit &&
    dependencies.approvedGitCommit !== intent.gitCommit
  ) {
    return { state: "Failed", reason: "vercel_commit_mismatch" };
  }

  if (dependencies.unexpectedDependency?.severity === "Failed") {
    return { state: "Blocked", reason: "unexpected_dependency_failed" };
  }

  return null;
}

function makeReceipt(intent, decision, now) {
  return {
    preflightId: intent.preflightId ?? intent.intentId,
    intentId: intent.intentId,
    intentFingerprint: fingerprintIntent(intent),
    operator: intent.operator,
    linearIssue: intent.linearIssue,
    provider: intent.provider,
    gitCommit: intent.gitCommit ?? null,
    targetEnvironment: intent.targetEnvironment,
    requestedAction: intent.requestedAction,
    riskLevel: intent.riskLevel,
    requiredApprovals: decision.requiredApprovals,
    evidenceUrls: Array.isArray(intent.evidenceUrls) ? intent.evidenceUrls : [],
    policyVersion: intent.policyVersion ?? "mvp-82-v1",
    timestamp: now(),
    finalDecision: decision.state,
    reason: decision.reason,
    executionAllowed: false
  };
}

export async function evaluateSynchronousPreflight({
  intent,
  adapter,
  dependencies = {},
  approval,
  now = () => new Date().toISOString()
}) {
  const missing = missingRequired(intent);
  if (missing.length) {
    const decision = {
      state: "Blocked",
      reason: "required_intent_fields_missing",
      missing,
      requiredApprovals: []
    };
    return { ...decision, receipt: null, executionAllowed: false };
  }

  if (!PROVIDERS.includes(intent.provider)) {
    const decision = {
      state: "Blocked",
      reason: "provider_not_allowlisted",
      requiredApprovals: []
    };
    return { ...decision, receipt: makeReceipt(intent, decision, now), executionAllowed: false };
  }

  if (!RISK_LEVELS.has(intent.riskLevel)) {
    const decision = {
      state: "Blocked",
      reason: "risk_level_invalid",
      requiredApprovals: []
    };
    return { ...decision, receipt: makeReceipt(intent, decision, now), executionAllowed: false };
  }

  if (intent.mode !== "dry-run") {
    const decision = {
      state: "Blocked",
      reason: "dry_run_required",
      requiredApprovals: []
    };
    return { ...decision, receipt: makeReceipt(intent, decision, now), executionAllowed: false };
  }

  if (!/^MVP-\d+$/.test(intent.linearIssue)) {
    const decision = {
      state: "Blocked",
      reason: "linear_issue_link_invalid",
      requiredApprovals: []
    };
    return { ...decision, receipt: makeReceipt(intent, decision, now), executionAllowed: false };
  }

  const stopped = dependencyStop(intent, dependencies);
  if (stopped) {
    const decision = { ...stopped, requiredApprovals: [] };
    return { ...decision, receipt: makeReceipt(intent, decision, now), executionAllowed: false };
  }

  let adapterResult = {
    state: "Passed",
    reason: "dry_run_normalized",
    mutated: false,
    evidence: {}
  };

  if (adapter) {
    adapterResult = await adapter(intent);
    if (adapterResult?.mutated !== false) {
      const decision = {
        state: "Blocked",
        reason: "adapter_mutation_not_permitted",
        requiredApprovals: []
      };
      return {
        ...decision,
        adapterResult,
        receipt: makeReceipt(intent, decision, now),
        executionAllowed: false
      };
    }

    if (adapterResult.state === "Failed" || adapterResult.state === "Blocked") {
      const decision = {
        state: adapterResult.state,
        reason: adapterResult.reason ?? "adapter_preflight_failed",
        requiredApprovals: []
      };
      return {
        ...decision,
        adapterResult,
        receipt: makeReceipt(intent, decision, now),
        executionAllowed: false
      };
    }
  }

  const warning = dependencies.unexpectedDependency?.severity === "Warning";
  const approvalRequired = requiresHumanApproval(intent);

  if (approvalRequired && !approvalMatches(intent, approval)) {
    const decision = {
      state: "Waiting Human Approval",
      reason: "explicit_human_approval_required",
      requiredApprovals: ["human"]
    };
    return {
      ...decision,
      adapterResult,
      receipt: makeReceipt(intent, decision, now),
      executionAllowed: false
    };
  }

  const state =
    adapterResult.state === "Skipped"
      ? "Skipped"
      : warning || adapterResult.state === "Warning"
        ? "Warning"
        : approvalRequired
          ? "Approved"
          : "Passed";

  const decision = {
    state,
    reason:
      state === "Approved"
        ? "bound_human_approval_verified"
        : adapterResult.reason ?? (warning ? "unexpected_dependency_warning" : "dry_run_passed"),
    requiredApprovals: approvalRequired ? ["human"] : []
  };

  return {
    ...decision,
    adapterResult,
    receipt: makeReceipt(intent, decision, now),
    executionAllowed: false
  };
}
