import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const SCHEMA_VERSION = "1.0";

function ledgerRoot() {
  return process.env.SKYGRID_ENROLLMENT_LEDGER_DIR
    ? path.resolve(process.env.SKYGRID_ENROLLMENT_LEDGER_DIR)
    : null;
}

function recordPath(root, enrollmentId) {
  return path.join(root, `${enrollmentId}.json`);
}

function lockPath(root, enrollmentId) {
  return path.join(root, `${enrollmentId}.lock`);
}

async function ensureRoot(root) {
  if (!root) throw new Error("enrollment_ledger_not_configured");
  await mkdir(root, { recursive: true });
}

async function readRecord(root, enrollmentId) {
  try {
    return JSON.parse(await readFile(recordPath(root, enrollmentId), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeRecordAtomic(root, enrollmentId, record) {
  const target = recordPath(root, enrollmentId);
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx"
  });
  await rename(temporary, target);
}

export function enrollmentLedgerStatus() {
  const root = ledgerRoot();
  const hostedServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return {
    configured: Boolean(root),
    adapter: root ? "atomic_filesystem" : "disabled",
    root,
    durable_for_local_pilot: Boolean(root),
    production_ready: Boolean(root) && !hostedServerless,
    hosted_serverless: hostedServerless
  };
}

export async function createEnrollmentRecord(payload, clock = Date.now) {
  const root = ledgerRoot();
  await ensureRoot(root);

  const record = {
    schema_version: SCHEMA_VERSION,
    enrollment_id: payload.jti,
    organization_id: payload.organization_id,
    engineer_email: payload.engineer_email,
    deployment_profile: payload.deployment_profile,
    allowed_platforms: payload.allowed_platforms,
    issued_at: new Date(payload.iat * 1000).toISOString(),
    expires_at: new Date(payload.exp * 1000).toISOString(),
    maximum_uses: 1,
    use_count: 0,
    lifecycle_state: "issued",
    created_at: new Date(clock()).toISOString()
  };

  await ensureRoot(root);
  try {
    await writeFile(recordPath(root, payload.jti), `${JSON.stringify(record, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error("enrollment_record_already_exists");
    throw error;
  }
  return record;
}

export async function getEnrollmentRecord(enrollmentId) {
  const root = ledgerRoot();
  await ensureRoot(root);
  return readRecord(root, enrollmentId);
}

export async function redeemEnrollmentRecord(enrollmentId, details = {}, clock = Date.now) {
  const root = ledgerRoot();
  await ensureRoot(root);
  const lock = lockPath(root, enrollmentId);

  try {
    await mkdir(lock);
  } catch (error) {
    if (error?.code === "EEXIST") {
      return { ok: false, reason: "enrollment_redemption_in_progress" };
    }
    throw error;
  }

  try {
    const record = await readRecord(root, enrollmentId);
    if (!record) return { ok: false, reason: "enrollment_record_not_found" };
    if (record.lifecycle_state === "redeemed" || Number(record.use_count || 0) >= 1) {
      return { ok: false, reason: "enrollment_link_already_redeemed", record };
    }
    if (record.lifecycle_state !== "issued") {
      return { ok: false, reason: "enrollment_not_issuable", record };
    }
    if (clock() >= Date.parse(record.expires_at)) {
      return { ok: false, reason: "enrollment_link_expired", record };
    }

    const redeemedAt = new Date(clock()).toISOString();
    const updated = {
      ...record,
      lifecycle_state: "redeemed",
      use_count: 1,
      redeemed_at: redeemedAt,
      redemption: {
        platform: details.platform || null,
        receipt_id: details.receipt_id || null
      }
    };
    await writeRecordAtomic(root, enrollmentId, updated);
    return { ok: true, record: updated };
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
