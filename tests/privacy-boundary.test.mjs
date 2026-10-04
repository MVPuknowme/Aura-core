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
    legalBasis: "validated legal process"
  }), true);
});
