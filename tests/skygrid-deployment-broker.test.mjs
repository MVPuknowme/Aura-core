import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import handler from "../api/deployment-broker-v2.mjs";
import {
  createEnrollmentToken,
  detectPlatform,
  verifyEnrollmentToken
} from "../api/deployment-broker.mjs";

process.env.SKYGRID_DEPLOYMENT_BROKER_SECRET = "test-only-secret-that-is-at-least-32-characters";
process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY = "test-admin-key-that-is-long-enough";
process.env.SKYGRID_DEPLOYMENT_ORIGIN = "https://deploy.example.test";

const ledgerDir = await mkdtemp(path.join(os.tmpdir(), "skygrid-enrollment-ledger-"));
process.env.SKYGRID_ENROLLMENT_LEDGER_DIR = ledgerDir;

process.on("exit", () => {
  void rm(ledgerDir, { recursive: true, force: true });
});

function createRequest({ method = "GET", path: requestPath = "/", body = {}, headers = {} } = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return {
    method,
    url: requestPath,
    headers: { host: "deploy.example.test", ...headers },
    async *[Symbol.asyncIterator]() {
      if (payload && payload !== "{}") yield Buffer.from(payload);
    }
  };
}

function createResponse() {
  const headers = {};
  let body = "";
  return {
    statusCode: 200,
    setHeader(name, value) { headers[name] = value; },
    end(chunk) { body += String(chunk ?? ""); },
    getBody() { return body; },
    getHeaders() { return headers; }
  };
}

async function invoke(options) {
  const req = createRequest(options);
  const res = createResponse();
  await handler(req, res);
  return { statusCode: res.statusCode, headers: res.getHeaders(), body: res.getBody() };
}

async function issueEnrollment(overrides = {}) {
  const issued = await invoke({
    method: "POST",
    path: "/api/enrollments",
    headers: { "x-skygrid-admin-key": process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY },
    body: {
      organization_id: "org_test",
      engineer_email: "engineer@example.test",
      allowed_platforms: ["windows-x64"],
      deployment_profile: "diagnostic",
      ...overrides
    }
  });
  return { response: issued, payload: JSON.parse(issued.body) };
}

test("creates and verifies a bounded signed enrollment token", () => {
  const clock = () => 1_800_000_000_000;
  const enrollment = createEnrollmentToken({
    organization_id: "org_test",
    deployment_profile: "diagnostic",
    allowed_platforms: ["windows-x64", "macos-arm64"],
    ttl_seconds: 600
  }, clock);

  const verification = verifyEnrollmentToken(enrollment.token, clock);
  assert.equal(verification.ok, true);
  assert.equal(verification.payload.organization_id, "org_test");
  assert.deepEqual(verification.payload.allowed_platforms, ["windows-x64", "macos-arm64"]);
  assert.equal(verification.payload.max_uses, 1);
});

test("fails closed for tampered and expired enrollment tokens", () => {
  const issued = createEnrollmentToken({ ttl_seconds: 60 }, () => 1_800_000_000_000);
  assert.equal(verifyEnrollmentToken(`${issued.token}tampered`, () => 1_800_000_000_000).ok, false);

  const expired = verifyEnrollmentToken(issued.token, () => 1_800_000_061_000);
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, "enrollment_link_expired");
});

test("detects common engineer platforms", () => {
  assert.equal(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "windows-x64");
  assert.equal(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)"), "macos-x64");
  assert.equal(detectPlatform("curl/8.0 Linux x86_64"), "linux-x64");
  assert.equal(detectPlatform("", "container"), "container");
});

test("requires deployment-admin authorization and persists issued state", async () => {
  const denied = await invoke({
    method: "POST",
    path: "/api/enrollments",
    body: { allowed_platforms: ["windows-x64"] }
  });
  assert.equal(denied.statusCode, 403);
  assert.equal(JSON.parse(denied.body).reason, "deployment_admin_authorization_required");

  const { response, payload } = await issueEnrollment();
  assert.equal(response.statusCode, 201);
  assert.equal(payload.ok, true);
  assert.equal(payload.lifecycle_state, "issued");
  assert.equal(payload.single_use_enforcement, "atomic_filesystem_ledger");

  const record = JSON.parse(await readFile(path.join(ledgerDir, `${payload.enrollment_id}.json`), "utf8"));
  assert.equal(record.lifecycle_state, "issued");
  assert.equal(record.use_count, 0);
});

