import test from "node:test";
import assert from "node:assert/strict";

import {
  mayExport,
  redactSensitive,
  safeAudit,
} from "../src/security/privacy-gate.mjs";

test("exports fail closed without operator approval", () => {
  assert.equal(
    mayExport({
      purpose: "authorized-security-disclosure",
      destination: "security@example.test",
    }),
    false,
  );
});

test("authorized disclosure requires approval and destination", () => {
  assert.equal(
    mayExport({
      operatorApproved: true,
      purpose: "authorized-security-disclosure",
      destination: "security@example.test",
    }),
    true,
  );

  assert.equal(
    mayExport({
      operatorApproved: true,
      purpose: "authorized-security-disclosure",
      destination: "",
    }),
    false,
  );
});

test("legal response requires verified legal requirement", () => {
  assert.equal(
    mayExport({
      purpose: "required-legal-response",
      destination: "verified-recipient",
      legalRequirementVerified: false,
    }),
    false,
  );

  assert.equal(
    mayExport({
      purpose: "required-legal-response",
      destination: "verified-recipient",
      legalRequirementVerified: true,
    }),
    true,
  );
});

test("safeAudit excludes arbitrary sensitive metadata", () => {
  const entry = safeAudit(
    "evidence.review",
    {
      recordCount: 3,
      status: "ok",
      secret: "must-not-appear",
      ip: "192.0.2.1",
    },
    new Date("2026-10-03T00:00:00.000Z"),
  );

  assert.deepEqual(entry, {
    event: "evidence.review",
    timestamp: "2026-10-03T00:00:00.000Z",
    recordCount: 3,
    status: "ok",
  });
});

test("redactSensitive does not echo raw values", () => {
  assert.equal(redactSensitive("abcdefghijkl"), "ab…kl");
  assert.deepEqual(redactSensitive({ token: "secret" }), {
    token: "[REDACTED]",
  });
});
