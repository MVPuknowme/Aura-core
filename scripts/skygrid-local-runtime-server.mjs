import express from "express";
import runtimeHandler from "../api/runtime.mjs";
import deploymentBrokerHandler from "../api/deployment-broker-v2.mjs";

const args = process.argv.slice(2);
let cliPort = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    cliPort = args[i + 1];
  }
}

const port = Number(process.env.PORT || cliPort || 3000);
const app = express();

function isDeploymentBrokerRoute(url = "") {
  const pathname = new URL(url || "/", "http://127.0.0.1").pathname;
  return (
    pathname === "/api/deployment-broker/health" ||
    pathname === "/api/enrollments" ||
    /^\/enroll\/[^/]+$/.test(pathname) ||
    /^\/api\/enrollments\/[^/]+\/redeem$/.test(pathname)
  );
}

app.use((req, res) => {
  const handler = isDeploymentBrokerRoute(req.url)
    ? deploymentBrokerHandler
    : runtimeHandler;

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

app.listen(port, "127.0.0.1", () => {
  console.log(`SKYGRID local runtime ready at http://127.0.0.1:${port}`);
});
