#!/usr/bin/env node
import fs from "node:fs";

const path = "config/integrations/postman-skygrid-control.json";

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(path)) {
  fail(`Missing ${path}`);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(path, "utf8"));
} catch (error) {
  fail(`Invalid JSON: ${error.message}`);
}

const required = [
  "name",
  "type",
  "status",
  "workspace",
  "requestId",
  "sourceUrl",
  "purpose",
  "safeDefaults",
  "recommendedBindings",
  "reviewChecklist"
];

for (const key of required) {
  if (!(key in config)) fail(`Missing required key: ${key}`);
}

if (config.type !== "postman-request-reference") {
  fail(`Unexpected type: ${config.type}`);
}

if (config.status !== "linked-reference-pending-review") {
  fail(`Unexpected status: ${config.status}`);
}

const safe = config.safeDefaults ?? {};

const requiredSafety = [
  "noSecretsInRepo",
  "noPrivateKeys",
  "noSeedPhrases",
  "readOnlyFirst",
  "operatorApprovalRequiredForWrites",
  "productionActionsRequireExplicitReview"
];

for (const key of requiredSafety) {
  if (safe[key] !== true) fail(`Safety flag must be true: ${key}`);
}

const text = JSON.stringify(config);

const blockedPatterns = [
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /sk-[A-Za-z0-9]/i,
  /-----BEGIN PRIVATE KEY-----/i,
  /seed phrase/i,
  /mnemonic/i
];

for (const pattern of blockedPatterns) {
  if (pattern.test(text)) {
    fail(`Possible secret detected by pattern: ${pattern}`);
  }
}

console.log("✅ Postman SkyGrid control reference is valid and safe.");
