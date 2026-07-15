import { AERODROME_BASE_RPC } from "../../config/aerodrome-base-rpc.mjs";

const PRODUCT = AERODROME_BASE_RPC.product;
const DEFAULT_TIMEOUT_MS = 8_000;
const BALANCE_OF_SELECTOR = "70a08231";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.end(JSON.stringify(payload, null, 2));
}

function isAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || ""));
}

function encodeBalanceOf(address) {
  return `0x${BALANCE_OF_SELECTOR}${address.slice(2).toLowerCase().padStart(64, "0")}`;
}

function formatUnits(hexValue, decimals = 18) {
  const value = BigInt(hexValue || "0x0");
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const remainder = value % base;
  const fraction = remainder.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function timeoutMs() {
  const configured = Number(process.env.SKYGRID_BASE_RPC_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(configured) && configured >= 500 && configured <= 30_000
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

async function rpc(method, params = []) {
  if (!AERODROME_BASE_RPC.allowedRpcMethods.includes(method)) {
    throw new Error(`RPC method is not allowlisted: ${method}`);
  }

  const rpcUrl = process.env.SKYGRID_BASE_RPC_URL || AERODROME_BASE_RPC.chain.defaultRpcUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: method, method, params }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Base RPC returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.error) {
      throw new Error(`Base RPC ${method} failed: ${payload.error.message || "unknown error"}`);
    }

    if (typeof payload?.result !== "string") {
      throw new Error(`Base RPC ${method} returned an invalid result`);
    }

    return payload.result;
  } finally {
    clearTimeout(timer);
  }
}

function hasContractCode(code) {
  return typeof code === "string" && code !== "0x" && code !== "0x0";
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, {
      ok: false,
      product: PRODUCT,
      error: "method_not_allowed",
      message: "Use GET. This adapter is read-only."
    });
  }

  const host = req.headers?.host || "localhost";
  const url = new URL(req.url || "/api/aerodrome/wallet", `https://${host}`);
  const queryAddress = url.searchParams.get("address");
  const configuredAddress = process.env.SKYGRID_AERODROME_WALLET_ADDRESS || "";
  const walletAddress = queryAddress || configuredAddress;

  if (!isAddress(walletAddress)) {
    return sendJson(res, 400, {
      ok: false,
      product: PRODUCT,
      error: "invalid_wallet_address",
      message: "Provide a valid public EVM wallet address using ?address=0x... or SKYGRID_AERODROME_WALLET_ADDRESS. Never provide a seed phrase or private key."
    });
  }

  try {
    const [chainIdHex, blockNumberHex, nativeBalanceHex, aeroBalanceHex, aeroCode, routerCode] = await Promise.all([
      rpc("eth_chainId"),
      rpc("eth_blockNumber"),
      rpc("eth_getBalance", [walletAddress, "latest"]),
      rpc("eth_call", [
        {
          to: AERODROME_BASE_RPC.contracts.aeroToken,
          data: encodeBalanceOf(walletAddress)
        },
        "latest"
      ]),
      rpc("eth_getCode", [AERODROME_BASE_RPC.contracts.aeroToken, "latest"]),
      rpc("eth_getCode", [AERODROME_BASE_RPC.contracts.router, "latest"])
    ]);

    const chainId = Number(BigInt(chainIdHex));
    if (chainId !== AERODROME_BASE_RPC.chain.id) {
      return sendJson(res, 502, {
        ok: false,
        product: PRODUCT,
        error: "wrong_rpc_chain",
        expectedChainId: AERODROME_BASE_RPC.chain.id,
        receivedChainId: chainId
      });
    }

    const contractsVerified = hasContractCode(aeroCode) && hasContractCode(routerCode);
    if (!contractsVerified) {
      return sendJson(res, 502, {
        ok: false,
        product: PRODUCT,
        error: "aerodrome_contract_verification_failed",
        chainId,
        contracts: {
          aeroToken: hasContractCode(aeroCode),
          router: hasContractCode(routerCode)
        }
      });
    }

    return sendJson(res, 200, {
      ok: true,
      linked: true,
      product: PRODUCT,
      integration: AERODROME_BASE_RPC.integration,
      mode: "read_only_non_custodial",
      wallet: {
        address: walletAddress,
        addressSource: queryAddress ? "query" : "environment"
      },
      chain: {
        id: chainId,
        idHex: chainIdHex,
        name: AERODROME_BASE_RPC.chain.name,
        latestBlock: BigInt(blockNumberHex).toString()
      },
      balances: {
        ETH: {
          rawHex: nativeBalanceHex,
          formatted: formatUnits(nativeBalanceHex, 18)
        },
        AERO: {
          token: AERODROME_BASE_RPC.contracts.aeroToken,
          rawHex: aeroBalanceHex,
          formatted: formatUnits(aeroBalanceHex, 18)
        }
      },
      aerodrome: {
        contractsVerified,
        contracts: AERODROME_BASE_RPC.contracts
      },
      rpc: {
        configuredByEnvironment: Boolean(process.env.SKYGRID_BASE_RPC_URL),
        timeoutMs: timeoutMs(),
        allowedMethods: AERODROME_BASE_RPC.allowedRpcMethods
      },
      permissions: AERODROME_BASE_RPC.safety,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const message = error?.name === "AbortError"
      ? "Base RPC request timed out"
      : String(error?.message || error);

    return sendJson(res, 502, {
      ok: false,
      linked: false,
      product: PRODUCT,
      error: "base_rpc_unavailable",
      message,
      failClosed: true,
      timestamp: new Date().toISOString()
    });
  }
}
