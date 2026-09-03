import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  resolveOperatorConfig,
  validateOperatorRuntimePolicy
} from "../config/skygrid-operator.mjs";

const config = resolveOperatorConfig();
if (config.vercelBypass) {
  throw new Error("vercel_build_bypass_forbidden");
}

const runtimePolicy = Object.freeze({
  payment_execution: false,
  device_activation: false,
  production_failover: false,
  private_data_movement: false
});

const health = {
  ok: true,
  status: "online",
  service: "SKYGRID Emergency Data On-Ramp",
  operator: config.operator,
  mode: "controlled_pilot",
  sentinel: "fail_closed",
  runtime: "vercel-static",
  vercel_bypass: false,
  ...runtimePolicy,
  runtime_policy: runtimePolicy
};

validateOperatorRuntimePolicy(health);

const outputDir = path.resolve(process.cwd(), "dist");
await mkdir(outputDir, { recursive: true });
await copyFile(
  path.resolve(process.cwd(), "public", "index.html"),
  path.join(outputDir, "index.html")
);
await writeFile(
  path.join(outputDir, "health.json"),
  `${JSON.stringify(health, null, 2)}\n`,
  "utf8"
);

console.log("SKYGRID Vercel controlled-pilot artifact emitted fail-closed");
