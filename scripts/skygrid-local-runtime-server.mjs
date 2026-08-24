import "./skygrid-ci-auth-bootstrap.mjs";
import express from "express";
import handler from "./skygrid-local-runtime-router.mjs";
import { resolveOperatorConfig } from "../config/skygrid-operator.mjs";

const args = process.argv.slice(2);
let cliPort = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    cliPort = args[i + 1];
  }
}

const operatorConfig = resolveOperatorConfig();
const port = Number(process.env.PORT || cliPort || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("invalid_local_runtime_port");
}

const defaultHost = operatorConfig.runtimeMode === "local-container" ? "0.0.0.0" : "127.0.0.1";
const host = String(process.env.HOST || defaultHost).trim();
const allowedHosts = new Set(["127.0.0.1", "0.0.0.0", "::1", "::"]);
if (!allowedHosts.has(host)) {
  throw new Error("invalid_local_runtime_host");
}

const app = express();

app.use((req, res) => {
  res.setHeader("X-SKYGRID-Operator", operatorConfig.operator);
  res.setHeader("X-SKYGRID-Runtime-Mode", operatorConfig.runtimeMode);
  if (operatorConfig.vercelBypass) {
    res.setHeader("X-SKYGRID-Vercel-Fallback", "local-container");
  }

  handler(req, res).catch((error) => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      error: String(error?.message || error),
      runtime: "skygrid-local-runtime-server"
    }, null, 2));
  });
});

app.listen(port, host, () => {
  console.log(`SKYGRID local runtime ready at http://${host}:${port}`);
});
