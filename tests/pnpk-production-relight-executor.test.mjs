import assert from "node:assert/strict";
import test from "node:test";

import { executeProductionRelight } from "../lib/pnpk-production-relight-executor.mjs";

function approvedPreflight(overrides = {}) {
  return {
    schema: "pnpk.production-network-relight-preflight.v1",
    route_id: "skygrid:route:west-anchor",
    activation_grant_id: "grant-001",
    decision: "RELIGHT_APPROVED",
    receipt_hash: "sha256:preflight",
    authorization: {
      authenticated: true,
      route_id: "skygrid:route:west-anchor",
      grant_id: "grant-001",
      expires_at: "2026-10-01T15:40:00.000Z"
    },
    ...overrides
  };
}

test("executes only an authenticated exact-bound relight and requires post-health proof", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if (options.method === "POST") {
      return {
        ok: true,
        status: 202,
        async json() {
          return { accepted: true, operation_id: "relight-op-1" };
        }
      };
    }
    return {
      ok: true,
      status: 200,
      async json() {
        return { ok: true, route: "/health.json" };
      }
    };
  };

  const out = await executeProductionRelight({
    routeId: "skygrid:route:west-anchor",
    preflight: approvedPreflight(),
    executorUrl: "https://executor.skygrid-protocol.net/relight",
    healthUrl: "https://api.skygrid-protocol.net/health.json",
    executorToken: "test-token",
    now: new Date("2026-10-01T15:31:00.000Z"),
    fetchImpl
  });

  assert.equal(out.decision, "RELIGHT_COMPLETED");
  assert.equal(out.post_health_ok, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[1].options.method, "GET");
  assert.match(out.post_receipt_hash, /^sha256:[0-9a-f]{64}$/);
});

test("fails closed for route mismatch, expired preflight, or non-HTTPS executor", async () => {
  const neverFetch = async () => {
    throw new Error("fetch_should_not_run");
  };

  await assert.rejects(
    executeProductionRelight({
      routeId: "skygrid:route:other",
      preflight: approvedPreflight(),
      executorUrl: "https://executor.skygrid-protocol.net/relight",
      healthUrl: "https://api.skygrid-protocol.net/health.json",
      now: new Date("2026-10-01T15:31:00.000Z"),
      fetchImpl: neverFetch
    }),
    /relight_executor_route_mismatch/
  );

  await assert.rejects(
    executeProductionRelight({
      routeId: "skygrid:route:west-anchor",
      preflight: approvedPreflight(),
      executorUrl: "https://executor.skygrid-protocol.net/relight",
      healthUrl: "https://api.skygrid-protocol.net/health.json",
      now: new Date("2026-10-01T15:41:00.000Z"),
      fetchImpl: neverFetch
    }),
    /relight_executor_preflight_expired/
  );

  await assert.rejects(
    executeProductionRelight({
      routeId: "skygrid:route:west-anchor",
      preflight: approvedPreflight(),
      executorUrl: "http://executor.invalid/relight",
      healthUrl: "https://api.skygrid-protocol.net/health.json",
      now: new Date("2026-10-01T15:31:00.000Z"),
      fetchImpl: neverFetch
    }),
    /relight_executor_https_required/
  );
});

test("returns rollback required when post-relight health proof fails", async () => {
  const fetchImpl = async (_url, options = {}) => {
    if (options.method === "POST") {
      return {
        ok: true,
        status: 202,
        async json() { return { accepted: true, operation_id: "relight-op-2" }; }
      };
    }
    return {
      ok: false,
      status: 503,
      async json() { return { ok: false }; }
    };
  };

  const out = await executeProductionRelight({
    routeId: "skygrid:route:west-anchor",
    preflight: approvedPreflight(),
    executorUrl: "https://executor.skygrid-protocol.net/relight",
    healthUrl: "https://api.skygrid-protocol.net/health.json",
    now: new Date("2026-10-01T15:31:00.000Z"),
    fetchImpl
  });

  assert.equal(out.decision, "ROLLBACK_REQUIRED");
  assert.equal(out.post_health_ok, false);
});
