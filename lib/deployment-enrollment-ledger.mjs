import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { dynamoConfiguration, dynamoRequest } from "./skygrid-dynamodb-client.mjs";

const SCHEMA_VERSION = "1.0";

function filesystemRoot() {
  return process.env.SKYGRID_ENROLLMENT_LEDGER_DIR
    ? path.resolve(process.env.SKYGRID_ENROLLMENT_LEDGER_DIR)
    : null;
}

function provider() {
  const dynamo = dynamoConfiguration();
  if (dynamo.configured) return "dynamodb";
  if (filesystemRoot()) return "atomic_filesystem";
  return "disabled";
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

async function readFilesystemRecord(root, enrollmentId) {
  try {
    return JSON.parse(await readFile(recordPath(root, enrollmentId), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function baseRecord(payload, clock = Date.now) {
  return {
    schema_version: SCHEMA_VERSION,
    enrollment_id: payload.jti,
    organization_id: payload.organization_id,
    engineer_email: payload.engineer_email,
    deployment_profile: payload.deployment_profile,
    allowed_platforms: payload.allowed_platforms,
    issued_at: new Date(payload.iat * 1000).toISOString(),
    expires_at: new Date(payload.exp * 1000).toISOString(),
    expires_epoch: payload.exp,
    maximum_uses: 1,
    use_count: 0,
    lifecycle_state: "issued",
    created_at: new Date(clock()).toISOString()
  };
}

function dynamoItem(record) {
  return {
    enrollment_id: { S: record.enrollment_id },
    lifecycle_state: { S: record.lifecycle_state },
    use_count: { N: String(record.use_count) },
    expires_epoch: { N: String(record.expires_epoch) },
    record_json: { S: JSON.stringify(record) }
  };
}

function recordFromDynamo(item) {
  if (!item?.record_json?.S) return null;
  return JSON.parse(item.record_json.S);
}

function isConditionalFailure(error) {
  return error?.name === "ConditionalCheckFailedException" ||
    String(error?.details?.__type || "").includes("ConditionalCheckFailedException");
}

export function enrollmentLedgerStatus() {
  const adapter = provider();
  const dynamo = dynamoConfiguration();
  const hostedServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  return {
    configured: adapter !== "disabled",
    adapter,
    root: filesystemRoot(),
    table_name: dynamo.table_name,
    region: dynamo.region,
    durable_for_local_pilot: adapter === "atomic_filesystem" || adapter === "dynamodb",
    production_ready: adapter === "dynamodb",
    hosted_serverless: hostedServerless
  };
}

export async function createEnrollmentRecord(payload, clock = Date.now) {
  const adapter = provider();
  const record = baseRecord(payload, clock);

  if (adapter === "dynamodb") {
    const tableName = dynamoConfiguration().table_name;
    try {
      await dynamoRequest("DynamoDB_20120810.PutItem", {
        TableName: tableName,
        Item: dynamoItem(record),
        ConditionExpression: "attribute_not_exists(enrollment_id)"
      });
    } catch (error) {
      if (isConditionalFailure(error)) throw new Error("enrollment_record_already_exists");
      throw error;
    }
    return record;
  }

  if (adapter === "atomic_filesystem") {
    const root = filesystemRoot();
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

  throw new Error("enrollment_ledger_not_configured");
}

export async function getEnrollmentRecord(enrollmentId) {
  const adapter = provider();
  if (adapter === "dynamodb") {
    const result = await dynamoRequest("DynamoDB_20120810.GetItem", {
      TableName: dynamoConfiguration().table_name,
      Key: { enrollment_id: { S: enrollmentId } },
      ConsistentRead: true
    });
    return recordFromDynamo(result.Item);
  }
  if (adapter === "atomic_filesystem") {
    const root = filesystemRoot();
    await ensureRoot(root);
    return readFilesystemRecord(root, enrollmentId);
  }
  throw new Error("enrollment_ledger_not_configured");
}

async function redeemDynamo(enrollmentId, details, clock) {
  const existing = await getEnrollmentRecord(enrollmentId);
  if (!existing) return { ok: false, reason: "enrollment_record_not_found" };
  if (existing.lifecycle_state === "redeemed" || Number(existing.use_count || 0) >= 1) {
    return { ok: false, reason: "enrollment_link_already_redeemed", record: existing };
  }
  if (existing.lifecycle_state !== "issued") {
    return { ok: false, reason: "enrollment_not_issuable", record: existing };
  }
  const now = clock();
  if (now >= Date.parse(existing.expires_at)) {
    return { ok: false, reason: "enrollment_link_expired", record: existing };
  }

  const updated = {
    ...existing,
    lifecycle_state: "redeemed",
    use_count: 1,
    redeemed_at: new Date(now).toISOString(),
    redemption: {
      platform: details.platform || null,
      receipt_id: details.receipt_id || null
    }
  };

  try {
    await dynamoRequest("DynamoDB_20120810.UpdateItem", {
      TableName: dynamoConfiguration().table_name,
      Key: { enrollment_id: { S: enrollmentId } },
      ConditionExpression: "lifecycle_state = :issued AND use_count = :zero AND expires_epoch > :now",
      UpdateExpression: "SET lifecycle_state = :redeemed, use_count = :one, record_json = :record",
      ExpressionAttributeValues: {
        ":issued": { S: "issued" },
        ":redeemed": { S: "redeemed" },
        ":zero": { N: "0" },
        ":one": { N: "1" },
        ":now": { N: String(Math.floor(now / 1000)) },
        ":record": { S: JSON.stringify(updated) }
      }
    });
    return { ok: true, record: updated };
  } catch (error) {
    if (!isConditionalFailure(error)) throw error;
    const current = await getEnrollmentRecord(enrollmentId);
    if (!current) return { ok: false, reason: "enrollment_record_not_found" };
    if (current.lifecycle_state === "redeemed" || Number(current.use_count || 0) >= 1) {
      return { ok: false, reason: "enrollment_link_already_redeemed", record: current };
    }
    if (clock() >= Date.parse(current.expires_at)) {
      return { ok: false, reason: "enrollment_link_expired", record: current };
    }
    return { ok: false, reason: "enrollment_redemption_conflict", record: current };
  }
}

async function redeemFilesystem(enrollmentId, details, clock) {
  const root = filesystemRoot();
  await ensureRoot(root);
  const lock = lockPath(root, enrollmentId);
  try {
    await mkdir(lock);
  } catch (error) {
    if (error?.code === "EEXIST") return { ok: false, reason: "enrollment_redemption_in_progress" };
    throw error;
  }

  try {
    const record = await readFilesystemRecord(root, enrollmentId);
    if (!record) return { ok: false, reason: "enrollment_record_not_found" };
    if (record.lifecycle_state === "redeemed" || Number(record.use_count || 0) >= 1) {
      return { ok: false, reason: "enrollment_link_already_redeemed", record };
    }
    if (record.lifecycle_state !== "issued") return { ok: false, reason: "enrollment_not_issuable", record };
    if (clock() >= Date.parse(record.expires_at)) return { ok: false, reason: "enrollment_link_expired", record };

    const updated = {
      ...record,
      lifecycle_state: "redeemed",
      use_count: 1,
      redeemed_at: new Date(clock()).toISOString(),
      redemption: {
        platform: details.platform || null,
        receipt_id: details.receipt_id || null
      }
    };
    await writeFile(recordPath(root, enrollmentId), `${JSON.stringify(updated, null, 2)}\n`, {
      encoding: "utf8",
      flag: "w"
    });
    return { ok: true, record: updated };
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

export async function redeemEnrollmentRecord(enrollmentId, details = {}, clock = Date.now) {
  const adapter = provider();
  if (adapter === "dynamodb") return redeemDynamo(enrollmentId, details, clock);
  if (adapter === "atomic_filesystem") return redeemFilesystem(enrollmentId, details, clock);
  throw new Error("enrollment_ledger_not_configured");
}
