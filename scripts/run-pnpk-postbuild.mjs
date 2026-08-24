import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_PNPK_PATH = "bridge/skygrid-emergency-onramp.pnpk";
const REQUIRED_RECEIPT_PATH = "artifacts/pnpk/proofs/postbuild-latest.json";
const OUTPUT_LIMIT = 64 * 1024;

export const REQUIRED_STEP_IDS = Object.freeze([
  "pnpk_validate",
  "switch_prerun_verify",
  "autodrill_simulation",
  "capacity_lease_contract",
  "solana_playground_preflight"
]);

const STEP_REGISTRY = Object.freeze({
  pnpk_validate: ["scripts/validate-pnpk.mjs"],
  switch_prerun_verify: ["scripts/verify-switch-preruns.mjs"],
  autodrill_simulation: ["scripts/skygrid-autodrill-sim.mjs"],
  capacity_lease_contract: ["--test", "tests/skygrid-capacity-lease.test.mjs"],
  solana_playground_preflight: ["scripts/solana-playground-preflight.mjs"]
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validatePostBuildPolicy(pnpk) {
  assert(pnpk?.pnpk_version === "1.2.0", "PNPK runtime policy version must be 1.2.0");
  assert(pnpk?.pnpk_profile === "runtime-policy", "PNPK profile must be runtime-policy");
  assert(pnpk?.mode === "controlled_pilot", "PNPK mode must be controlled_pilot");
  assert(pnpk?.sentinel === "fail_closed", "PNPK sentinel must be fail_closed");

  const pipeline = pnpk.post_build_pipeline;
  assert(pipeline?.enabled === true, "PNPK post-build pipeline must be enabled");
  assert(pipeline.trigger === "post_build", "PNPK post-build trigger must be post_build");
  assert(
    pipeline.profile === "solana_playground_preflight",
    "PNPK post-build profile must be solana_playground_preflight"
  );
  assert(
    pipeline.execution_model === "allowlisted_local_scripts_only",
    "PNPK post-build execution model must be allowlisted_local_scripts_only"
  );
  assert(
    pipeline.arbitrary_commands_allowed === false,
    "PNPK post-build pipeline cannot allow arbitrary commands"
  );
  assert(pipeline.fail_closed === true, "PNPK post-build pipeline must fail closed");
  assert(
    pipeline.receipt_path === REQUIRED_RECEIPT_PATH,
    `PNPK post-build receipt path must be ${REQUIRED_RECEIPT_PATH}`
  );
  assert(Array.isArray(pipeline.steps), "PNPK post-build steps must be an array");

  const stepIds = pipeline.steps.map((step) => {
    assert(step && typeof step === "object" && !Array.isArray(step), "invalid PNPK post-build step");
    const fields = Object.keys(step);
    assert(
      fields.every((field) => field === "id" || field === "required"),
      `PNPK post-build step ${step.id || "unknown"} contains executable or unsupported fields`
    );
    assert(step.required === true, `PNPK post-build step ${step.id || "unknown"} must be required`);
    assert(STEP_REGISTRY[step.id], `PNPK post-build step ${step.id || "unknown"} is not allowlisted`);
    return step.id;
  });

  assert(
    stepIds.join("|") === REQUIRED_STEP_IDS.join("|"),
    "PNPK post-build steps must match the fixed required order"
  );

  return pipeline;
}

function appendLimited(current, chunk) {
  if (current.length >= OUTPUT_LIMIT) return current;
  return (current + String(chunk)).slice(0, OUTPUT_LIMIT);
}

function childEnvironment(pnpkPath) {
  const env = {
    CI: "true",
    PNPK_PATH: pnpkPath,
    TZ: "UTC"
  };
  for (const key of [
    "SystemRoot",
    "WINDIR",
    "ComSpec",
    "PATHEXT",
    "PATH",
    "TMP",
    "TEMP",
    "ALLBRIDGE_CORE_STATUS_URL",
    "PNPK_SOLANA_BUILD_ARTIFACT"
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

async function spawnAllowlistedStep(stepId, { root, pnpkPath }) {
  const args = STEP_REGISTRY[stepId];
  if (!args) throw new Error(`step ${stepId} is not allowlisted`);

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      shell: false,
      windowsHide: true,
      env: childEnvironment(pnpkPath),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 30_000);

    child.stdout.on("data", (chunk) => { stdout = appendLimited(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = appendLimited(stderr, chunk); });
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolve({
        ok: false,
        exit_code: null,
        timed_out: timedOut,
        stdout,
        stderr: appendLimited(stderr, error.message)
      });
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({
        ok: code === 0 && !timedOut,
        exit_code: code,
        timed_out: timedOut,
        stdout,
        stderr
      });
    });
  });
}

export async function runPostBuild({
  root = REPO_ROOT,
  pnpkPath = path.join(root, DEFAULT_PNPK_PATH),
  receiptPath,
  executeStep = spawnAllowlistedStep,
  now = () => new Date().toISOString()
} = {}) {
  const absolutePnpkPath = path.resolve(pnpkPath);
  const raw = await readFile(absolutePnpkPath, "utf8");
  const pnpk = JSON.parse(raw);
  const pipeline = validatePostBuildPolicy(pnpk);
  const absoluteReceiptPath = path.resolve(
    receiptPath || path.join(root, pipeline.receipt_path)
  );
  const startedAt = now();
  const results = [];

  for (const step of pipeline.steps) {
    const stepStartedAt = now();
    const result = await executeStep(step.id, {
      root,
      pnpkPath: absolutePnpkPath
    });
    results.push({
      id: step.id,
      required: true,
      started_at: stepStartedAt,
      completed_at: now(),
      ...result
    });
    if (!result.ok) break;
  }

  const ok = results.length === pipeline.steps.length && results.every((result) => result.ok);
  const receipt = {
    receipt_type: "pnpk_postbuild",
    receipt_version: "1.0.0",
    service: pnpk.service,
    pnpk_version: pnpk.pnpk_version,
    pnpk_profile: pnpk.pnpk_profile,
    pnpk_sha256: `sha256:${createHash("sha256").update(raw).digest("hex")}`,
    mode: pnpk.mode,
    sentinel: pnpk.sentinel,
    profile: pipeline.profile,
    started_at: startedAt,
    completed_at: now(),
    ok,
    decision: ok ? "postbuild_verified" : "fail_closed",
    steps: results
  };

  await mkdir(path.dirname(absoluteReceiptPath), { recursive: true });
  await writeFile(absoluteReceiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600
  });

  if (!ok) {
    const failed = results.find((result) => !result.ok)?.id || "missing_step";
    const error = new Error(`PNPK post-build failed closed at ${failed}`);
    error.receipt = receipt;
    throw error;
  }

  return { receipt, receiptPath: absoluteReceiptPath };
}

async function main() {
  try {
    const result = await runPostBuild();
    console.log(JSON.stringify({
      ok: true,
      decision: result.receipt.decision,
      profile: result.receipt.profile,
      receipt: path.relative(REPO_ROOT, result.receiptPath),
      steps: result.receipt.steps.map((step) => ({ id: step.id, ok: step.ok }))
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      decision: "fail_closed",
      reason: String(error?.message || error)
    }, null, 2));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
