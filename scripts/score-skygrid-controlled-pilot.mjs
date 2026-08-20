#!/usr/bin/env node

import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const value = raw.slice(2);
    const separator = value.indexOf("=");
    if (separator === -1) args[value] = true;
    else args[value.slice(0, separator)] = value.slice(separator + 1);
  }
  return args;
}

function numericArg(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected a finite number, received: ${value}`);
  return parsed;
}

function nearestRank(values, percentile) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(percentile * sorted.length));
  return sorted[rank - 1];
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function runRouteProbe(scenario) {
  const probePath = path.resolve("scripts/skygrid-route-option-probe.mjs");
  const result = spawnSync(process.execPath, [probePath, `--scenario=${scenario}`], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return {
      ok: false,
      scenario,
      error: result.stderr?.trim() || `route probe exited ${result.status}`
    };
  }

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    return {
      ok: false,
      scenario,
      error: `route probe returned non-JSON output: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function criterion(id, label, passed, evidence) {
  return { id, label, passed: passed === true, evidence };
}

function allTrue(results, selector) {
  return Array.isArray(results) && results.length > 0 && results.every(selector);
}

function markdownReport(report) {
  const lines = [
    "## SKYGRID controlled-pilot evidence score",
    "",
    `**Score:** ${report.score.toFixed(1)}/10 — ${report.passed ? "PASS" : "FAIL"}`,
    "",
    `Scope: ${report.scope}. This is not a production SLA or field-availability claim.`,
    "",
    "| Criterion | Result | Evidence |",
    "|---|---:|---|"
  ];

  for (const item of report.criteria) {
    lines.push(`| ${item.label} | ${item.passed ? "PASS" : "FAIL"} | ${String(item.evidence).replaceAll("|", "\\|")} |`);
  }

  lines.push(
    "",
    `Scenarios: ${report.metrics.scenariosPassed}/${report.metrics.scenariosTotal} passed`,
    `Success rate: ${report.metrics.successRatePct.toFixed(2)}%`,
    `Latency p50/p95/p99: ${report.metrics.p50Ms}/${report.metrics.p95Ms}/${report.metrics.p99Ms} ms`,
    `Route selection: ${report.metrics.routeScenariosPassed}/3 passed`,
    `Evidence loss: ${report.metrics.missingEventIds} missing event IDs across ${report.metrics.scenariosTotal} scenarios`
  );

  if (report.metrics.sameRunCostUsd !== null) {
    lines.push(
      `Same-run infrastructure cost: $${report.metrics.sameRunCostUsd.toFixed(6)}`,
      `Cost per measured event: $${report.metrics.costPerEventUsd.toFixed(6)}`
    );
  } else {
    lines.push("Same-run cost efficiency: not scored; no attributable same-run infrastructure cost was supplied.");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const receiptDir = path.resolve(args["receipt-dir"] || "training/receipts");
  const acceptedPath = path.join(receiptDir, args["accepted-file"] || "accepted-paths.json");
  const failClosedPath = path.join(receiptDir, args["fail-closed-file"] || "fail-closed.json");
  const outputPath = path.resolve(args.out || path.join(receiptDir, "pilot-score.json"));
  const minimumScore = numericArg(args["min-score"], 9.0);
  const p95ThresholdMs = numericArg(args["p95-ms"], 1500);
  const sameRunCostUsd = args["run-cost-usd"] === undefined ? null : numericArg(args["run-cost-usd"], null);

  const [accepted, failClosed] = await Promise.all([
    readJson(acceptedPath),
    readJson(failClosedPath)
  ]);

  const acceptedResults = accepted.results || [];
  const failClosedResults = failClosed.results || [];
  const allResults = [...acceptedResults, ...failClosedResults];
  const durations = allResults
    .map((result) => Number(result?.timing?.durationMs))
    .filter(Number.isFinite);

  const routeProbes = {
    primary: runRouteProbe("primary"),
    local: runRouteProbe("local"),
    queue: runRouteProbe("queue")
  };

  const acceptedAllPassed =
    accepted.ok === true &&
    accepted.summary?.scenarios === 5 &&
    accepted.summary?.passed === 5 &&
    accepted.summary?.failed === 0 &&
    allTrue(acceptedResults, (result) => result.passed === true);

  const failClosedAllPassed =
    failClosed.ok === true &&
    failClosed.allRequestsRejected === true &&
    failClosed.summary?.scenarios === 11 &&
    failClosed.summary?.passed === 11 &&
    failClosed.summary?.failed === 0 &&
    allTrue(failClosedResults, (result) => result.passed === true);

  const acceptedEventIds = allTrue(acceptedResults, (result) => result.assertions?.eventIdPassed === true);
  const failClosedEventIds = allTrue(failClosedResults, (result) => result.assertions?.eventIdPassed === true);
  const noForbiddenExecution =
    allTrue(acceptedResults, (result) => result.assertions?.safetyPassed === true) &&
    allTrue(failClosedResults, (result) => result.assertions?.noExecutionPassed === true);

  const rejectionContract = allTrue(
    failClosedResults,
    (result) =>
      result.assertions?.rejectedPassed === true &&
      result.assertions?.advisoryOnlyPassed === true &&
      result.assertions?.decisionOkPassed === true &&
      result.assertions?.reasonPassed === true &&
      result.assertions?.modePassed === true &&
      result.assertions?.sentinelPassed === true &&
      result.assertions?.trainingEchoPassed === true
  );

  const p50Ms = nearestRank(durations, 0.50);
  const p95Ms = nearestRank(durations, 0.95);
  const p99Ms = nearestRank(durations, 0.99);
  const latencyPassed = durations.length === allResults.length && p95Ms !== null && p95Ms <= p95ThresholdMs;

  const criteria = [
    criterion("accepted_paths", "Accepted-path training", acceptedAllPassed, `${accepted.summary?.passed ?? 0}/5 scenarios`),
    criterion("fail_closed_paths", "Fail-closed training", failClosedAllPassed, `${failClosed.summary?.passed ?? 0}/11 scenarios; all rejected safely=${failClosed.allRequestsRejected === true}`),
    criterion("accepted_receipts", "Accepted-path evidence IDs", acceptedEventIds, `${acceptedResults.filter((r) => r.assertions?.eventIdPassed === true).length}/5 event IDs`),
    criterion("fail_closed_receipts", "Fail-closed evidence IDs", failClosedEventIds, `${failClosedResults.filter((r) => r.assertions?.eventIdPassed === true).length}/11 event IDs`),
    criterion("no_forbidden_execution", "No forbidden execution", noForbiddenExecution, "production failover/payment/private-data/wallet/broadcast execution remained disabled"),
    criterion("rejection_contract", "Fail-closed decision contract", rejectionContract, "rejection, advisory-only, reason, mode, sentinel and training echo assertions"),
    criterion("route_primary", "Primary route selection", routeProbes.primary.ok === true, `${routeProbes.primary.selected ?? "none"}`),
    criterion("route_local", "Local fallback selection", routeProbes.local.ok === true, `${routeProbes.local.selected ?? "none"}`),
    criterion("route_queue", "Safe-queue preservation", routeProbes.queue.ok === true, `${routeProbes.queue.selected ?? "none"}`),
    criterion("latency_p95", "Controlled-pilot p95 latency", latencyPassed, `${p95Ms ?? "n/a"} ms <= ${p95ThresholdMs} ms`)
  ];

  const passedCriteria = criteria.filter((item) => item.passed).length;
  const score = (passedCriteria / criteria.length) * 10;
  const scenariosPassed = allResults.filter((result) => result.passed === true).length;
  const missingEventIds = allResults.filter((result) => result.assertions?.eventIdPassed !== true).length;
  const costPerEventUsd = sameRunCostUsd === null || allResults.length === 0 ? null : sameRunCostUsd / allResults.length;

  const report = {
    schemaVersion: 1,
    product: "SKYGRID Emergency Data On-Ramp",
    score,
    minimumScore,
    passed: score >= minimumScore,
    scope: "controlled-pilot local-runtime CI evidence",
    productionEquivalent: false,
    generatedAt: new Date().toISOString(),
    criteria,
    metrics: {
      scenariosTotal: allResults.length,
      scenariosPassed,
      scenariosFailed: allResults.length - scenariosPassed,
      successRatePct: allResults.length ? (scenariosPassed / allResults.length) * 100 : 0,
      p50Ms,
      p95Ms,
      p99Ms,
      p95ThresholdMs,
      routeScenariosPassed: Object.values(routeProbes).filter((probe) => probe.ok === true).length,
      missingEventIds,
      sameRunCostUsd,
      costPerEventUsd
    },
    routeProbes,
    notes: [
      "The score is intentionally limited to controlled-pilot evidence generated by this test run.",
      "Loopback/CI latency is useful for regression detection but does not substitute for WAN, partner, or field latency.",
      "Cost per event is reported only when a same-run attributable infrastructure cost is supplied; historical AWS billing is not automatically assigned to this run."
    ]
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const markdown = markdownReport(report);
  process.stdout.write(markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${markdown}`, "utf8");
  }

  if (!report.passed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
