import { createHash } from "node:crypto";

export const AURA_SUPER_INTELLIGENCE_POLICY_VERSION = "aura-super-intelligence-v1";

export const AURA_SUPER_INTELLIGENCE_DECISIONS = Object.freeze({
  RECOMMEND: "RECOMMEND",
  ESCALATE: "ESCALATE",
  AWAIT_APPROVAL: "AWAIT_APPROVAL",
  FAIL_CLOSED: "FAIL_CLOSED"
});

const EVIDENCE_CLASSES = new Set(["observed", "simulated", "declared", "inferred"]);
const SEVERITIES = new Set(["informational", "advisory", "elevated", "critical"]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

export function hashCanonical(value) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function globalMetadata(plane) {
  return {
    id: text(plane?.id),
    source: text(plane?.source),
    evidenceClass: text(plane?.evidenceClass),
    authorized: plane?.authorized === true,
    provenanceValid: plane?.provenanceValid === true,
    stale: plane?.stale === true,
    conflicting: plane?.conflicting === true
  };
}

function validateRequest(request) {
  const missing = ["requestId", "operator", "requestedAction", "target"].filter(
    (key) => !text(request?.[key])
  );
  if (missing.length) return { reason: "required_request_fields_missing", missing };

  if (!SEVERITIES.has(request?.severity)) {
    return { reason: "severity_invalid", missing: [] };
  }

  if (
    !Array.isArray(request?.requestedEvidenceScopes) ||
    request.requestedEvidenceScopes.length === 0
  ) {
    return { reason: "evidence_scope_required", missing: [] };
  }

  return null;
}

function bindEvidencePlane(plane) {
  const material = {
    id: text(plane.id),
    source: text(plane.source),
    evidenceClass: text(plane.evidenceClass),
    observedAt: plane.observedAt ?? null,
    payload: plane.payload ?? null
  };

  return {
    id: material.id,
    source: material.source,
    evidenceClass: material.evidenceClass,
    observedAt: material.observedAt,
    sha256: hashCanonical(material)
  };
}

function assessConfidence(focusedPlanes) {
  if (focusedPlanes.length === 0) {
    return {
      level: "unknown",
      reasons: ["no_focused_evidence"]
    };
  }

  if (focusedPlanes.some((plane) => plane.provenanceValid !== true)) {
    return {
      level: "unknown",
      reasons: ["provenance_invalid"]
    };
  }

  if (focusedPlanes.some((plane) => plane.stale === true)) {
    return {
      level: "low",
      reasons: ["stale_evidence"]
    };
  }

  if (focusedPlanes.some((plane) => plane.conflicting === true)) {
    return {
      level: "low",
      reasons: ["conflicting_evidence"]
    };
  }

  if (
    focusedPlanes.some((plane) =>
      ["simulated", "declared", "inferred"].includes(plane.evidenceClass)
    )
  ) {
    return {
      level: "medium",
      reasons: ["non_observed_evidence_present"]
    };
  }

  return {
    level: "high",
    reasons: ["authorized_observed_evidence_agrees"]
  };
}

function baseResult({
  request,
  global,
  focus,
  reason,
  pnpk,
  decision,
  timestamp
}) {
  const receiptBase = {
    schema: "aura-super-intelligence-receipt/v1",
    policyVersion: AURA_SUPER_INTELLIGENCE_POLICY_VERSION,
    requestId: request?.requestId ?? null,
    operator: request?.operator ?? null,
    requestedAction: request?.requestedAction ?? null,
    target: request?.target ?? null,
    timestamp,
    mode: "advisory",
    evidenceBindings: focus.bindings,
    confidence: reason.confidence,
    severity: reason.severity,
    alternatives: reason.alternatives,
    counterEvidence: reason.counterEvidence,
    pnpk,
    decision
  };

  const receipt = {
    ...receiptBase,
    decisionHash: hashCanonical(receiptBase)
  };

  return {
    architecture: {
      global,
      focus,
      reason,
      pnpk,
      decide: decision,
      execution: {
        allowed: false,
        boundary: "separate_authorized_execution_layer",
        grant: null
      }
    },
    receipt,
    executionAllowed: false
  };
}

export function evaluateAuraSuperIntelligence({
  request,
  evidencePlanes = [],
  pnpk = {},
  approval = null,
  now = () => new Date().toISOString()
} = {}) {
  const timestamp = now();
  const global = {
    phase: "GLOBAL",
    evidencePlanes: evidencePlanes.map(globalMetadata)
  };

  const requestProblem = validateRequest(request);
  const requestedScopes = Array.isArray(request?.requestedEvidenceScopes)
    ? [...new Set(request.requestedEvidenceScopes.map(String))]
    : [];

  const byId = new Map(evidencePlanes.map((plane) => [text(plane?.id), plane]));
  const focusedPlanes = requestedScopes
    .map((id) => byId.get(id))
    .filter(Boolean);

  const missingScopes = requestedScopes.filter((id) => !byId.has(id));
  const unauthorizedScopes = focusedPlanes
    .filter((plane) => plane.authorized !== true)
    .map((plane) => text(plane.id));
  const invalidEvidenceClasses = focusedPlanes
    .filter((plane) => !EVIDENCE_CLASSES.has(text(plane.evidenceClass)))
    .map((plane) => text(plane.id));

  const focus = {
    phase: "FOCUS",
    requestedScopes,
    selectedScopes: focusedPlanes.map((plane) => text(plane.id)),
    bindings: focusedPlanes.map(bindEvidencePlane),
    missingScopes,
    unauthorizedScopes
  };

  const confidence = assessConfidence(focusedPlanes);
  const reason = {
    phase: "REASON",
    confidence,
    severity: request?.severity ?? "critical",
    alternatives: Array.isArray(request?.alternatives) ? request.alternatives : [],
    counterEvidence: Array.isArray(request?.counterEvidence)
      ? request.counterEvidence
      : []
  };

  const provenancePassed =
    focusedPlanes.length === requestedScopes.length &&
    focusedPlanes.every((plane) => plane.provenanceValid === true);

  const pnpkState = {
    phase: "PNPK",
    policyVersion: pnpk.policyVersion ?? null,
    policyVersionValid:
      pnpk.policyVersion === AURA_SUPER_INTELLIGENCE_POLICY_VERSION,
    authorityCheck: pnpk.authorityCheck === true,
    provenanceCheck: provenancePassed,
    receiptRequired: pnpk.receiptRequired === true
  };

  let decision;

  if (requestProblem) {
    decision = {
      phase: "DECIDE",
      decision: AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED,
      reason: requestProblem.reason,
      missing: requestProblem.missing
    };
  } else if (missingScopes.length > 0) {
    decision = {
      phase: "DECIDE",
      decision: AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED,
      reason: "requested_evidence_missing"
    };
  } else if (unauthorizedScopes.length > 0) {
    decision = {
      phase: "DECIDE",
      decision: AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED,
      reason: "evidence_scope_not_authorized"
    };
  } else if (invalidEvidenceClasses.length > 0) {
    decision = {
      phase: "DECIDE",
      decision: AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED,
      reason: "evidence_class_invalid"
    };
  } else if (
    !pnpkState.policyVersionValid ||
    !pnpkState.authorityCheck ||
    !pnpkState.provenanceCheck ||
    !pnpkState.receiptRequired
  ) {
    decision = {
      phase: "DECIDE",
      decision: AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED,
      reason: "pnpk_gate_failed"
    };
  } else if (confidence.level === "unknown") {
    decision = {
      phase: "DECIDE",
      decision: AURA_SUPER_INTELLIGENCE_DECISIONS.FAIL_CLOSED,
      reason: "confidence_unknown"
    };
  } else {
    const approvalRequired =
      request.requiresApproval === true ||
      request.severity === "elevated" ||
      request.severity === "critical";

    if (approvalRequired && approval?.approved !== true) {
      decision = {
        phase: "DECIDE",
        decision: AURA_SUPER_INTELLIGENCE_DECISIONS.AWAIT_APPROVAL,
        reason: "explicit_operator_approval_required"
      };
    } else if (confidence.level === "low") {
      decision = {
        phase: "DECIDE",
        decision: AURA_SUPER_INTELLIGENCE_DECISIONS.ESCALATE,
        reason: confidence.reasons[0]
      };
    } else {
      decision = {
        phase: "DECIDE",
        decision: AURA_SUPER_INTELLIGENCE_DECISIONS.RECOMMEND,
        reason:
          confidence.level === "high"
            ? "evidence_sufficient_for_advisory_recommendation"
            : "bounded_recommendation_with_evidence_caveats"
      };
    }
  }

  return baseResult({
    request,
    global,
    focus,
    reason,
    pnpk: pnpkState,
    decision,
    timestamp
  });
}
