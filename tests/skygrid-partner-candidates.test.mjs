import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registryUrl = new URL("../config/skygrid-partner-candidates.json", import.meta.url);
const registry = JSON.parse(await readFile(registryUrl, "utf8"));

test("iQuasar remains a non-authorizing partner candidate until explicit approval gates pass", () => {
  const iquasar = registry.candidates.find((candidate) => candidate.id === "iquasar");

  assert.ok(iquasar, "iQuasar candidate must be present");
  assert.equal(registry.sentinel, "fail_closed");
  assert.equal(iquasar.status, "candidate");
  assert.equal(iquasar.company_verification, "public_sources_confirmed");
  assert.equal(iquasar.engagement_verification, "pending");

  assert.equal(iquasar.authority.pnpk_authorized, false);
  assert.equal(iquasar.authority.production_execution, false);
  assert.equal(iquasar.authority.credential_access, false);
  assert.equal(iquasar.authority.private_data_access, false);
  assert.equal(iquasar.authority.wallet_signing, false);
  assert.equal(iquasar.authority.transaction_broadcast, false);

  assert.deepEqual(iquasar.contact.official_email_domains, ["iquasar.com", "iquasar.us"]);
  assert.ok(iquasar.approval_gates.includes("issue_pnpk_authorization_receipt"));
  assert.ok(iquasar.approval_gates.includes("record_owner_approval"));
});
