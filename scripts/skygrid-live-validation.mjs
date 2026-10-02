import { mkdir, writeFile } from "node:fs/promises";
import { runLiveValidation } from "../lib/skygrid-live-validation.mjs";

const baseUrl =
  process.env.SKYGRID_LIVE_VALIDATION_BASE_URL ||
  "https://api.skygrid-protocol.net";

const targets = (
  process.env.SKYGRID_LIVE_VALIDATION_TARGETS ||
  "/health.json,/dispatch,/api/highway/status"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const allowedHosts = (
  process.env.SKYGRID_LIVE_VALIDATION_ALLOWED_HOSTS ||
  "api.skygrid-protocol.net,aura-sky.skygrid-protocol.net"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const receipt = await runLiveValidation({
  baseUrl,
  targets,
  allowedHosts
});

await mkdir("artifacts/pnpk/proofs", { recursive: true });
await writeFile(
  "artifacts/pnpk/proofs/live-validation-latest.json",
  JSON.stringify(receipt, null, 2) + "\n",
  "utf8"
);

console.log(JSON.stringify(receipt, null, 2));

if (receipt.decision !== "LIVE_VALIDATION_PASS") {
  process.exit(1);
}
