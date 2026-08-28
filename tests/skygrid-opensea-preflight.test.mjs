import assert from "node:assert/strict";
import test from "node:test";

import { evaluateOpenSeaPreflight } from "../api/skygrid/opensea-preflight.mjs";

const NOW = "2026-08-25T09:30:00.000Z";
const CONTRACT = "0x1111111111111111111111111111111111111111";

function response({ ok = true, status = 200, payload = {} } = {}) {
  return {
    ok,
    status,
    async json() {
      return payload;
    }
  };
}

test("fails closed before contacting OpenSea when configuration is incomplete", async () => {
  let called = false;
  const result = await evaluateOpenSeaPreflight({
    fetchImpl: async () => {
      called = true;
      return response();
    },
    now: () => NOW
  });

  assert.equal(called, false);
  assert.equal(result.status, 503);
  assert.equal(result.body.ready, false);
  assert.equal(result.body.sentinel, "fail_closed");
  assert.equal(result.body.reason, "preflight_configuration_missing");
  assert.equal(result.body.execution_allowed, false);
});

test("passes only when the pinned collection chain and contract match", async () => {
  const result = await evaluateOpenSeaPreflight({
    apiKey: "test-key",
    expectedChain: "base",
    expectedContract: CONTRACT.toUpperCase().replace("0X", "0x"),
    fetchImpl: async () => response({
      payload: {
        collection: "bored-collection-721084995",
        name: "Bored Collection",
        safelist_status: "not_requested",
        is_disabled: false,
        contracts: [{ chain: "base", address: CONTRACT }]
      }
    }),
    now: () => NOW
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.ready, true);
  assert.equal(result.body.state, "preflight_passed");
  assert.equal(result.body.reason, "collection_identity_verified");
  assert.equal(result.body.execution_allowed, false);
  assert.deepEqual(result.body.observed.contracts, [
    { chain: "base", address: CONTRACT }
  ]);
});

test("fails closed when OpenSea returns a different contract", async () => {
  const result = await evaluateOpenSeaPreflight({
    apiKey: "test-key",
    expectedChain: "base",
    expectedContract: CONTRACT,
    fetchImpl: async () => response({
      payload: {
        collection: "bored-collection-721084995",
        is_disabled: false,
        contracts: [{
          chain: "base",
          address: "0x2222222222222222222222222222222222222222"
        }]
      }
    }),
    now: () => NOW
  });

  assert.equal(result.status, 503);
  assert.equal(result.body.ready, false);
  assert.equal(result.body.reason, "collection_identity_mismatch");
  assert.equal(result.body.checks.contract_matches, false);
});

test("fails closed when OpenSea does not resolve the collection", async () => {
  const result = await evaluateOpenSeaPreflight({
    apiKey: "test-key",
    expectedChain: "base",
    expectedContract: CONTRACT,
    fetchImpl: async () => response({ ok: false, status: 404 }),
    now: () => NOW
  });

  assert.equal(result.status, 503);
  assert.equal(result.body.ready, false);
  assert.equal(result.body.reason, "opensea_collection_unavailable");
  assert.equal(result.body.upstream_status, 404);
});

