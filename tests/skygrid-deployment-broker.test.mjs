import test from "node:test";
import assert from "node:assert/strict";
import handler, {
  createEnrollmentToken,
  detectPlatform,
  verifyEnrollmentToken
} from "../api/deployment-broker.mjs";

process.env.SKYGRID_DEPLOYMENT_BROKER_SECRET = "test-only-secret-that-is-at-least-32-characters";
process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY = "test-admin-key-that-is-long-enough";
process.env.SKYGRID_DEPLOYMENT_ORIGIN = "https://deploy.example.test";

function createRequest({ method = "GET", path = "/", body = {}, headers = {} } = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return {
    method,
    url: path,
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

test("requires deployment-admin authorization before issuing a link", async () => {
  const denied = await invoke({
    method: "POST",
    path: "/api/enrollments",
    body: { allowed_platforms: ["windows-x64"] }
  });
  assert.equal(denied.statusCode, 403);
  assert.equal(JSON.parse(denied.body).reason, "deployment_admin_authorization_required");

  const issued = await invoke({
    method: "POST",
    path: "/api/enrollments",
    headers: { "x-skygrid-admin-key": process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY },
    body: {
      organization_id: "org_test",
      engineer_email: "engineer@example.test",
      allowed_platforms: ["windows-x64"],
      deployment_profile: "diagnostic"
    }
  });
  const payload = JSON.parse(issued.body);
  assert.equal(issued.statusCode, 201);
  assert.equal(payload.ok, true);
  assert.match(payload.enrollment_url, /^https:\/\/deploy\.example\.test\/enroll\//);
  assert.equal(payload.single_use_enforcement, "requires_persistent_store_before_production");
  assert.equal(payload.no_installation_executed, true);
});

test("shows the enrollment page but refuses redemption until a signed artifact is configured", async () => {
  const enrollment = createEnrollmentToken({ allowed_platforms: ["windows-x64"] });

  const page = await invoke({
    method: "GET",
    path: `/enroll/${enrollment.token}`,
    headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
  });
  assert.equal(page.statusCode, 200);
  assert.match(page.body, /Platform approved; signed package is not configured yet/);

  const redemption = await invoke({
    method: "POST",
    path: `/api/enrollments/${enrollment.token}/redeem`,
    body: { platform: "windows-x64" }
  });
  const payload = JSON.parse(redemption.body);
  assert.equal(redemption.statusCode, 503);
  assert.equal(payload.reason, "signed_artifact_not_configured");
  assert.equal(payload.no_installation_executed, true);
});
