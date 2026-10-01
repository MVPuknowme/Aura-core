import { readFile } from "node:fs/promises";
import { summarizeValidatorEconomics } from "../lib/validator-economics.mjs";

const path =
  process.argv[2] ?? "configs/accounting/klamath-validator-economics.v1.json";

const input = JSON.parse(await readFile(path, "utf8"));
const report = summarizeValidatorEconomics(input);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
