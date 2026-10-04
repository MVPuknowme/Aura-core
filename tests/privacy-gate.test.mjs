import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

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
      recipientVerified: true,
      scopeMinimized: true,
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
  for (const value of ["", "abcde", "abcdefghijkl", { "secret-key": "secret" },
    ["secret"], 12345, true, null, undefined]) {
    assert.equal(redactSensitive(value), "[REDACTED]");
  }
});

test("legal export requires every verification signal as a literal boolean", () => {
  const request = { purpose: "required-legal-response", destination: "verified-recipient",
    legalRequirementVerified: true, recipientVerified: true, scopeMinimized: true };
  for (const field of ["legalRequirementVerified", "recipientVerified", "scopeMinimized"]) {
    for (const value of [undefined, false, "true", 1, {}]) {
      assert.equal(mayExport({ ...request, [field]: value }), false);
    }
  }
});

test("both export paths reject invalid destinations", () => {
  for (const purpose of ["user-requested-export", "required-legal-response"]) {
    for (const destination of [undefined, null, "", "  ", "\t\n", {}, [], 1, true,
      "recipient\nother", "recipient\u0000"]) {
      assert.equal(mayExport({ purpose, destination, operatorApproved: true,
        legalRequirementVerified: true, recipientVerified: true, scopeMinimized: true }), false);
    }
  }
  assert.equal(mayExport(), false);
  assert.equal(mayExport({ operatorApproved: "true", purpose: "user-requested-export",
    destination: "recipient" }), false);
  assert.equal(mayExport({ operatorApproved: true, purpose: "unknown",
    destination: "recipient" }), false);
  assert.equal(mayExport({ operatorApproved: true, purpose: "user-requested-export",
    destination: " recipient " }), true);
});

test("audit failure fields cannot echo free-form secrets", () => {
  for (const secret of ["token=abcde", "192.0.2.1", "error: secret", {}, null]) {
    const entry = safeAudit(secret, { status: secret, recordCount: -1 });
    assert.equal(entry.event, "unknown");
    assert.equal(entry.status, "unknown");
    assert.equal(entry.recordCount, null);
    assert.ok(Object.isFrozen(entry));
  }
  for (const recordCount of [1.5, NaN, Infinity, "3", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(safeAudit("export.denied", { status: "denied", recordCount }).recordCount, null);
  }
  assert.equal(safeAudit("evidence.review", null).status, "unknown");
});

test("common private-key and certificate formats are ignored at any depth", () => {
  const paths = ["key", "pem", "p12", "pfx", "cer", "crt", "der", "certSigningRequest"]
    .flatMap(extension => [`privacy-fixture.${extension}`, `nested/privacy-fixture.${extension}`]);
  const ignored = execFileSync("git", ["check-ignore", "--no-index", "--stdin"],
    { input: paths.join("\n") + "\n", encoding: "utf8" }).trim().split("\n");
  assert.deepEqual(ignored, paths);
});

test("privacy devcontainer config protects tmpfs and uses supported editor telemetry setting", () => {
  const config = JSON.parse(readFileSync(new URL("../.devcontainer/privacy/devcontainer.json", import.meta.url)));
  assert.equal(config.remoteUser, "node");
  assert.ok(config.image.includes(":24-"));
  assert.ok(config.runArgs.includes("--network=none"));
  assert.ok(config.mounts.includes("type=tmpfs,target=/workspaces/private-evidence,tmpfs-mode=0700"));
  assert.match(config.postStartCommand, /sudo chown node:node/);
  assert.match(config.postStartCommand, /sudo chmod 700/);
  assert.equal(config.customizations.vscode.settings["telemetry.telemetryLevel"], "off");
  assert.deepEqual(config.customizations.vscode.extensions, ["-dbaeumer.vscode-eslint"]);
  assert.equal(config.containerEnv.SKYGRID_TELEMETRY, undefined);
});
