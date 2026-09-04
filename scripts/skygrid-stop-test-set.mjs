#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG_PATH = "config/skygrid-stop-test-set.v1.json";

export function parseArgs(argv = []) {
  const args = {
    mode: "dry-run",
    approved: false,
    configPath: DEFAULT_CONFIG_PATH,
    noReceipt: false,
    help: false
  };

  for (const arg of argv) {
    if (arg === "--apply") args.mode = "apply";
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--approved") args.approved = true;
    else if (arg === "--no-receipt") args.noReceipt = true;
    else if (arg.startsWith("--config=")) args.configPath = arg.slice("--config=".length);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function helpText() {
  return `SKYGRID stop test set\n\nUsage:\n  node scripts/skygrid-stop-test-set.mjs --dry-run\n  node scripts/skygrid-stop-test-set.mjs --apply --approved\n\nOptions:\n  --config=<path>  Config path. Defaults to ${DEFAULT_CONFIG_PATH}.\n  --dry-run        Verify stop posture and write a dry-run receipt. Default.\n  --apply          Write an approved stop receipt. No network or cloud actions run.\n  --approved       Required with --apply. SKYGRID_STOP_TEST_SET_APPROVED=true also works.\n  --no-receipt     Skip receipt writing.\n`;
}

function resolveInside(repoRoot, relativePath) {
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to access path outside repo root: ${relativePath}`);
  }
  return resolved;
}

export async function loadStopTestSet(repoRoot, configPath = DEFAULT_CONFIG_PATH) {
  const absolutePath = resolveInside(repoRoot, configPath);
  const raw = await readFile(absolutePath, "utf8");
  const profile = JSON.parse(raw);
  if (!profile?.stop_set || !Array.isArray(profile.checks) || !profile?.control_plane) {
    throw new Error("Stop test set config is missing stop_set, checks, or control_plane.");
  }
  return profile;
}

export function readDottedPath(root, dottedPath) {
  return String(dottedPath || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => value?.[key], root);
}

function valuesEqual(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function assertBlockedActions(profile, actions = []) {
  const blocked = new Set(profile.stop_set.blocked_actions || []);
  const missing = actions.filter((action) => !blocked.has(action));
  const accidentallyAllowed = actions.filter((action) => (profile.stop_set.allowed_actions || []).includes(action));
  return { ok: missing.length === 0 && accidentallyAllowed.length === 0, missing, accidentallyAllowed };
}

export function runChecks(profile) {
  const results = [];

  for (const check of profile.checks) {
    if (check.type === "assert_value") {
      const actual = readDottedPath(profile, check.path);
      results.push({
        id: check.id,
        type: check.type,
        status: valuesEqual(actual, check.equals) ? "verified" : "failed",
        path: check.path,
        expected: check.equals,
        actual
      });
      continue;
    }

    if (check.type === "assert_blocked_actions") {
      const result = assertBlockedActions(profile, check.actions || []);
      results.push({
        id: check.id,
        type: check.type,
        status: result.ok ? "verified_blocked" : "failed",
        actions: check.actions || [],
        missing: result.missing,
        accidentally_allowed: result.accidentallyAllowed
      });
      continue;
    }

    if (check.type === "write_receipt") {
      results.push({
        id: check.id,
        type: check.type,
        status: "receipt_planned",
        required: Boolean(check.required)
      });
      continue;
    }

    results.push({
      id: check.id || "unknown-check",
      type: check.type || "unknown",
      status: "failed",
      error: `Unsupported stop test check type: ${check.type}`
    });
  }

  return results;
}

async function writeReceipt(repoRoot, profile, receipt) {
  const namespace = profile.receipt_namespace || "artifacts/stop-test-set";
  const receiptDir = resolveInside(repoRoot, namespace);
  await mkdir(receiptDir, { recursive: true });
  const safeTimestamp = receipt.timestamp.replace(/[:.]/g, "-");
  const receiptPath = path.join(receiptDir, `skygrid-stop-test-set-${safeTimestamp}.json`);
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return path.relative(repoRoot, receiptPath).replaceAll(path.sep, "/");
}

export async function run(argv = process.argv.slice(2), repoRoot = process.cwd(), env = process.env, logger = console) {
  const args = parseArgs(argv);
  if (args.help) {
    logger.log(helpText());
    return { ok: true, help: true };
  }

  const envApproved = env.SKYGRID_STOP_TEST_SET_APPROVED === "true";
  if (args.mode === "apply" && !args.approved && !envApproved) {
    throw new Error("--apply requires --approved or SKYGRID_STOP_TEST_SET_APPROVED=true");
  }

  const profile = await loadStopTestSet(repoRoot, args.configPath);
  const results = runChecks(profile);
  const failures = results.filter((result) => result.status === "failed");

  const receipt = {
    ok: failures.length === 0,
    tool: profile.tool || "skygrid-stop-test-set",
    schema_version: profile.schema_version || "unknown",
    mode: args.mode,
    timestamp: new Date().toISOString(),
    control_plane: profile.control_plane,
    principles: profile.principles || [],
    allowed_actions: profile.stop_set.allowed_actions || [],
    blocked_actions: profile.stop_set.blocked_actions || [],
    results,
    boundary: profile.boundary || "Stop test set does not transmit removal payloads or mutate remote resources."
  };

  logger.log(`SKYGRID stop test set running in ${args.mode} mode.`);
  logger.log(`Control plane: ${profile.control_plane?.repository || "unknown"} / ${profile.control_plane?.branch || "unknown"}`);
  logger.log("Network emission: stopped");
  logger.log("Remote removal: stopped");

  for (const result of results) {
    logger.log(`${result.status} ${result.id}`);
  }

  if (!args.noReceipt) {
    receipt.receipt_path = await writeReceipt(repoRoot, profile, receipt);
    logger.log(`Receipt: ${receipt.receipt_path}`);
  }

  if (failures.length) {
    const summary = failures.map((failure) => `${failure.id}: ${failure.error || JSON.stringify({ path: failure.path, missing: failure.missing, accidentally_allowed: failure.accidentally_allowed, actual: failure.actual })}`).join("; ");
    throw new Error(`SKYGRID stop test set failed closed: ${summary}`);
  }

  return receipt;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  run().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
