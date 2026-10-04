import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  REQUIRED_STEP_IDS,
  runPostBuild,
  validatePostBuildPolicy
} from "../scripts/run-pnpk-postbuild.mjs";
import { verifySwitchPreRuns } from "../scripts/verify-switch-preruns.mjs";
import { verifySolanaPlaygroundPreflight } from "../scripts/solana-playground-preflight.mjs";
import { validateAccessTransparencyPolicy } from "../scripts/pnpk-access-transparency-policy.mjs";

const root = path.resolve(import.meta.dirname, "..");
const pnpkPath = path.join(root, "bridge/skygrid-emergency-onramp.pnpk");

async function loadPnpk() {
  return JSON.parse(await readFile(pnpkPath, "utf8"));
}

test("canonical PNPK uses the fixed allowlisted post-build sequence", async () => {
  const pnpk = await loadPnpk();
  const pipeline = validatePostBuildPolicy(pnpk);
  assert.deepEqual(pipeline.steps.map((step) => step.id), REQUIRED_STEP_IDS);
  assert.equal(pipeline.arbitrary_commands_allowed, false);
  assert.equal(pipeline.fail_closed, true);
});

test("access transparency is receipt-only, particularized, and fail-closed", async () => {
  const pnpk = await loadPnpk();
  const policy = validateAccessTransparencyPolicy(pnpk);
  assert.equal(policy.instrumented_boundary_only, true);
  assert.equal(policy.interception_execution_allowed, false);
  assert.equal(policy.receipt_content_policy.call_or_message_content_allowed, false);
  assert.equal(policy.ambiguous_or_overbroad_behavior, "fail_closed_no_access");
  assert.ok(policy.receipt_events.includes("tamper_detected"));
  assert.ok(policy.receipt_events.includes("interception_requested"));
  assert.ok(policy.required_authority_fields.includes("target_scope"));
  assert.ok(policy.required_authority_fields.includes("expires_at"));
});

test("access transparency rejects universal-detection and content-capture claims", async () => {
  const pnpk = await loadPnpk();
  pnpk.access_transparency.instrumented_boundary_only = false;
  assert.throws(
    () => validateAccessTransparencyPolicy(pnpk),
    /limited to instrumented trust boundaries/
  );

  pnpk.access_transparency.instrumented_boundary_only = true;
  pnpk.access_transparency.receipt_content_policy.call_or_message_content_allowed = true;
  assert.throws(
    () => validateAccessTransparencyPolicy(pnpk),
    /call or message content must not be stored/
  );
});

test("post-build policy rejects embedded commands", async () => {
  const pnpk = await loadPnpk();
  pnpk.post_build_pipeline.steps[0].command = "echo unsafe";
  assert.throws(
    () => validatePostBuildPolicy(pnpk),
    /executable or unsupported fields/
  );
});

test("access policy rejects network identity receipts and direct delivery fallback", async () => {
  const pnpk = await loadPnpk();
  pnpk.access_transparency.receipt_content_policy.network_identifiers_allowed = true;
  assert.throws(() => validateAccessTransparencyPolicy(pnpk), /network identifiers/);
  pnpk.access_transparency.receipt_content_policy.network_identifiers_allowed = false;
  pnpk.access_transparency.receipt_delivery_policy.direct_network_fallback_allowed = true;
  assert.throws(() => validateAccessTransparencyPolicy(pnpk), /without direct fallback/);
});

test("post-build policy rejects missing or reordered required steps", async () => {
  const pnpk = await loadPnpk();
  pnpk.post_build_pipeline.steps.reverse();
  assert.throws(
    () => validatePostBuildPolicy(pnpk),
    /fixed required order/
  );
});

test("Ethernet and Allbridge Core pre-runs hold selection without live status", async () => {
  const pnpk = await loadPnpk();
  const report = await verifySwitchPreRuns(pnpk, {
    interfaces: {
      Ethernet: [{ internal: false, family: "IPv4" }]
    },
    allbridgeStatusUrl: ""
  });
  assert.equal(report.ok, true);
  assert.equal(report.ethernet.presence_verified, true);
  assert.equal(report.allbridge_core.selectable, false);
  assert.equal(report.decision, "hold_candidate");
});

test("Ethernet and healthy Allbridge Core status make the candidate selectable", async () => {
  const pnpk = await loadPnpk();
  const report = await verifySwitchPreRuns(pnpk, {
    interfaces: {
      eth0: [{ internal: false, family: "IPv4" }]
    },
    allbridgeStatusUrl: "https://allbridge.example.test/status",
    fetchImpl: async () => ({
      status: 200,
      async json() { return { ok: true }; }
    })
  });
  assert.equal(report.selection_ready, true);
  assert.equal(report.decision, "candidate_verified");
});

