#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const DEFAULT_BASE_URL = "https://aura-core-git-mvpuknowme-home-e539c0b1.vercel.app";
const DEFAULT_SCENARIO_FILE = "training/scenarios/skygrid-auto-drill-v1.json";
const DEFAULT_OUT_DIR = "training/receipts";

const FORBIDDEN_TRUE_FIELDS = [
  "productionFailover",
  "production_failover",
  "paymentExecution",
  "payment_execution",
  "privateDataMovement",
  "private_data_movement",
  "walletSigning",
  "wallet_signing",
  "transactionBroadcast",
  "transaction_broadcast",
  "realDispatch",
  "real_dispatch",
  "executeFailover",
  "execute_failover"
];

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const withoutPrefix = raw.slice(2);
    const equalsIndex = withoutPrefix.indexOf("=");
    if (equalsIndex === -1) {
      args[withoutPrefix] = true;
    } else {
      args[withoutPrefix.slice(0, equalsIndex)] = withoutPrefix.slice(equalsIndex + 1);
    }
  }
  return args;
}

function joinUrl(baseUrl, requestPath) {
  const cleanBase = String(baseUrl).replace(/\/+$/, "");
  const cleanPath = String(requestPath || "/").startsWith("/") ? requestPath : `/${requestPath}`;
  return `${cleanBase}${cleanPath}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findEventId(payload) {
  if (!payload || typeof payload !== "object") return null;
  return (
    payload.eventId ||
    payload.event_id ||
    payload.id ||
    payload.receiptId ||
    payload.receipt_id ||
    payload.receipt?.eventId ||
    payload.receipt?.event_id ||
    payload.event?.id ||
    null
  );
}

function hasForbiddenTrueField(value, trail = []) {
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (FORBIDDEN_TRUE_FIELDS.includes(key) && child === true) {
      return nextTrail.join(".");
    }
    if (child && typeof child === "object") {
      const nested = hasForbiddenTrueField(child, nextTrail);
      if (nested) return nested;
    }
  }
  return null;
}

function buildTrainingPayload(pack, scenario, runId) {
  return {
    product: PRODUCT,
    training: true,
    simulated: true,
    runId,
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    category: scenario.category,
    severity: scenario.severity,
    mode: pack.mode || "controlled_pilot",
    sentinel: pack.sentinel || "fail_closed",
    safety: {
      ...(pack.safetyContract || {}),
      productionFailover: false,
      paymentExecution: false,
      privateDataMovement: false,
      walletSigning: false,
      transactionBroadcast: false,
      operatorReviewRequired: true
    },
    event: scenario.input,
    expected: scenario.expected,
    timestamp: new Date().toISOString()
  };
}

async function runScenario({ baseUrl, pack, scenario, runId }) {
  const requestPath = scenario.request?.path || pack.endpoint?.path || "/api/skygrid/intake";
  const method = scenario.request?.method || pack.endpoint?.method || "POST";
  const url = joinUrl(baseUrl, requestPath);
  const body = buildTrainingPayload(pack, scenario, runId);

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  let responseText = "";
  let responseJson = null;
  let status = 0;
  let fetchError = null;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-skygrid-training": "true",
        "x-skygrid-product": PRODUCT
      },
      body: method === "GET" ? undefined : JSON.stringify(body)
    });
    status = response.status;
    responseText = await response.text();
    responseJson = safeJsonParse(responseText);
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error);
  }

  const durationMs = Date.now() - startedMs;
  const expectedStatuses = scenario.expected?.accepted_statuses || [202];
  const eventId = findEventId(responseJson);
  const forbiddenPath = hasForbiddenTrueField(responseJson);
  const statusPassed = expectedStatuses.includes(status);
  const eventIdPassed = scenario.expected?.requires_event_id ? Boolean(eventId) : true;
  const safetyPassed = !forbiddenPath;
  const passed = !fetchError && statusPassed && eventIdPassed && safetyPassed;

  return {
    id: scenario.id,
    title: scenario.title,
    category: scenario.category,
    severity: scenario.severity,
    passed,
    assertions: {
      statusPassed,
      eventIdPassed,
      safetyPassed,
      expectedStatuses,
      eventId: eventId || null,
      forbiddenTrueField: forbiddenPath || null,
      operatorReviewRequired: true
    },
    request: {
      method,
      url,
      training: true,
      simulated: true
    },
    response: {
      status,
      json: responseJson,
      text: responseJson ? undefined : responseText.slice(0, 2000),
      error: fetchError
    },
    timing: {
      startedAt,
      durationMs
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args["base-url"] || process.env.SKYGRID_TRAINING_BASE_URL || DEFAULT_BASE_URL;
  const scenarioFile = args["scenario-file"] || process.env.SKYGRID_TRAINING_SCENARIO_FILE || DEFAULT_SCENARIO_FILE;
  const outDir = args["out-dir"] || process.env.SKYGRID_TRAINING_OUT_DIR || DEFAULT_OUT_DIR;
  const runId = args["run-id"] || `skygrid-training-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const pack = JSON.parse(await readFile(scenarioFile, "utf8"));
  if (pack.product !== PRODUCT) {
    throw new Error(`Unexpected product in scenario pack: ${pack.product}`);
  }
  if (!Array.isArray(pack.scenarios) || pack.scenarios.length === 0) {
    throw new Error("Scenario pack must contain one or more scenarios.");
  }

  console.log(`== ${PRODUCT} training drill ==`);
  console.log(`base_url: ${baseUrl}`);
  console.log(`scenario_file: ${scenarioFile}`);
  console.log(`run_id: ${runId}`);
  console.log("");

  const results = [];
  for (const scenario of pack.scenarios) {
    process.stdout.write(`→ ${scenario.id} ... `);
    const result = await runScenario({ baseUrl, pack, scenario, runId });
    results.push(result);
    console.log(result.passed ? "PASS" : "FAIL");
  }

  const failed = results.filter((result) => !result.passed);
  const receipt = {
    ok: failed.length === 0,
    product: PRODUCT,
    mode: pack.mode || "controlled_pilot",
    sentinel: pack.sentinel || "fail_closed",
    trainingOnly: true,
    noProductionFailover: true,
    noPaymentExecuted: true,
    noPrivateDataMovement: true,
    noWalletSigning: true,
    noTransactionBroadcast: true,
    operatorReviewRequired: true,
    baseUrl,
    scenarioFile,
    runId,
    summary: {
      scenarios: results.length,
      passed: results.length - failed.length,
      failed: failed.length
    },
    results,
    timestamp: new Date().toISOString()
  };

  await mkdir(outDir, { recursive: true });
  const receiptPath = path.join(outDir, `${runId}.json`);
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

  console.log("");
  console.log(`receipt: ${receiptPath}`);
  console.log(`summary: ${receipt.summary.passed}/${receipt.summary.scenarios} passed`);

  if (!receipt.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
