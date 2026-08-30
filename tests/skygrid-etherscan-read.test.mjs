import assert from "node:assert/strict";
import test from "node:test";

import {
  accessTokenMatches,
  evaluateEtherscanRead,
  OPERATIONS
} from "../api/skygrid/etherscan-read.mjs";

const NOW = "2026-08-25T18:00:00.000Z";
const API_KEY = "server-only-api-key";
const ADDRESS = "0x1111111111111111111111111111111111111111";
const HASH = `0x${"a".repeat(64)}`;

function response({ ok = true, status = 200, payload = {} } = {}) {
  return { ok, status, async json() { return payload; } };
}

function base(overrides = {}) {
  return {
    apiKey: API_KEY,
    allowedChainIds: "1,8453,534352",
    authorized: true,
    now: () => NOW,
    ...overrides
  };
}

test("exposes exactly three read-only operations", () => {
  assert.deepEqual(Object.keys(OPERATIONS), [
    "balance",
    "transaction_receipt",
    "token_info"
  ]);
  assert.equal("eth_sendRawTransaction" in OPERATIONS, false);
});

test("denies requests without the separate SKYGRID read token", async () => {
  let called = false;
  const result = await evaluateEtherscanRead(base({
    authorized: false,
    operation: "balance",
    chainId: "8453",
    input: { address: ADDRESS },
    fetchImpl: async () => { called = true; return response(); }
  }));

  assert.equal(called, false);
  assert.equal(result.status, 401);
  assert.equal(result.body.reason, "read_access_denied");
  assert.equal(result.body.execution_allowed, false);
});

test("fails closed when server configuration is missing", async () => {
  let called = false;
  const result = await evaluateEtherscanRead({
    authorized: true,
    operation: "balance",
    chainId: "8453",
    input: { address: ADDRESS },
    fetchImpl: async () => { called = true; return response(); },
    now: () => NOW
  });

  assert.equal(called, false);
  assert.equal(result.status, 503);
  assert.equal(result.body.reason, "etherscan_configuration_missing");
});

test("rejects mutating or arbitrary Etherscan operations before fetch", async () => {
  let called = false;
  const result = await evaluateEtherscanRead(base({
    operation: "eth_sendRawTransaction",
    chainId: "1",
    input: {},
    fetchImpl: async () => { called = true; return response(); }
  }));

  assert.equal(called, false);
  assert.equal(result.status, 400);
  assert.equal(result.body.reason, "operation_not_allowlisted");
  assert.equal(result.body.policy.transaction_broadcast, false);
});

test("rejects chains outside the server allowlist before fetch", async () => {
  let called = false;
  const result = await evaluateEtherscanRead(base({
    operation: "balance",
    chainId: "42161",
    input: { address: ADDRESS },
    fetchImpl: async () => { called = true; return response(); }
  }));

  assert.equal(called, false);
  assert.equal(result.status, 403);
  assert.equal(result.body.reason, "chain_id_not_allowed");
});

test("reads a balance with fixed module and action without exposing the API key", async () => {
  let observedUrl;
  const result = await evaluateEtherscanRead(base({
    operation: "balance",
    chainId: "8453",
    input: { address: ADDRESS.toUpperCase().replace("0X", "0x") },
    fetchImpl: async (url, options) => {
      observedUrl = url;
      assert.equal(options.method, "GET");
      return response({ payload: { status: "1", message: "OK", result: "12345" } });
    }
  }));

  assert.equal(observedUrl.searchParams.get("module"), "account");
  assert.equal(observedUrl.searchParams.get("action"), "balance");
  assert.equal(observedUrl.searchParams.get("chainid"), "8453");
  assert.equal(observedUrl.searchParams.get("address"), ADDRESS);
  assert.equal(observedUrl.searchParams.get("tag"), "latest");
  assert.equal(result.status, 200);
  assert.equal(result.body.data.balance_wei, "12345");
  assert.equal(result.body.execution_allowed, false);
  assert.equal(JSON.stringify(result.body).includes(API_KEY), false);
});

test("returns a bounded transaction receipt summary without raw logs", async () => {
  const result = await evaluateEtherscanRead(base({
    operation: "transaction_receipt",
    chainId: "1",
    input: { txhash: HASH },
    fetchImpl: async () => response({ payload: {
      jsonrpc: "2.0",
      id: 1,
      result: {
        transactionHash: HASH,
        status: "0x1",
        blockNumber: "0x10",
        blockHash: `0x${"b".repeat(64)}`,
        from: ADDRESS,
        to: null,
        contractAddress: ADDRESS,
        gasUsed: "0x5208",
        effectiveGasPrice: "0x1",
        type: "0x2",
        logs: [{ data: "sensitive-unbounded-log" }, {}]
      }
    } })
  }));

  assert.equal(result.status, 200);
  assert.equal(result.body.data.transaction_hash, HASH);
  assert.equal(result.body.data.logs_count, 2);
  assert.equal("logs" in result.body.data, false);
  assert.equal(JSON.stringify(result.body).includes("sensitive-unbounded-log"), false);
});

test("requires explicit PRO opt-in for token metadata", async () => {
  let called = false;
  const result = await evaluateEtherscanRead(base({
    operation: "token_info",
    chainId: "1",
    input: { contractaddress: ADDRESS },
    fetchImpl: async () => { called = true; return response(); }
  }));

  assert.equal(called, false);
  assert.equal(result.status, 403);
  assert.equal(result.body.reason, "pro_endpoint_not_enabled");
});

test("sanitizes token metadata when the PRO endpoint is enabled", async () => {
  const result = await evaluateEtherscanRead(base({
    proEndpointsEnabled: true,
    operation: "token_info",
    chainId: "1",
    input: { contractaddress: ADDRESS },
    fetchImpl: async () => response({ payload: {
      status: "1",
      message: "OK",
      result: [{
        contractAddress: ADDRESS,
        tokenName: "Aura",
        symbol: "AURA",
        divisor: "18",
        tokenType: "ERC20",
        totalSupply: "1000000",
        blueCheckmark: "false",
        description: "read-only metadata",
        website: "https://example.test",
        tokenPriceUSD: "1.00",
        image: "https://example.test/aura.png",
        unexpectedSecret: "must-not-pass-through"
      }]
    } })
  }));

  assert.equal(result.status, 200);
  assert.equal(result.body.data.symbol, "AURA");
  assert.equal("unexpectedSecret" in result.body.data, false);
});

test("compares access tokens without accepting empty values", () => {
  assert.equal(accessTokenMatches("same-token", "same-token"), true);
  assert.equal(accessTokenMatches("wrong-token", "same-token"), false);
  assert.equal(accessTokenMatches("", ""), false);
});
