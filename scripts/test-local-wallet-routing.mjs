import assert from "node:assert/strict";
import localRuntimeRouter from "./skygrid-local-runtime-router.mjs";
import { SKYGRID_WALLET_LANES } from "../config/skygrid-wallet-lanes.mjs";

const TEST_ADDRESS = "0x1111111111111111111111111111111111111111";
const BASE_RPC_URL = "https://base.local-route.test";
const OPTIMISM_RPC_URL = "https://optimism.local-route.test";

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
    }
  };
}

async function invoke(url) {
  const req = { method: "GET", url, headers: { host: "localhost" } };
  const res = createResponse();
  await localRuntimeRouter(req, res);
  return res;
}

function laneFromUrl(url) {
  if (String(url) === BASE_RPC_URL) return SKYGRID_WALLET_LANES.lanes.base;
  if (String(url) === OPTIMISM_RPC_URL) return SKYGRID_WALLET_LANES.lanes.optimism;
  throw new Error(`Unexpected RPC URL: ${url}`);
}

function rpcResult(lane, method) {
  switch (method) {
    case "eth_chainId": return lane.chain.idHex;
    case "eth_blockNumber": return "0x1234";
    case "eth_getBalance": return "0x0";
    case "eth_call": return "0x0";
    case "eth_getCode": return "0x6001600055";
    default: throw new Error(`Unexpected RPC method: ${method}`);
  }
}

const originalFetch = globalThis.fetch;
const originalBaseRpc = process.env.SKYGRID_BASE_RPC_URL;
const originalOptimismRpc = process.env.SKYGRID_OPTIMISM_RPC_URL;

try {
  process.env.SKYGRID_BASE_RPC_URL = BASE_RPC_URL;
  process.env.SKYGRID_OPTIMISM_RPC_URL = OPTIMISM_RPC_URL;

  globalThis.fetch = async (url, options) => {
    const lane = laneFromUrl(url);
    const request = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      async json() {
        return { jsonrpc: "2.0", id: request.id, result: rpcResult(lane, request.method) };
      }
    };
  };

  {
    const res = await invoke(`/api/wallet/dual-lane?address=${TEST_ADDRESS}&lane=both`);
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.routing.requestedLaneCount, 2);
    assert.notEqual(payload.error, "route_not_found");
  }

  {
    const res = await invoke(`/api/aerodrome/wallet?address=${TEST_ADDRESS}`);
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.notEqual(payload.error, "route_not_found");
  }

  {
    const res = await invoke("/api/health");
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.route, "/api/health");
  }

  console.log("Local SKYGRID wallet route delegation checks passed.");
} finally {
  globalThis.fetch = originalFetch;
  if (originalBaseRpc === undefined) delete process.env.SKYGRID_BASE_RPC_URL;
  else process.env.SKYGRID_BASE_RPC_URL = originalBaseRpc;
  if (originalOptimismRpc === undefined) delete process.env.SKYGRID_OPTIMISM_RPC_URL;
  else process.env.SKYGRID_OPTIMISM_RPC_URL = originalOptimismRpc;
}
