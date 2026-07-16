#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const value = raw.slice(2);
    const index = value.indexOf("=");
    if (index === -1) args[value] = true;
    else args[value.slice(0, index)] = value.slice(index + 1);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const directory = args.dir || process.env.SKYGRID_TRAINING_RECEIPT_DIR;

if (!directory) {
  throw new Error("Receipt directory is required via --dir=<path> or SKYGRID_TRAINING_RECEIPT_DIR.");
}

const expected = new Map([
  ["accepted-paths.json", 5],
  ["fail-closed.json", 11]
]);

const absoluteDirectory = path.resolve(directory);
const files = (await readdir(absoluteDirectory))
  .filter((file) => file.endsWith(".json"))
  .sort();

if (files.length !== expected.size) {
  throw new Error(`Expected exactly two current-run receipts, found: ${JSON.stringify(files)}`);
}

let totalScenarios = 0;
let totalPassed = 0;

for (const [file, expectedScenarios] of expected) {
  if (!files.includes(file)) {
    throw new Error(`Missing expected training receipt: ${file}`);
  }

  const receipt = JSON.parse(
    await readFile(path.join(absoluteDirectory, file), "utf8")
  );

  if (receipt.ok !== true) {
    throw new Error(`${file} reports ok !== true`);
  }

  if (
    receipt.summary?.scenarios !== expectedScenarios ||
    receipt.summary?.passed !== expectedScenarios ||
    receipt.summary?.failed !== 0
  ) {
    throw new Error(`${file} has an unexpected summary: ${JSON.stringify(receipt.summary)}`);
  }

  if (
    !Array.isArray(receipt.results) ||
    receipt.results.some((result) => result.passed !== true)
  ) {
    throw new Error(`${file} contains a failed scenario`);
  }

  if (file === "fail-closed.json") {
    if (
      receipt.sentinel !== "fail_closed" ||
      receipt.allRequestsRejected !== true
    ) {
      throw new Error("Fail-closed receipt did not prove rejection safety");
    }
  }

  totalScenarios += receipt.summary.scenarios;
  totalPassed += receipt.summary.passed;
}

if (totalScenarios !== 16 || totalPassed !== 16) {
  throw new Error(
    `Combined training result is not 16/16: ${JSON.stringify({ totalScenarios, totalPassed })}`
  );
}

console.log("Training drills verified: 16/16 across accepted and fail-closed lanes");
