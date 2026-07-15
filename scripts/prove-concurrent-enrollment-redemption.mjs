import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SKYGRID_TEST_BASE_URL || "http://127.0.0.1:3000";
const adminKey = process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY || "";
const outputPath = process.argv[2] || "evidence/deployment-broker/concurrent-redemption-proof.json";

if (adminKey.length < 24) throw new Error("deployment_admin_key_not_configured");

async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body;
  try { body = await response.json(); } catch { body = { raw: await response.text() }; }
  return { status: response.status, body };
}

const issuance = await request(`${baseUrl}/api/enrollments`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-skygrid-admin-key": adminKey },
  body: JSON.stringify({
    organization_id: "skygrid-concurrency-pilot",
    deployment_profile: "diagnostic",
    allowed_platforms: ["windows-x64"],
    ttl_seconds: 600
  })
});

if (issuance.status !== 201 || !issuance.body?.enrollment_url) {
  throw new Error(`enrollment_issuance_failed:${issuance.status}:${issuance.body?.reason || "unknown"}`);
}

const token = new URL(issuance.body.enrollment_url).pathname.replace(/^\/enroll\//, "");
const redeemUrl = `${baseUrl}/api/enrollments/${token}/redeem`;
const redeemOptions = {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ platform: "windows-x64" })
};

const results = await Promise.all([
  request(redeemUrl, redeemOptions),
  request(redeemUrl, redeemOptions)
]);

const statuses = results.map((entry) => entry.status).sort((a, b) => a - b);
const reasons = results.map((entry) => entry.body?.reason || null);
const accepted = results.filter((entry) => entry.status === 202 && entry.body?.ok === true);
const rejected = results.filter((entry) => entry.status === 409 && entry.body?.reason === "enrollment_link_already_redeemed");
const ok = accepted.length === 1 && rejected.length === 1;

const proof = {
  schema_version: "1.0",
  service: "SKYGRID Emergency Data On-Ramp",
  component: "deployment_broker",
  mode: "controlled_pilot",
  event_type: "concurrent_enrollment_redemption_tested",
  enrollment_id: issuance.body.enrollment_id,
  concurrent_attempts: 2,
  accepted_count: accepted.length,
  rejected_count: rejected.length,
  response_statuses: statuses,
  rejection_reasons: reasons.filter(Boolean),
  expected_final_use_count: 1,
  raw_token_excluded: true,
  admin_key_excluded: true,
  no_installation_executed_by_test: true,
  recorded_at: new Date().toISOString(),
  ok
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
const hash = createHash("sha256").update(JSON.stringify(proof, null, 2)).digest("hex").toUpperCase();
console.log(JSON.stringify({ ...proof, proof_sha256: hash }, null, 2));
if (!ok) process.exitCode = 1;
