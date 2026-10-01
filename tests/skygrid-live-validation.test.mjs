import assert from "node:assert/strict";
import test from "node:test";

import { runLiveValidation } from "../lib/skygrid-live-validation.mjs";

test("validates only allowlisted HTTPS SKYGRID routes and emits a receipt", async () => {
  const seen = [];
  const fetchImpl = async (url, options = {}) => {
    seen.push({ url, options });
    return {
      ok: true,
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      async text() {
        return JSON.stringify({ ok: true });
      }
    };
  };

  const out = await runLiveValidation({
    baseUrl: "https://api.skygrid-protocol.net",
    targets: ["/health.json", "/dispatch", "/api/highway/status"],
    allowedHosts: ["api.skygrid-protocol.net"],
    fetchImpl,
    observedAt: new Date("2026-10-01T16:10:00.000Z")
  });

  assert.equal(out.decision, "LIVE_VALIDATION_PASS");
  assert.equal(out.results.length, 3);
  assert.equal(seen.every((entry) => entry.options.method === "GET"), true);
  assert.match(out.receipt_hash, /^sha256:[0-9a-f]{64}$/);
});

test("fails closed for non-HTTPS or non-allowlisted targets", async () => {
  await assert.rejects(
    runLiveValidation({
      baseUrl: "http://api.skygrid-protocol.net",
      targets: ["/health.json"],
      allowedHosts: ["api.skygrid-protocol.net"],
      fetchImpl: async () => { throw new Error("should_not_fetch"); }
    }),
    /live_validation_https_required/
  );

  await assert.rejects(
    runLiveValidation({
      baseUrl: "https://example.com",
      targets: ["/health.json"],
      allowedHosts: ["api.skygrid-protocol.net"],
      fetchImpl: async () => { throw new Error("should_not_fetch"); }
    }),
    /live_validation_host_not_allowed/
  );
});

test("reports fail closed when any required route is unhealthy", async () => {
  const fetchImpl = async (url) => ({
    ok: !url.includes("/dispatch"),
    status: url.includes("/dispatch") ? 503 : 200,
    headers: new Map(),
    async text() { return ""; }
  });

  const out = await runLiveValidation({
    baseUrl: "https://api.skygrid-protocol.net",
    targets: ["/health.json", "/dispatch"],
    allowedHosts: ["api.skygrid-protocol.net"],
    fetchImpl
  });

  assert.equal(out.decision, "FAIL_CLOSED");
  assert.equal(out.results.some((item) => item.ok === false), true);
});
