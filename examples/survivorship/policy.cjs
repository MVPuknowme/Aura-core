"use strict";
// Simulation only. Not a production authorization boundary.
function evaluateSurvivorship(input) {
  const result = (decision, reason, route = "review_queue", actions = []) => ({
    schema: "skygrid.survivorship.decision.v0.1",
    mode: "simulation",
    decision, reason, route, allowed_demo_actions: actions,
    execution_authorized: false,
    legal_effect: "none",
    authority_verified: false
  });
  if (!input || typeof input !== "object" || input.simulation !== true)
    return result("hold", "This evaluator accepts simulation inputs only.");
  if (input.tenantId !== "mvp-survivorship-demo")
    return result("hold", "Unknown demo tenant.");
  if (input.revoked === true) return result("revoked", "The demo designation is revoked.");
  if (!["outage", "incapacity", "death"].includes(input.event))
    return result("hold", "Select a supported event.");
  if (!Number.isFinite(input.now) || !Number.isFinite(input.expiresAt) || input.expiresAt <= input.now)
    return result("expired", "The demo authority window is missing or expired.");
  if (input.locationConfirmed !== true || input.jurisdiction !== "US-OR")
    return result("hold", "P0 needs a confirmed demo location and the configured jurisdiction.");
  if (input.event === "outage")
    return input.backupAvailable === true
      ? result("continuity", "A simulated outage selects the read-only backup. No successor is activated.",
        "read_only_backup", ["view_sample_service_manifest"])
      : result("hold", "No authorized backup is available; queue the request.");
  if (typeof input.successor !== "string" || input.successor.trim().length < 2 || input.successor.length > 120)
    return result("hold", "Designate a demo successor before evaluating succession.");
  const evidence = ["eventEvidence", "authorityEvidence", "recipientVerified", "scopeConsent", "disputeClear"];
  const missing = evidence.filter(key => input[key] !== true);
  if (missing.length) return result("hold", "Missing demo checks: " + missing.join(", ") + ".");
  const approvals = Array.isArray(input.approvals) ? input.approvals : [];
  const permittedReviewers = ["demo-reviewer-a", "demo-reviewer-b"];
  if (approvals.length !== 2 || new Set(approvals).size !== 2 || approvals.some(id => !permittedReviewers.includes(id)))
    return result("hold", "Two distinct configured demo reviewers are required.");
  if (input.requestedScope !== "service_metadata")
    return result("hold", "Only sample service metadata is permitted in this proof of concept.");
  return result("eligible", "The simulated succession checks are complete. Real authority still requires independent verification.",
    "successor_read_only", ["view_sample_service_manifest"]);
}
module.exports = { evaluateSurvivorship };
