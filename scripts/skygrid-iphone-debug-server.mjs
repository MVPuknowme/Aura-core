import { timingSafeEqual } from "node:crypto";
import express from "express";
import handler from "./skygrid-local-runtime-router.mjs";

const args = process.argv.slice(2);
let port = Number(process.env.PORT || 3000);
let host = process.env.SKYGRID_DEBUG_BIND_HOST || "127.0.0.1";
let allowLan = false;

for (let index = 0; index < args.length; index += 1) {
  if (args[index] === "--port" && args[index + 1]) {
    port = Number(args[index + 1]);
    index += 1;
  } else if (args[index] === "--host" && args[index + 1]) {
    host = args[index + 1];
    index += 1;
  } else if (args[index] === "--allow-lan") {
    allowLan = true;
  }
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid debug-server port.");
}

const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const lanBinding = !loopbackHosts.has(host);
const debugToken = String(process.env.SKYGRID_DEBUG_TOKEN || "");

if (lanBinding && !allowLan) {
  throw new Error(
    "Non-loopback binding requires --allow-lan. The default is loopback-only."
  );
}
if (lanBinding && debugToken.length < 24) {
  throw new Error(
    "SKYGRID_DEBUG_TOKEN must contain at least 24 characters for LAN debugging."
  );
}

function equalToken(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ""));
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

const app = express();
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-SKYGRID-Debug-Binding", lanBinding ? "lan-guarded" : "loopback");

  if (!lanBinding) return next();
  if (equalToken(req.headers["x-skygrid-debug-token"], debugToken)) {
    return next();
  }

  res.statusCode = 401;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify({
    ok: false,
    product: "SKYGRID Emergency Data On-Ramp",
    error: "debug_token_required"
  }, null, 2));
});

app.use((req, res) => {
  handler(req, res).catch((error) => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      product: "SKYGRID Emergency Data On-Ramp",
      error: "debug_runtime_error",
      message: String(error?.message || error)
    }, null, 2));
  });
});

app.listen(port, host, () => {
  const mode = lanBinding ? "LAN access guarded by X-SKYGRID-Debug-Token" : "loopback only";
  console.log(`SKYGRID debug runtime ready at http://${host}:${port} (${mode})`);
});