test("Solana Playground preflight is safe while a build artifact is pending", async () => {
  const pnpk = await loadPnpk();
  const isolatedRoot = await mkdtemp(path.join(tmpdir(), "pnpk-solana-"));
  try {
    const report = await verifySolanaPlaygroundPreflight(pnpk, {
      root: isolatedRoot,
      artifactPath: ""
    });
    assert.equal(report.ok, true);
    assert.equal(report.artifact.present, false);
    assert.equal(report.playground_validation_ready, false);
    assert.equal(report.deployment_ready, false);
    assert.equal(report.decision, "policy_verified_artifact_pending");
  } finally {
    await rm(isolatedRoot, { recursive: true, force: true });
  }
});

test("runner writes a hashed receipt after every allowlisted step passes", async () => {
  const receiptRoot = await mkdtemp(path.join(tmpdir(), "pnpk-postbuild-"));
  const receiptPath = path.join(receiptRoot, "receipt.json");
  const executed = [];
  try {
    const result = await runPostBuild({
      root,
      pnpkPath,
      receiptPath,
      executeStep: async (id) => {
        executed.push(id);
        return { ok: true, exit_code: 0, timed_out: false, stdout: "", stderr: "" };
      }
    });
    assert.deepEqual(executed, REQUIRED_STEP_IDS);
    assert.equal(result.receipt.ok, true);
    assert.match(result.receipt.pnpk_sha256, /^sha256:[a-f0-9]{64}$/);
    const stored = JSON.parse(await readFile(receiptPath, "utf8"));
    assert.equal(stored.decision, "postbuild_verified");
  } finally {
    await rm(receiptRoot, { recursive: true, force: true });
  }
});

test("runner stops at the first failed step and writes a fail-closed receipt", async () => {
  const receiptRoot = await mkdtemp(path.join(tmpdir(), "pnpk-postbuild-fail-"));
  const receiptPath = path.join(receiptRoot, "receipt.json");
  const executed = [];
  try {
    await assert.rejects(
      runPostBuild({
        root,
        pnpkPath,
        receiptPath,
        executeStep: async (id) => {
          executed.push(id);
          return {
            ok: id !== "autodrill_simulation",
            exit_code: id === "autodrill_simulation" ? 1 : 0,
            timed_out: false,
            stdout: "",
            stderr: ""
          };
        }
      }),
      /failed closed at autodrill_simulation/
    );
    assert.deepEqual(executed, REQUIRED_STEP_IDS.slice(0, 3));
    const stored = JSON.parse(await readFile(receiptPath, "utf8"));
    assert.equal(stored.ok, false);
    assert.equal(stored.decision, "fail_closed");
  } finally {
    await rm(receiptRoot, { recursive: true, force: true });
  }
});

test("runner removes private output and extra fields and repairs existing receipt permissions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pnpk-private-"));
  const receiptPath = path.join(directory, "receipt.json");
  try {
    await writeFile(receiptPath, "old", { mode: 0o644 });
    const result = await runPostBuild({ root, pnpkPath, receiptPath,
      executeStep: async () => ({ ok: true, exit_code: 0, timed_out: false,
        stdout: "secret token", stderr: "private IP", secret: "private key",
        id: "spoofed", decision: "unsafe" }) });
    const raw = await readFile(receiptPath, "utf8");
    for (const forbidden of ["secret token", "private IP", "private key", "spoofed", "unsafe", "stdout", "stderr"]) {
      assert.equal(raw.includes(forbidden), false);
    }
    assert.deepEqual(result.receipt.steps.map(step => step.id), REQUIRED_STEP_IDS);
    if (process.platform !== "win32") assert.equal((await stat(receiptPath)).mode & 0o777, 0o600);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("runner denies malformed success and receipts a thrown step without its exception", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pnpk-failure-"));
  try {
    for (const result of [{ ok: "true", exit_code: 0, timed_out: false },
      { ok: true, exit_code: 1, timed_out: false }, { ok: true, exit_code: 0, timed_out: true }, null]) {
      const receiptPath = path.join(directory, "receipt.json");
      await assert.rejects(runPostBuild({ root, pnpkPath, receiptPath,
        executeStep: async () => result }), /failed closed/);
      assert.equal(JSON.parse(await readFile(receiptPath)).steps.length, 1);
    }
    const receiptPath = path.join(directory, "receipt.json");
    await assert.rejects(runPostBuild({ root, pnpkPath, receiptPath,
      executeStep: async () => { throw new Error("secret credential"); } }), /failed closed/);
    assert.equal((await readFile(receiptPath, "utf8")).includes("secret credential"), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("runner refuses symlink receipt destinations", { skip: process.platform === "win32" }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "pnpk-symlink-"));
  try {
    const target = path.join(directory, "target.json");
    const receiptPath = path.join(directory, "receipt.json");
    await writeFile(target, "unchanged");
    await symlink(target, receiptPath);
    await assert.rejects(runPostBuild({ root, pnpkPath, receiptPath,
      executeStep: async () => ({ ok: true, exit_code: 0, timed_out: false }) }));
    assert.equal(await readFile(target, "utf8"), "unchanged");
  } finally { await rm(directory, { recursive: true, force: true }); }
});