test("rejects malformed JSON before issuing an enrollment", async () => {
  const response = await invoke({
    method: "POST",
    path: "/api/enrollments",
    headers: { "x-skygrid-admin-key": process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY },
    body: "{\"allowed_platforms\":[\"windows-x64\"]"
  });
  const payload = JSON.parse(response.body);
  assert.equal(response.statusCode, 400);
  assert.equal(payload.ok, false);
  assert.equal(payload.reason, "malformed_json_body");
  assert.equal(payload.no_enrollment_issued, true);
});

test("shows the enrollment page but refuses redemption until a signed artifact is configured", async () => {
  delete process.env.SKYGRID_WINDOWS_X64_URL;
  delete process.env.SKYGRID_WINDOWS_X64_SHA256;
  const { payload } = await issueEnrollment();

  const page = await invoke({
    method: "GET",
    path: new URL(payload.enrollment_url).pathname,
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /Platform approved; signed package is not configured yet/);

  const redemption = await invoke({
    method: "POST",
    path: `${new URL(payload.enrollment_url).pathname.replace("/enroll/", "/api/enrollments/")}/redeem`,
    body: { platform: "windows-x64" }
  });
  const rejected = JSON.parse(redemption.body);
  assert.equal(redemption.statusCode, 503);
  assert.equal(rejected.reason, "signed_artifact_not_configured");
  assert.equal(rejected.no_installation_executed, true);
});

test("rejects malformed JSON before redeeming an enrollment", async () => {
  process.env.SKYGRID_WINDOWS_X64_URL = "https://artifacts.example.test/skygrid-node.msi";
  process.env.SKYGRID_WINDOWS_X64_SHA256 = "a".repeat(64);
  const { payload } = await issueEnrollment();
  const token = new URL(payload.enrollment_url).pathname.replace("/enroll/", "");

  const response = await invoke({
    method: "POST",
    path: `/api/enrollments/${token}/redeem`,
    body: "{\"platform\":\"windows-x64\""
  });
  const rejected = JSON.parse(response.body);
  assert.equal(response.statusCode, 400);
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "malformed_json_body");
  assert.equal(rejected.no_installation_executed, true);
});

test("atomically redeems once and rejects token reuse", async () => {
  process.env.SKYGRID_WINDOWS_X64_URL = "https://artifacts.example.test/skygrid-node.msi";
  process.env.SKYGRID_WINDOWS_X64_SHA256 = "a".repeat(64);
  const { payload } = await issueEnrollment();
  const token = new URL(payload.enrollment_url).pathname.replace("/enroll/", "");
  const redeemPath = `/api/enrollments/${token}/redeem`;

  const first = await invoke({
    method: "POST",
    path: redeemPath,
    body: { platform: "windows-x64" }
  });
  const firstPayload = JSON.parse(first.body);
  assert.equal(first.statusCode, 202);
  assert.equal(firstPayload.ok, true);
  assert.equal(firstPayload.lifecycle_state, "redeemed");
  assert.equal(firstPayload.single_use_enforcement, "atomic_filesystem_ledger");

  const second = await invoke({
    method: "POST",
    path: redeemPath,
    body: { platform: "windows-x64" }
  });
  const secondPayload = JSON.parse(second.body);
  assert.equal(second.statusCode, 409);
  assert.equal(secondPayload.ok, false);
  assert.equal(secondPayload.reason, "enrollment_link_already_redeemed");
  assert.equal(secondPayload.no_installation_executed, true);

  const record = JSON.parse(await readFile(path.join(ledgerDir, `${payload.enrollment_id}.json`), "utf8"));
  assert.equal(record.lifecycle_state, "redeemed");
  assert.equal(record.use_count, 1);
});
