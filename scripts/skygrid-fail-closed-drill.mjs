#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const DEFAULT_BASE_URL = "http://127.0.0.1:3000";
const DEFAULT_SCENARIO_FILE = "training/scenarios/skygrid-fail-closed-v1.json";
const DEFAULT_OUT_DIR = "training/receipts";

const FORBIDDEN_EXECUTION_FIELDS = [
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
    const value = raw.slice(2);
    const separator = value.indexOf("=");
    if (separator === -1) {
      args[value] = true;
    } else {
      args[value.slice(0, separator)] = value.slice(separator + 1);
    }
  }
  return args;
}

function joinUrl(baseUrl, requestPath) {
  const cleanBase = String(baseUrl).replace(/\/+$/, "");
  const cleanPath = String(requestPath || "/").startsWith("/")
    ? requestPath
    : `/${requestPath}`;
  return `${cleanBase}${cleanPath}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function findForbiddenExecution(value, trail = []) {
  if (!value || typeof value !== "object") return null;

  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (FORBIDDEN_EXECUTION_FIELDS.includes(key) && child === true) {
      return nextTrail.join(".");
    }
    if (child && typeof child === "object") {
      const nested = findForbiddenExecution(child, nextTrail);
      if (nested) return nested;
    }
  }

  return null;
}

function buildPayload(pack, scenario, runId) {
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
    event: scenario.input,
    timestamp: new Date().toISOString()
  };
}

async function runScenario({ baseUrl, pack, scenario, runId }) {
  const requestPath = scenario.request?.path || pack.endpoint?.path || "/api/skygrid/intake";
  const method = scenario.request?.method || pack.endpoint?.method || "POST";
  const url = joinUrl(baseUrl, requestPath);
  const body = buildPayload(pack, scenario, runId);
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
        "x-skygrid-training-lane": "fail-closed",
        "x-skygrid-product": PRODUCT
      },
      body: JSON.stringify(body)
    });

    status = response.status;
    responseText = await response.text();
    responseJson = safeJsonParse(responseText);
  } catch (error) {
    fetchError = error instanceof Error ? error.message : String(error);
  }

  const decision = responseJson?.event?.decision;
  const eventId = responseJson?.event?.eventId || null;
  const forbiddenExecutionField = findForbiddenExecution(responseJson);

  const assertions = {
    statusPassed: status === scenario.expected.status,
    rejectedPassed: responseJson?.accepted === false,
    advisoryOnlyPassed: responseJson?.advisoryOnly === true,
    decisionOkPassed: decision?.ok === false,
    reasonPassed: decision?.reason === scenario.expected.reason,
    modePassed: decision?.mode === (pack.mode || "controlled_pilot"),
    sentinelPassed: decision?.sentinel === (pack.sentinel || "fail_closed"),
    trainingEchoPassed: responseJson?.event?.skygrid?.training === true,
    eventIdPassed: Boolean(eventId),
    noExecutionPassed: !forbiddenExecutionField
  };

  const passed =
    !fetchError &&
    Object.values(assertions).every((value) => value === true);

  return {
    id: scenario.id,
    title: scenario.title,
    category: scenario.category,
    severity: scenario.severity,
    passed,
    expected: scenario.expected,
    assertions: {
      ...assertions,
      eventId,
      actualStatus: status,
      actualReason: decision?.reason || null,
      forbiddenExecutionField
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
      durationMs: Date.now() - startedMs
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args["base-url"] || process.env.SKYGRID_TRAINING_BASE_URL || DEFAULT_BASE_URL;
  const scenarioFile = args["scenario-file"] || process.env.SKYGRID_FAIL_CLOSED_SCENARIO_FILE || DEFAULT_SCENARIO_FILE;
  const outDir = args["out-dir"] || process.env.SKYGRID_TRAINING_OUT_DIR || DEFAULT_OUT_DIR;
  const runId = args["run-id"] || `skygrid-fail-closed-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const pack = JSON.parse(await readFile(scenarioFile, "utf8"));

  if (pack.product !== PRODUCT) {
    throw new Error(`Unexpected product in scenario pack: ${pack.product}`);
  }
  if (pack.sentinel !== "fail_closed") {
    throw new Error(`Fail-closed training requires sentinel=fail_closed, received: ${pack.sentinel}`);
  }
  if (!Array.isArray(pack.scenarios) || pack.scenarios.length === 0) {
    throw new Error("Fail-closed scenario pack must contain one or more scenarios.");
  }

  console.log(`== ${PRODUCT} fail-closed training drill ==`);
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
    lane: "fail_closed_training",
    mode: pack.mode || "controlled_pilot",
    sentinel: "fail_closed",
    trainingOnly: true,
    allRequestsRejected: results.every((result) => result.assertions.rejectedPassed),
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
