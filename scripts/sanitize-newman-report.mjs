import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  console.error("usage: node scripts/sanitize-newman-report.mjs <input.json> <output.json>");
  process.exit(2);
}

const raw = await readFile(inputPath, "utf8");
const report = JSON.parse(raw);
const stats = report?.run?.stats || {};
const executions = Array.isArray(report?.run?.executions) ? report.run.executions : [];

const receipt = {
  schema_version: "1.0",
  service: "SKYGRID Emergency Data On-Ramp",
  component: "deployment_broker",
  mode: "controlled_pilot",
  event_type: "postman_regression_completed",
  collection: report?.collection?.name || report?.run?.collection?.name || "skygrid-deployment-broker.collection.json",
  source_report_sha256: createHash("sha256").update(raw).digest("hex").toUpperCase(),
  requests_executed: Number(stats?.requests?.total || 0),
  requests_failed: Number(stats?.requests?.failed || 0),
  assertions_executed: Number(stats?.assertions?.total || 0),
  assertions_failed: Number(stats?.assertions?.failed || 0),
  iterations_executed: Number(stats?.iterations?.total || 0),
  request_names: executions.map((entry) => entry?.item?.name).filter(Boolean),
  secrets_removed: [
    "admin keys",
    "authorization headers",
    "collection and environment variable values",
    "raw enrollment URLs",
    "enrollment tokens",
    "request and response bodies"
  ],
  raw_tokens_excluded_from_receipt: true,
  recorded_at: new Date().toISOString(),
  ok: Number(stats?.requests?.failed || 0) === 0 && Number(stats?.assertions?.failed || 0) === 0
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.ok) process.exitCode = 1;
