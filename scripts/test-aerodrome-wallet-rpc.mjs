import assert from "node:assert/strict";
import handler from "../api/aerodrome/wallet.mjs";
import { AERODROME_BASE_RPC } from "../config/aerodrome-base-rpc.mjs";

const TEST_ADDRESS = "0x1111111111111111111111111111111111111111";
const ONE_ETH_HEX = `0x${(10n ** 18n).toString(16)}`;
const HUNDRED_AERO_HEX = `0x${(100n * 10n ** 18n).toString(16)}`;

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

async function invoke({ method = "GET", url = "/api/aerodrome/wallet", headers = {} } = {}) {
  const req = { method, url, headers: { host: "localhost", ...headers } };
  const res = createResponse();
  await handler(req, res);
  return res;
}

function rpcResult(method) {
  switch (method) {
    case "eth_chainId": return AERODROME_BASE_RPC.chain.idHex;
    case "eth_blockNumber": return "0x1234";
    case "eth_getBalance": return ONE_ETH_HEX;
    case "eth_call": return HUNDRED_AERO_HEX;
    case "eth_getCode": return "0x6001600055";
    default: throw new Error(`Unexpected test RPC method: ${method}`);
  }
}

const originalFetch = globalThis.fetch;
const originalWallet = process.env.SKYGRID_AERODROME_WALLET_ADDRESS;
const originalRpcUrl = process.env.SKYGRID_BASE_RPC_URL;

try {
  delete process.env.SKYGRID_AERODROME_WALLET_ADDRESS;
  process.env.SKYGRID_BASE_RPC_URL = "https://rpc.test.invalid";

  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      async json() {
        return { jsonrpc: "2.0", id: request.id, result: rpcResult(request.method) };
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
    const res = await invoke();
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, "invalid_wallet_address");
  }

  {
    const res = await invoke({ url: "/api/aerodrome/wallet?address=not-a-wallet" });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error, "invalid_wallet_address");
  }

  {
    const res = await invoke({ url: `/api/aerodrome/wallet?address=${TEST_ADDRESS}` });
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.linked, true);
    assert.equal(payload.mode, "read_only_non_custodial");
    assert.equal(payload.wallet.address, TEST_ADDRESS);
    assert.equal(payload.wallet.addressSource, "query");
    assert.equal(payload.chain.id, 8453);
    assert.equal(payload.balances.ETH.formatted, "1");
    assert.equal(payload.balances.AERO.formatted, "100");
    assert.equal(payload.aerodrome.contractsVerified, true);
    assert.equal(payload.permissions.signsTransactions, false);
    assert.equal(payload.permissions.broadcastsTransactions, false);
    assert.equal(payload.permissions.grantsTokenApprovals, false);
  }

  {
    process.env.SKYGRID_AERODROME_WALLET_ADDRESS = TEST_ADDRESS;
    const res = await invoke();
    const payload = res.json();
    assert.equal(res.statusCode, 200);
    assert.equal(payload.wallet.addressSource, "environment");
  }

  {
    globalThis.fetch = async (_url, options) => {
      const request = JSON.parse(options.body);
      const result = request.method === "eth_chainId" ? "0x1" : rpcResult(request.method);
      return {
        ok: true,
        status: 200,
        async json() {
          return { jsonrpc: "2.0", id: request.id, result };
        }
      };
    };

    const res = await invoke({ url: `/api/aerodrome/wallet?address=${TEST_ADDRESS}` });
    assert.equal(res.statusCode, 502);
    assert.equal(res.json().error, "wrong_rpc_chain");
  }

  console.log("Aerodrome wallet RPC regression checks passed.");
} finally {
  globalThis.fetch = originalFetch;

  if (originalWallet === undefined) delete process.env.SKYGRID_AERODROME_WALLET_ADDRESS;
  else process.env.SKYGRID_AERODROME_WALLET_ADDRESS = originalWallet;

  if (originalRpcUrl === undefined) delete process.env.SKYGRID_BASE_RPC_URL;
  else process.env.SKYGRID_BASE_RPC_URL = originalRpcUrl;
}
