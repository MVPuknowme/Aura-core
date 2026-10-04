import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuditRecord,
  emitAudit,
  mayExport,
  privacyDefaults
} from "../lib/security/privacy-boundary.mjs";

test("privacy defaults fail closed", () => {
  const defaults = privacyDefaults();
  assert.equal(defaults.default, "private");
  assert.equal(defaults.sensitiveStdout, "disabled");
  assert.equal(defaults.externalExport, "explicit-only");
  assert.equal(defaults.rawEvidenceMutation, "prohibited");
});

test("audit emission is disabled unless explicitly enabled", () => {
  let writes = 0;
  const record = buildAuditRecord("evidence_review", {
    recordCount: 3,
    status: "ok",
    secret: "must-not-appear"
  }, new Date("2026-10-03T00:00:00.000Z"));

  assert.equal("secret" in record, false);
  assert.equal(emitAudit(record, { sink: () => { writes += 1; } }), false);
  assert.equal(writes, 0);

  assert.equal(emitAudit(record, {
    enabled: true,
    sink: () => { writes += 1; }
  }), true);
  assert.equal(writes, 1);
});

test("export requires explicit operator approval, purpose, and destination", () => {
  assert.equal(mayExport({
    operatorApproved: false,
    purpose: "user-requested-export",
    destination: "private-target"
  }), false);

  assert.equal(mayExport({
    operatorApproved: true,
    purpose: "user-requested-export",
    destination: "private-target"
  }), true);

  assert.equal(mayExport({
    operatorApproved: true,
    purpose: "unknown",
    destination: "private-target"
  }), false);
});

test("legal-response export also requires a stated legal basis", () => {
  assert.equal(mayExport({
    operatorApproved: true,
    purpose: "required-legal-response",
    destination: "authorized-recipient"
  }), false);

  assert.equal(mayExport({
    operatorApproved: true,
    purpose: "required-legal-response",
    destination: "authorized-recipient",
    legalBasis: "validated legal process",
    legalRequirementVerified: true,
    recipientVerified: true,
    scopeMinimized: true
  }), true);
});

test("legacy boundary cannot bypass the shared privacy gate", () => {
  const request = { operatorApproved: true, purpose: "required-legal-response",
    destination: "recipient", legalBasis: "validated legal process",
    legalRequirementVerified: true, recipientVerified: true, scopeMinimized: true };
  for (const field of ["operatorApproved", "legalRequirementVerified", "recipientVerified", "scopeMinimized"]) {
    assert.equal(mayExport({ ...request, [field]: "true" }), false);
  }
  assert.equal(mayExport({ ...request, destination: {} }), false);
  let output;
  emitAudit({ event: "secret token", status: "192.0.2.1", token: "private" },
    { enabled: true, sink: value => { output = JSON.parse(value); } });
  assert.equal(output.event, "unknown");
  assert.equal(output.status, "unknown");
  assert.equal("token" in output, false);
});
