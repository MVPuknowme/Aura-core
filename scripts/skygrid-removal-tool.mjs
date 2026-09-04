#!/usr/bin/env node
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_MAP_PATH = "config/skygrid-removal-map.v1.json";

export function parseArgs(argv = []) {
  const args = {
    mode: "dry-run",
    target: "all",
    mapPath: DEFAULT_MAP_PATH,
    includeGuardedDeletes: false,
    receipt: true,
    approved: false,
    help: false
  };

  for (const arg of argv) {
    if (arg === "--apply") args.mode = "apply";
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--include-guarded-deletes") args.includeGuardedDeletes = true;
    else if (arg === "--no-receipt") args.receipt = false;
    else if (arg === "--approved") args.approved = true;
    else if (arg.startsWith("--target=")) args.target = arg.slice("--target=".length);
    else if (arg.startsWith("--map=")) args.mapPath = arg.slice("--map=".length);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function helpText() {
  return `SKYGRID removal tool\n\nUsage:\n  node scripts/skygrid-removal-tool.mjs [--dry-run]\n  node scripts/skygrid-removal-tool.mjs --target=vercel-public-runtime-edge --apply --approved\n\nOptions:\n  --target=<id|all>             Removal-map target. Defaults to all safe targets.\n  --map=<path>                  Removal map path. Defaults to config/skygrid-removal-map.v1.json.\n  --dry-run                     Plan only. This is the default.\n  --apply                       Apply safe rewrite/delete operations.\n  --approved                    Required with --apply. SKYGRID_REMOVAL_APPROVED=true also works.\n  --include-guarded-deletes     Allow guarded delete operations for an explicit target.\n  --no-receipt                  Do not write artifacts/removal/*.json receipt.\n`;
}

function resolveInside(repoRoot, relativePath) {
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to access path outside repo root: ${relativePath}`);
  }
  return resolved;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function loadRemovalMap(repoRoot, mapPath = DEFAULT_MAP_PATH) {
  const absolutePath = resolveInside(repoRoot, mapPath);
  const raw = await readFile(absolutePath, "utf8");
  const map = JSON.parse(raw);
  if (!map?.targets || typeof map.targets !== "object") {
    throw new Error("Removal map must contain a targets object.");
  }
  return map;
}

function selectedTargets(map, target) {
  if (target === "all") {
    return Object.entries(map.targets).filter(([, config]) => config.safe_default !== false);
  }

  const config = map.targets[target];
  if (!config) {
    const knownTargets = Object.keys(map.targets).sort().join(", ");
    throw new Error(`Unknown target: ${target}. Known targets: ${knownTargets}`);
  }
  return [[target, config]];
}

function readPathValue(root, dottedPath) {
  return String(dottedPath || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, key) => value?.[key], root);
}

function matchesShape(candidate, shape) {
  return Object.entries(shape || {}).every(([key, expected]) => candidate?.[key] === expected);
}

function matchesAny(candidate, matchAny = []) {
  return matchAny.some((shape) => matchesShape(candidate, shape));
}

async function pruneJsonArrayItems(repoRoot, op, context) {
  const absolutePath = resolveInside(repoRoot, op.path);
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  const arrayValue = readPathValue(parsed, op.array_path);

  if (!Array.isArray(arrayValue)) {
    return {
      ...context,
      status: "failed",
      error: `${op.path}:${op.array_path} is not an array`
    };
  }

  const before = arrayValue.length;
  const retained = arrayValue.filter((item) => !matchesAny(item, op.match_any));
  const removed = before - retained.length;

  if (context.mode === "apply" && removed > 0) {
    const parts = String(op.array_path).split(".").filter(Boolean);
    let cursor = parsed;
    for (const part of parts.slice(0, -1)) cursor = cursor[part];
    cursor[parts.at(-1)] = retained;
    await writeFile(absolutePath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  }

  return {
    ...context,
    status: removed > 0 ? (context.mode === "apply" ? "removed" : "would_remove") : "already_removed",
    removed
  };
}

async function assertText(repoRoot, op, context) {
  const absolutePath = resolveInside(repoRoot, op.path);
  const raw = await readFile(absolutePath, "utf8");
  const missing = (op.patterns || []).filter((pattern) => !raw.includes(pattern));

  return {
    ...context,
    status: missing.length ? "failed" : "verified",
    missing
  };
}

async function assertAbsentText(repoRoot, op, context) {
  const absolutePath = resolveInside(repoRoot, op.path);
  const raw = await readFile(absolutePath, "utf8");
  const present = (op.patterns || []).filter((pattern) => raw.includes(pattern));

  return {
    ...context,
    status: present.length ? "failed" : "verified_absent",
    present
  };
}

async function deleteFile(repoRoot, op, context) {
  const absolutePath = resolveInside(repoRoot, op.path);
  const present = await exists(absolutePath);
  if (!present) {
    return { ...context, status: "already_removed" };
  }

  const guarded = Boolean(op.guarded);
  const guardedAllowed = context.includeGuardedDeletes && context.explicitTarget && context.mode === "apply";
  if (guarded && !guardedAllowed) {
    return {
      ...context,
      status: "skipped_guarded_delete",
      reason: "guarded deletes require --target=<specific target> --include-guarded-deletes --apply --approved"
    };
  }

  if (context.mode === "apply") {
    await rm(absolutePath, { force: false });
  }

  return { ...context, status: context.mode === "apply" ? "deleted" : "would_delete" };
}

export async function applyOperation(repoRoot, op, context) {
  const operationContext = {
    target: context.target,
    mode: context.mode,
    type: op.type,
    path: op.path,
    includeGuardedDeletes: context.includeGuardedDeletes,
    explicitTarget: context.explicitTarget
  };

  if (op.type === "prune_json_array_items") return pruneJsonArrayItems(repoRoot, op, operationContext);
  if (op.type === "assert_text") return assertText(repoRoot, op, operationContext);
  if (op.type === "assert_absent_text") return assertAbsentText(repoRoot, op, operationContext);
  if (op.type === "delete_file") return deleteFile(repoRoot, op, operationContext);

  return {
    ...operationContext,
    status: "failed",
    error: `Unsupported removal operation type: ${op.type}`
  };
}

async function writeReceipt(repoRoot, receipt) {
  const receiptDir = resolveInside(repoRoot, "artifacts/removal");
  await mkdir(receiptDir, { recursive: true });
  const safeTimestamp = receipt.timestamp.replace(/[:.]/g, "-");
  const receiptPath = path.join(receiptDir, `skygrid-removal-${safeTimestamp}.json`);
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return path.relative(repoRoot, receiptPath).replaceAll(path.sep, "/");
}

export async function run(argv = process.argv.slice(2), repoRoot = process.cwd(), logger = console) {
  const args = parseArgs(argv);
  if (args.help) {
    logger.log(helpText());
    return { ok: true, help: true };
  }

  const envApproved = process.env.SKYGRID_REMOVAL_APPROVED === "true";
  if (args.mode === "apply" && !args.approved && !envApproved) {
    throw new Error("--apply requires --approved or SKYGRID_REMOVAL_APPROVED=true");
  }

  const map = await loadRemovalMap(repoRoot, args.mapPath);
  const targets = selectedTargets(map, args.target);
  const results = [];

  logger.log(`SKYGRID removal tool running in ${args.mode} mode.`);
  logger.log(`Target: ${args.target}`);

  for (const [target, config] of targets) {
    for (const op of config.operations || []) {
      const result = await applyOperation(repoRoot, op, {
        target,
        mode: args.mode,
        includeGuardedDeletes: args.includeGuardedDeletes,
        explicitTarget: args.target !== "all"
      });
      results.push(result);
      logger.log(`${result.status} ${target} ${op.type} ${op.path || ""}`.trim());
    }
  }

  const failures = results.filter((result) => result.status === "failed");
  const receipt = {
    ok: failures.length === 0,
    tool: map.tool || "skygrid-removal-tool",
    schema_version: map.schema_version || "unknown",
    mode: args.mode,
    target: args.target,
    timestamp: new Date().toISOString(),
    principles: map.principles || [],
    results
  };

  if (args.receipt) {
    receipt.receipt_path = await writeReceipt(repoRoot, receipt);
    logger.log(`Receipt: ${receipt.receipt_path}`);
  }

  if (failures.length) {
    const summary = failures.map((failure) => `${failure.path}: ${failure.error || JSON.stringify({ missing: failure.missing, present: failure.present })}`).join("; ");
    throw new Error(`Removal verification failed: ${summary}`);
  }

  return receipt;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  run().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}
