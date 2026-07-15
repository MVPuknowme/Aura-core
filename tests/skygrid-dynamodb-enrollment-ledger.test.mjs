import test from "node:test";
import assert from "node:assert/strict";

process.env.SKYGRID_ENROLLMENT_DYNAMODB_TABLE = "skygrid-enrollment-test";
process.env.AWS_REGION = "us-west-2";
process.env.AWS_ACCESS_KEY_ID = "AKIATESTONLY";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret-access-key";
delete process.env.SKYGRID_ENROLLMENT_LEDGER_DIR;

const records = new Map();

function response(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/x-amz-json-1.0" }
  });
}

globalThis.fetch = async (_url, options) => {
  const target = options.headers["x-amz-target"];
  const body = JSON.parse(options.body);
  const id = body.Item?.enrollment_id?.S || body.Key?.enrollment_id?.S;

  if (target.endsWith("PutItem")) {
    if (records.has(id)) {
      return response(400, { __type: "ConditionalCheckFailedException", message: "exists" });
    }
    records.set(id, structuredClone(body.Item));
    return response(200, {});
  }

  if (target.endsWith("GetItem")) {
    return response(200, records.has(id) ? { Item: structuredClone(records.get(id)) } : {});
  }

  if (target.endsWith("UpdateItem")) {
    const current = records.get(id);
    const now = Number(body.ExpressionAttributeValues[":now"].N);
    const eligible = current &&
      current.lifecycle_state.S === "issued" &&
      Number(current.use_count.N) === 0 &&
      Number(current.expires_epoch.N) > now;

    if (!eligible) {
      return response(400, { __type: "ConditionalCheckFailedException", message: "condition failed" });
    }

    current.lifecycle_state = structuredClone(body.ExpressionAttributeValues[":redeemed"]);
    current.use_count = structuredClone(body.ExpressionAttributeValues[":one"]);
    current.record_json = structuredClone(body.ExpressionAttributeValues[":record"]);
    records.set(id, current);
    return response(200, {});
  }

  return response(400, { __type: "UnknownOperationException" });
};

const {
  createEnrollmentRecord,
  enrollmentLedgerStatus,
  getEnrollmentRecord,
  redeemEnrollmentRecord
} = await import("../lib/deployment-enrollment-ledger.mjs");

test("selects DynamoDB as the production-ready enrollment ledger", () => {
  const status = enrollmentLedgerStatus();
  assert.equal(status.configured, true);
  assert.equal(status.adapter, "dynamodb");
  assert.equal(status.production_ready, true);
  assert.equal(status.table_name, "skygrid-enrollment-test");
  assert.equal(status.region, "us-west-2");
});

test("creates, consistently reads, and atomically redeems only once", async () => {
  records.clear();
  const issuedSeconds = 1_800_000_000;
  const payload = {
    jti: "enrollment-concurrency-test",
    organization_id: "org_test",
    engineer_email: "engineer@example.test",
    deployment_profile: "diagnostic",
    allowed_platforms: ["windows-x64"],
    iat: issuedSeconds,
    exp: issuedSeconds + 3600
  };

  const created = await createEnrollmentRecord(payload, () => issuedSeconds * 1000);
  assert.equal(created.lifecycle_state, "issued");
  assert.equal(created.use_count, 0);

  const read = await getEnrollmentRecord(payload.jti);
  assert.equal(read.enrollment_id, payload.jti);
  assert.equal(read.lifecycle_state, "issued");

  const now = () => (issuedSeconds + 10) * 1000;
  const results = await Promise.all([
    redeemEnrollmentRecord(payload.jti, { platform: "windows-x64", receipt_id: "receipt-a" }, now),
    redeemEnrollmentRecord(payload.jti, { platform: "windows-x64", receipt_id: "receipt-b" }, now)
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => result.reason === "enrollment_link_already_redeemed").length, 1);

  const finalRecord = await getEnrollmentRecord(payload.jti);
  assert.equal(finalRecord.lifecycle_state, "redeemed");
  assert.equal(finalRecord.use_count, 1);
});
