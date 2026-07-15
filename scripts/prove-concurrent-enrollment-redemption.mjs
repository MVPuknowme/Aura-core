import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SKYGRID_TEST_BASE_URL || "http://127.0.0.1:3000";
const adminKey = process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY || "";
const ledgerDirectory = process.env.SKYGRID_ENROLLMENT_LEDGER_DIR || "";
const outputPath = process.argv[2] || "evidence/deployment-broker/concurrent-redemption-proof.json";

if (adminKey.length < 24) throw new Error("deployment_admin_key_not_configured");

async function request(url, options = {}) {
  const response = await fetch(url, options);
  let body;
  try { body = await response.json(); } catch { body = { raw: await response.text() }; }
  return { status: response.status, body };
}

async function readFinalLedgerRecord(enrollmentId) {
  if (!ledgerDirectory) return null;
  const recordPath = path.join(ledgerDirectory, `${enrollmentId}.json`);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return JSON.parse(await readFile(recordPath, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
  return null;
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
const safeRejections = results.filter((entry) =>
  (entry.status === 409 && entry.body?.reason === "enrollment_link_already_redeemed") ||
  (entry.status === 403 && entry.body?.reason === "enrollment_redemption_in_progress")
);

const finalRecord = await readFinalLedgerRecord(issuance.body.enrollment_id);
const finalStateVerified = finalRecord
  ? finalRecord.lifecycle_state === "redeemed" && Number(finalRecord.use_count) === 1
  : null;
const ok = accepted.length === 1 && safeRejections.length === 1 && finalStateVerified !== false;

const proof = {
  schema_version: "1.1",
  service: "SKYGRID Emergency Data On-Ramp",
  component: "deployment_broker",
  mode: "controlled_pilot",
  event_type: "concurrent_enrollment_redemption_tested",
  enrollment_id: issuance.body.enrollment_id,
  concurrent_attempts: 2,
  accepted_count: accepted.length,
  safely_rejected_count: safeRejections.length,
  response_statuses: statuses,
  rejection_reasons: reasons.filter(Boolean),
  accepted_safe_rejection_reasons: [
    "enrollment_link_already_redeemed",
    "enrollment_redemption_in_progress"
  ],
  expected_final_use_count: 1,
  final_lifecycle_state: finalRecord?.lifecycle_state || null,
  final_use_count: finalRecord ? Number(finalRecord.use_count) : null,
  final_state_verified: finalStateVerified,
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
