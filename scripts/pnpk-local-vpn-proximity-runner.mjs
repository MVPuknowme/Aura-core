#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CONFIG_PATH = "config/pnpk-local-vpn-proximity.v1.json";

export function parseArgs(argv = []) {
  const args = {
    mode: "dry-run",
    approved: false,
    configPath: DEFAULT_CONFIG_PATH,
    radiusMiles: null,
    shape: null,
    noReceipt: false,
    help: false
  };

  for (const arg of argv) {
    if (arg === "--apply") args.mode = "apply";
    else if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--approved") args.approved = true;
    else if (arg === "--no-receipt") args.noReceipt = true;
    else if (arg.startsWith("--config=")) args.configPath = arg.slice("--config=".length);
    else if (arg.startsWith("--radius-miles=")) args.radiusMiles = Number(arg.slice("--radius-miles=".length));
    else if (arg.startsWith("--shape=")) args.shape = arg.slice("--shape=".length);
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function helpText() {
  return `PNPK local VPN proximity runner\n\nUsage:\n  node scripts/pnpk-local-vpn-proximity-runner.mjs --dry-run\n  node scripts/pnpk-local-vpn-proximity-runner.mjs --apply --approved\n\nOptions:\n  --config=<path>          Config path. Defaults to ${DEFAULT_CONFIG_PATH}.\n  --radius-miles=<number>  Override declared proximity radius. Must not exceed config cap.\n  --shape=<radius_square>  Override geometry label.\n  --dry-run                Plan only. Default.\n  --apply                  Write an apply receipt. Does not scan networks or mutate cloud state.\n  --approved               Required with --apply. SKYGRID_PNPK_PROXIMITY_APPROVED=true also works.\n  --no-receipt             Skip receipt writing.\n`;
}

function resolveInside(repoRoot, relativePath) {
  const root = path.resolve(repoRoot);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to access path outside repo root: ${relativePath}`);
  }
  return resolved;
}

export async function loadProfile(repoRoot, configPath = DEFAULT_CONFIG_PATH) {
  const absolutePath = resolveInside(repoRoot, configPath);
  const raw = await readFile(absolutePath, "utf8");
  const profile = JSON.parse(raw);
  if (!profile?.proximity || !profile?.vpn || !Array.isArray(profile.checks)) {
    throw new Error("PNPK local VPN proximity profile is missing proximity, vpn, or checks.");
  }
  return profile;
}

function isIpv4PrivateOrLoopback(cidr) {
  const [address] = String(cidr).split("/");
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

  if (parts[0] === 127) return true;
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function isIpv6Local(cidr) {
  const lower = String(cidr).toLowerCase();
  return lower.startsWith("fd") || lower.startsWith("fe80:") || lower === "::1/128" || lower === "::1";
}

export function isPrivateOrLoopbackCidr(cidr) {
  if (!cidr || typeof cidr !== "string") return false;
  if (cidr.includes(":")) return isIpv6Local(cidr);
  return isIpv4PrivateOrLoopback(cidr);
}

export function buildProximityMetrics(radiusMiles, geometry = "radius_square") {
  if (!Number.isFinite(radiusMiles) || radiusMiles <= 0) {
    throw new Error(`Invalid radius_miles: ${radiusMiles}`);
  }

  const radiusSquaredMiles = Number((radiusMiles * radiusMiles).toFixed(6));
  const boundingBoxSideMiles = Number((radiusMiles * 2).toFixed(6));
  const boundingBoxAreaSquareMiles = Number((boundingBoxSideMiles * boundingBoxSideMiles).toFixed(6));

  return {
    geometry,
    radius_miles: radiusMiles,
    radius_squared_miles: radiusSquaredMiles,
    bounding_box_side_miles: boundingBoxSideMiles,
    bounding_box_area_square_miles: boundingBoxAreaSquareMiles
  };
}

function validateBlockedActions(profile) {
  const requiredBlocks = ["public_ip_scan", "device_discovery", "person_tracking", "wifi_probe", "bluetooth_probe", "gps_collection"];
  const blocked = new Set(profile.blocked_actions || []);
  const missing = requiredBlocks.filter((action) => !blocked.has(action));
  if (missing.length) {
    throw new Error(`Profile is missing required blocked actions: ${missing.join(", ")}`);
  }
}

function runChecks(profile, args, env) {
  const radiusMiles = args.radiusMiles ?? Number(profile.proximity.radius_miles);
  const geometry = args.shape ?? profile.proximity.geometry;
  const metrics = buildProximityMetrics(radiusMiles, geometry);
  const vpnCidr = env.SKYGRID_LOCAL_VPN_CIDR || "";
  const anchorLabel = env.SKYGRID_PNPK_ANCHOR_LABEL || profile.proximity.anchor_source || "operator_declared_local_anchor";

  validateBlockedActions(profile);

  const results = [];
  for (const check of profile.checks) {
    if (check.type === "assert_private_or_loopback_cidr") {
      const ok = isPrivateOrLoopbackCidr(vpnCidr);
      results.push({
        id: check.id,
        type: check.type,
        status: ok ? "verified" : "failed",
        env: check.env,
        value_present: Boolean(vpnCidr),
        reason: ok ? "VPN CIDR is private or loopback." : "Set SKYGRID_LOCAL_VPN_CIDR to a private or loopback CIDR before running proximity proof."
      });
    } else if (check.type === "assert_radius_at_or_below_miles") {
      const ok = metrics.radius_miles <= Number(check.max_miles);
      results.push({
        id: check.id,
        type: check.type,
        status: ok ? "verified" : "failed",
        max_miles: Number(check.max_miles),
        radius_miles: metrics.radius_miles
      });
    } else if (check.type === "write_receipt") {
      results.push({
        id: check.id,
        type: check.type,
        status: "planned",
        required: Boolean(check.required)
      });
    } else {
      results.push({
        id: check.id || "unknown",
        type: check.type || "unknown",
        status: "failed",
        reason: `Unsupported check type: ${check.type}`
      });
    }
  }

  return {
    radiusMiles,
    geometry,
    metrics,
    vpnCidr,
    anchorLabel,
    results
  };
}

async function writeReceipt(repoRoot, profile, args, proof) {
  const namespace = profile.pnpk?.receipt_namespace || "artifacts/pnpk/proximity";
  const receiptDir = resolveInside(repoRoot, namespace);
  await mkdir(receiptDir, { recursive: true });
  const timestamp = new Date().toISOString();
  const safeTimestamp = timestamp.replace(/[:.]/g, "-");
  const receiptPath = path.join(receiptDir, `pnpk-local-vpn-proximity-${safeTimestamp}.json`);
  const failures = proof.results.filter((result) => result.status === "failed");

  const receipt = {
    ok: failures.length === 0,
    profile: profile.profile,
    schema_version: profile.schema_version,
    mode: args.mode,
    timestamp,
    principles: profile.principles || [],
    proximity: proof.metrics,
    anchor_label: proof.anchorLabel,
    vpn: {
      mode: profile.vpn?.mode || "local_vpn_only",
      cidr_present: Boolean(proof.vpnCidr),
      cidr_class: isPrivateOrLoopbackCidr(proof.vpnCidr) ? "private_or_loopback" : "invalid_or_public"
    },
    pnpk: profile.pnpk || {},
    blocked_actions: profile.blocked_actions || [],
    results: proof.results,
    boundary: "This receipt proves local configuration posture only. It does not scan networks, locate people/devices, mutate cloud resources, change DNS, delete secrets, or move funds."
  };

  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  return { receipt, receiptPath: path.relative(repoRoot, receiptPath).replaceAll(path.sep, "/") };
}

export async function run(argv = process.argv.slice(2), repoRoot = process.cwd(), env = process.env, logger = console) {
  const args = parseArgs(argv);
  if (args.help) {
    logger.log(helpText());
    return { ok: true, help: true };
  }

  const envApproved = env.SKYGRID_PNPK_PROXIMITY_APPROVED === "true";
  if (args.mode === "apply" && !args.approved && !envApproved) {
    throw new Error("--apply requires --approved or SKYGRID_PNPK_PROXIMITY_APPROVED=true");
  }

  const profile = await loadProfile(repoRoot, args.configPath);
  const proof = runChecks(profile, args, env);
  const failures = proof.results.filter((result) => result.status === "failed");

  logger.log(`PNPK local VPN proximity runner: ${args.mode}`);
  logger.log(`Radius: ${proof.metrics.radius_miles} miles; R^2: ${proof.metrics.radius_squared_miles}; square area: ${proof.metrics.bounding_box_area_square_miles} sq mi`);
  logger.log(`VPN CIDR present: ${Boolean(proof.vpnCidr)}`);
  logger.log("Network actions: none; cloud actions: none; scan actions: blocked.");

  for (const result of proof.results) {
    logger.log(`${result.status} ${result.id}`);
  }

  let receiptInfo = null;
  if (!args.noReceipt) {
    receiptInfo = await writeReceipt(repoRoot, profile, args, proof);
    logger.log(`Receipt: ${receiptInfo.receiptPath}`);
  }

  if (failures.length) {
    const summary = failures.map((failure) => `${failure.id}: ${failure.reason || failure.status}`).join("; ");
    throw new Error(`PNPK local VPN proximity verification failed: ${summary}`);
  }

  return {
    ok: true,
    mode: args.mode,
    proximity: proof.metrics,
    receipt_path: receiptInfo?.receiptPath || null,
    results: proof.results
  };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  run().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}
