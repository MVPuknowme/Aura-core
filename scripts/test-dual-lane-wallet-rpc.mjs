import assert from "node:assert/strict";
import handler from "../api/wallet/dual-lane.mjs";
import { SKYGRID_WALLET_LANES } from "../config/skygrid-wallet-lanes.mjs";

const TEST_ADDRESS = "0x1111111111111111111111111111111111111111";
const BASE_RPC_URL = "https://base.rpc.test";
const OPTIMISM_RPC_URL = "https://optimism.rpc.test";
const ONE_ETH_HEX = `0x${(10n ** 18n).toString(16)}`;
const TWO_ETH_HEX = `0x${(2n * 10n ** 18n).toString(16)}`;
const HUNDRED_AERO_HEX = `0x${(100n * 10n ** 18n).toString(16)}`;
const FIFTY_OP_HEX = `0x${(50n * 10n ** 18n).toString(16)}`;

function createResponse() {
  const headers = new Map();
  return {
    statusCode: 200,
    body: "",
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
    },
    end(value = "") {
      this.body = value;
    },
    json() {
      return JSON.parse(this.body);
    },
    header(name) {
      return headers.get(String(name).toLowerCase());
    }
  };
}

async function invoke({ method = "GET", url = "/api/wallet/dual-lane", headers = {} } = {}) {
  const req = { method, url, headers: { host: "localhost", ...headers } };
  const res = createResponse();
  await handler(req, res);
  return res;
}

function laneFromUrl(url) {
  if (String(url) === BASE_RPC_URL) return "base";
  if (String(url) === OPTIMISM_RPC_URL) return "optimism";
  throw new Error(`Unexpected RPC URL: ${url}`);
}

function rpcResult(laneKey, method) {
  const lane = SKYGRID_WALLET_LANES.lanes[laneKey];
  switch (method) {
    case "eth_chainId":
      return lane.chain.idHex;
    case "eth_blockNumber":
      return laneKey === "base" ? "0x1234" : "0x5678";
    case "eth_getBalance":
      return laneKey === "base" ? ONE_ETH_HEX : TWO_ETH_HEX;
    case "eth_call":
      return laneKey === "base" ? HUNDRED_AERO_HEX : FIFTY_OP_HEX;
    case "eth_getCode":
      return "0x6001600055";
    default:
      throw new Error(`Unexpected test RPC method: ${method}`);
  }
}

const managedEnvironmentVariables = [
  "SKYGRID_WALLET_ADDRESS",
  "SKYGRID_AERODROME_WALLET_ADDRESS",
  "SKYGRID_BASE_RPC_URL",
  "SKYGRID_OPTIMISM_RPC_URL",
  "SKYGRID_BASE_RPC_TIMEOUT_MS",
  "SKYGRID_OPTIMISM_RPC_TIMEOUT_MS",
  "SKYGRID_WALLET_RPC_TIMEOUT_MS"
];
const originalEnvironment = Object.fromEntries(
  managedEnvironmentVariables.map((name) => [name, process.env[name]])
);
const originalFetch = globalThis.fetch;

try {
  for (const name of managedEnvironmentVariables) delete process.env[name];
  process.env.SKYGRID_BASE_RPC_URL = BASE_RPC_URL;
  process.env.SKYGRID_OPTIMISM_RPC_URL = OPTIMISM_RPC_URL;

  globalThis.fetch = async (url, options) => {
    const laneKey = laneFromUrl(url);
    const request = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          jsonrpc: "2.0",
          id: request.id,
          result: rpcResult(laneKey, request.method)
        };
      }
    };
  };

  {
    const res = await invoke({ method: "POST" });
    assert.equal(res.statusCode, 405);
    assert.equal(res.json().error, "method_not_allowed");
    assert.equal(res.header("allow"), "GET");
  }

  {
    const res = await invoke({ url: `/api/wallet/dual-lane?address=${TEST_ADDRESS}&lane=arbitrum` });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, "invalid_lane");
  }

  {
    const res = await invoke();
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, "invalid_wallet_address");
  }

  {
    const res = await invoke({ url: `/api/wallet/dual-lane?address=${TEST_ADDRESS}` });
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.linked, true);
    assert.equal(payload.mode, "read_only_non_custodial");
    assert.equal(payload.routing.requestedLane, "both");
    assert.equal(payload.routing.requestedLaneCount, 2);
    assert.equal(payload.routing.healthyLaneCount, 2);
    assert.equal(payload.wallet.address, TEST_ADDRESS);
    assert.equal(payload.lanes.base.chain.id, 8453);
    assert.equal(payload.lanes.optimism.chain.id, 10);
    assert.equal(payload.lanes.base.balances.ETH.formatted, "1");
    assert.equal(payload.lanes.base.balances.AERO.formatted, "100");
    assert.equal(payload.lanes.optimism.balances.ETH.formatted, "2");
    assert.equal(payload.lanes.optimism.balances.OP.formatted, "50");
    assert.equal(payload.lanes.base.contractsVerified, true);
    assert.equal(payload.lanes.optimism.contractsVerified, true);
    assert.equal(payload.permissions.signsTransactions, false);
    assert.equal(payload.permissions.broadcastsTransactions, false);
    assert.equal(payload.permissions.grantsTokenApprovals, false);
    assert.equal(payload.permissions.executesSwaps, false);
  }

  {
    const res = await invoke({
      url: `/api/wallet/dual-lane?address=${TEST_ADDRESS}&lane=optimism`
    });
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.routing.requestedLane, "optimism");
    assert.equal(payload.routing.requestedLaneCount, 1);
    assert.equal(payload.lanes.base, undefined);
    assert.equal(payload.lanes.optimism.chain.id, 10);
  }

  {
    process.env.SKYGRID_WALLET_ADDRESS = TEST_ADDRESS;
    const res = await invoke({ url: "/api/wallet/dual-lane?lane=base" });
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.wallet.addressSource, "environment");
    assert.equal(payload.lanes.base.chain.id, 8453);
  }

  {
    globalThis.fetch = async (url, options) => {
      const laneKey = laneFromUrl(url);
      const request = JSON.parse(options.body);
      const result = laneKey === "optimism" && request.method === "eth_chainId"
        ? "0x1"
        : rpcResult(laneKey, request.method);
      return {
        ok: true,
        status: 200,
        async json() {
          return { jsonrpc: "2.0", id: request.id, result };
        }
      };
    };

    const res = await invoke({ url: `/api/wallet/dual-lane?address=${TEST_ADDRESS}` });
    const payload = res.json();
    assert.equal(res.statusCode, 502);
    assert.equal(payload.ok, false);
    assert.equal(payload.linked, false);
    assert.equal(payload.routing.failClosed, true);
    assert.equal(payload.routing.healthyLaneCount, 1);
    assert.equal(payload.lanes.base.ok, true);
    assert.equal(payload.lanes.optimism.ok, false);
    assert.equal(payload.lanes.optimism.error, "wrong_rpc_chain");
  }

  console.log("Base and Optimism dual-lane wallet RPC regression checks passed.");
} finally {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
