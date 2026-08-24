import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  REQUIRED_STEP_IDS,
  runPostBuild,
  validatePostBuildPolicy
} from "../scripts/run-pnpk-postbuild.mjs";
import { verifySwitchPreRuns } from "../scripts/verify-switch-preruns.mjs";
import { verifySolanaPlaygroundPreflight } from "../scripts/solana-playground-preflight.mjs";

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

test("post-build policy rejects embedded commands", async () => {
  const pnpk = await loadPnpk();
  pnpk.post_build_pipeline.steps[0].command = "echo unsafe";
  assert.throws(
    () => validatePostBuildPolicy(pnpk),
    /executable or unsupported fields/
  );
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
