import { readFile } from "node:fs/promises";
import { estimateTaiwanRoutingRevenue } from "../lib/thorium-taiwan-economics.mjs";

const path =
  process.argv[2] ?? "configs/accounting/thorium-taiwan-launch.v1.json";

const input = JSON.parse(await readFile(path, "utf8"));
const report = estimateTaiwanRoutingRevenue(input);

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
