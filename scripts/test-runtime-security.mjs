import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { createHmac } from "node:crypto";
import handler from "../api/runtime.mjs";

function request(method, url, body = "", headers = {}) {
  const req = Readable.from(body ? [Buffer.from(body)] : []);
  req.method = method;
  req.url = url;
  req.headers = { host: "localhost", ...headers };
  return req;
}

function response() {
  return {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    end(value) { this.body = value; }
  };
}

async function run(req) {
  const res = response();
  await handler(req, res);
  return { status: res.statusCode, headers: res.headers, body: JSON.parse(res.body) };
}

process.env.SKYGRID_INGEST_SECRET = "test-secret";
const raw = JSON.stringify({ source: "test", type: "outage", secretNote: "must-not-echo" });
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", process.env.SKYGRID_INGEST_SECRET).update(`${timestamp}.${raw}`).digest("hex");

const unsigned = await run(request("POST", "/api/skygrid/intake", raw, { "content-type": "application/json" }));
assert.equal(unsigned.status, 401);

const signed = await run(request("POST", "/api/skygrid/intake", raw, {
  "content-type": "application/json",
  "x-skygrid-timestamp": timestamp,
  "x-skygrid-signature": `sha256=${signature}`
}));
assert.equal(signed.status, 202);
assert.equal(signed.body.payloadEchoed, false);
assert.equal(JSON.stringify(signed.body).includes("must-not-echo"), false);

const badType = await run(request("POST", "/api/build-pad/quote", "{}", { "content-type": "text/plain" }));
assert.equal(badType.status, 415);

const proof = await run(request("GET", "/api/autodrill/latest"));
assert.equal(proof.status, 424);
assert.equal(proof.body.synthetic_pass_removed, true);

const health = await run(request("GET", "/health.json"));
assert.equal(health.status, 200);
assert.equal(health.body.process_healthy, true);
assert.equal(typeof health.body.ready, "boolean");
assert.equal(health.headers["X-Content-Type-Options"], "nosniff");

console.log("runtime security tests passed");
