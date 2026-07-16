import express from "express";
import handler from "../api/runtime.mjs";

const args = process.argv.slice(2);
let cliPort = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    cliPort = args[i + 1];
  }
}

const port = Number(process.env.PORT || cliPort || 3000);
const app = express();

app.use((req, res) => {
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

app.listen(port, "0.0.0.0", () => {
  console.log(`SKYGRID local runtime ready at http://0.0.0.0:${port}`);
});
