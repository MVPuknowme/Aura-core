import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  PREFLIGHT_SCHEMA,
  evaluateCodeMirrorPreflight,
  runCodeMirrorPreflightFile
} from "../scripts/skygrid-codemirror-preflight.mjs";

const NOW = "2026-09-03T06:15:00.000Z";

function validIntent(overrides = {}) {
  return {
    schema: PREFLIGHT_SCHEMA,
    action: "prepare",
    surface: "codemirror",
    transport: "t.me",
    files: [
      {
        path: "apps/codemirror-console/src/editor.mjs",
        content: "export const ready = true;\n"
      }
    ],
    ...overrides
  };
}

function run(intent) {
  return evaluateCodeMirrorPreflight(intent, { now: () => NOW });
}

test("verifies a safe CodeMirror candidate without granting execution authority", () => {
  const result = run(validIntent());

  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.equal(result.receipt.receipt_type, "aura_codemirror_preflight");
  assert.equal(result.receipt.decision, "preflight_verified");
  assert.equal(result.receipt.mode, "controlled_pilot");
  assert.equal(result.receipt.sentinel, "fail_closed");
  assert.equal(result.receipt.execution_allowed, false);
  assert.equal(result.receipt.deployment_authorized, false);
  assert.equal(result.receipt.transport_publish_allowed, false);
  assert.match(result.receipt.candidate_sha256, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.candidate.candidate_id, /^cand_[a-f0-9]{16}$/);
});

test("produces the same candidate hash across file order and slash style", () => {
  const first = run(validIntent({
    files: [
      { path: "tests\\codemirror-a.test.mjs", content: "a\n" },
      { path: "apps/codemirror-console/src/b.mjs", content: "b\n" }
    ]
  }));
  const second = run(validIntent({
    files: [
      { path: "apps/codemirror-console/src/b.mjs", content: "b\n" },
      { path: "tests/codemirror-a.test.mjs", content: "a\n" }
    ]
  }));

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(first.receipt.candidate_sha256, second.receipt.candidate_sha256);
});

test("rejects unsupported top-level intent fields", () => {
  const result = run(validIntent({ shell: "node whatever.mjs" }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.receipt.decision, "fail_closed");
  assert.equal(result.receipt.reason, "unsupported_intent_field");
});

test("rejects executable or unsupported fields on candidate files", () => {
  const result = run(validIntent({
    files: [{
      path: "apps/codemirror-console/src/editor.mjs",
      content: "export {};\n",
      executable: true
    }]
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.receipt.reason, "unsupported_file_field");
});

test("rejects traversal, absolute, and protected paths", () => {
  for (const path of [
    "../.env",
    "/etc/passwd",
    "C:\\Windows\\System32\\drivers\\etc\\hosts",
    ".env",
    ".git/config",
    ".vercel/project.json",
    "node_modules/pkg/index.js"
  ]) {
    const result = run(validIntent({ files: [{ path, content: "x" }] }));
    assert.equal(result.ok, false, path);
    assert.equal(result.receipt.decision, "fail_closed", path);
    assert.equal(result.receipt.reason, "candidate_path_not_allowed", path);
  }
});

test("rejects files outside the initial CodeMirror preflight allowlist", () => {
  const result = run(validIntent({
    files: [{ path: "README.md", content: "changed\n" }]
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.receipt.reason, "candidate_path_not_allowlisted");
});

test("rejects duplicate paths after normalization", () => {
  const result = run(validIntent({
    files: [
      { path: "tests\\same.test.mjs", content: "a\n" },
      { path: "tests/same.test.mjs", content: "b\n" }
    ]
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.receipt.reason, "duplicate_candidate_path");
});

test("preflight never accepts deploy as an executable action", () => {
  const result = run(validIntent({ action: "deploy" }));

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(result.receipt.reason, "preflight_action_not_allowed");
  assert.equal(result.receipt.execution_allowed, false);
  assert.equal(result.receipt.deployment_authorized, false);
});

test("runs the same fail-closed preflight contract from an intent JSON file", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "aura-codemirror-preflight-"));
  const intentPath = path.join(directory, "intent.json");

  try {
    await writeFile(intentPath, JSON.stringify(validIntent()), "utf8");
    const result = await runCodeMirrorPreflightFile(intentPath, { now: () => NOW });

    assert.equal(result.ok, true);
    assert.equal(result.receipt.decision, "preflight_verified");
    assert.equal(result.receipt.execution_allowed, false);
    assert.equal(result.receipt.deployment_authorized, false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
