import { SKYGRID_WALLET_LANES } from "../../config/skygrid-wallet-lanes.mjs";

const PRODUCT = SKYGRID_WALLET_LANES.product;
const DEFAULT_TIMEOUT_MS = 8_000;
const BALANCE_OF_SELECTOR = "70a08231";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Wallet-Lanes", "base,optimism");
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

function timeoutMs(lane) {
  const configured = Number(
    process.env[lane.timeoutEnvironmentVariable]
      || process.env.SKYGRID_WALLET_RPC_TIMEOUT_MS
      || DEFAULT_TIMEOUT_MS
  );

  return Number.isFinite(configured) && configured >= 500 && configured <= 30_000
    ? configured
    : DEFAULT_TIMEOUT_MS;
}

function rpcUrl(lane) {
  return process.env[lane.rpcUrlEnvironmentVariable] || lane.chain.defaultRpcUrl;
}

async function rpc(lane, method, params = []) {
  if (!SKYGRID_WALLET_LANES.allowedRpcMethods.includes(method)) {
    throw new Error(`RPC method is not allowlisted: ${method}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs(lane));

  try {
    const response = await fetch(rpcUrl(lane), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `${lane.key}:${method}`,
        method,
        params
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`${lane.chain.name} RPC returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.error) {
      throw new Error(`${lane.chain.name} RPC ${method} failed: ${payload.error.message || "unknown error"}`);
    }

    if (typeof payload?.result !== "string") {
      throw new Error(`${lane.chain.name} RPC ${method} returned an invalid result`);
    }

    return payload.result;
  } finally {
    clearTimeout(timer);
  }
}

function hasContractCode(code) {
  return typeof code === "string" && code !== "0x" && code !== "0x0";
}

async function inspectLane(lane, walletAddress) {
  try {
    const contractEntries = Object.entries(lane.requiredContracts);
    const results = await Promise.all([
      rpc(lane, "eth_chainId"),
      rpc(lane, "eth_blockNumber"),
      rpc(lane, "eth_getBalance", [walletAddress, "latest"]),
      rpc(lane, "eth_call", [
        {
          to: lane.token.address,
          data: encodeBalanceOf(walletAddress)
        },
        "latest"
      ]),
      ...contractEntries.map(([, address]) => rpc(lane, "eth_getCode", [address, "latest"]))
    ]);

    const [chainIdHex, blockNumberHex, nativeBalanceHex, tokenBalanceHex, ...contractCodes] = results;
    const chainId = Number(BigInt(chainIdHex));

    if (chainId !== lane.chain.id) {
      return {
        ok: false,
        linked: false,
        error: "wrong_rpc_chain",
        expectedChainId: lane.chain.id,
        receivedChainId: chainId,
        failClosed: true
      };
    }

    const contractVerification = Object.fromEntries(
      contractEntries.map(([name, address], index) => [
        name,
        {
          address,
          deployedCode: hasContractCode(contractCodes[index])
        }
      ])
    );
    const contractsVerified = Object.values(contractVerification).every((entry) => entry.deployedCode);

    if (!contractsVerified) {
      return {
        ok: false,
        linked: false,
        error: "contract_verification_failed",
        chainId,
        contractsVerified,
        contracts: contractVerification,
        failClosed: true
      };
    }

    return {
      ok: true,
      linked: true,
      protocol: lane.protocol,
      chain: {
        id: chainId,
        idHex: chainIdHex,
        name: lane.chain.name,
        latestBlock: BigInt(blockNumberHex).toString()
      },
      balances: {
        ETH: {
          rawHex: nativeBalanceHex,
          formatted: formatUnits(nativeBalanceHex, lane.chain.nativeCurrency.decimals)
        },
        [lane.token.symbol]: {
          token: lane.token.address,
          rawHex: tokenBalanceHex,
          formatted: formatUnits(tokenBalanceHex, lane.token.decimals)
        }
      },
      contractsVerified,
      contracts: contractVerification,
      rpc: {
        configuredByEnvironment: Boolean(process.env[lane.rpcUrlEnvironmentVariable]),
        timeoutMs: timeoutMs(lane),
        allowedMethods: SKYGRID_WALLET_LANES.allowedRpcMethods
      }
    };
  } catch (error) {
    return {
      ok: false,
      linked: false,
      error: "rpc_unavailable",
      message: error?.name === "AbortError"
        ? `${lane.chain.name} RPC request timed out`
        : String(error?.message || error),
      failClosed: true
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, {
      ok: false,
      product: PRODUCT,
      error: "method_not_allowed",
      message: "Use GET. The dual-lane wallet adapter is read-only."
    });
  }

  const host = req.headers?.host || "localhost";
  const url = new URL(req.url || "/api/wallet/dual-lane", `https://${host}`);
  const requestedLane = String(url.searchParams.get("lane") || "both").toLowerCase();

  if (!SKYGRID_WALLET_LANES.allowedLaneValues.includes(requestedLane)) {
    return sendJson(res, 400, {
      ok: false,
      product: PRODUCT,
      error: "invalid_lane",
      allowed: SKYGRID_WALLET_LANES.allowedLaneValues
    });
  }

  const queryAddress = url.searchParams.get("address");
  const configuredAddress = process.env[SKYGRID_WALLET_LANES.walletEnvironmentVariable]
    || process.env[SKYGRID_WALLET_LANES.legacyWalletEnvironmentVariable]
    || "";
  const walletAddress = queryAddress || configuredAddress;

  if (!isAddress(walletAddress)) {
    return sendJson(res, 400, {
      ok: false,
      product: PRODUCT,
      error: "invalid_wallet_address",
      message: "Provide a valid public EVM wallet address. Never provide a seed phrase, private key, wallet password, or approval signature."
    });
  }

  const laneKeys = requestedLane === "both" ? ["base", "optimism"] : [requestedLane];
  const inspected = await Promise.all(
    laneKeys.map(async (laneKey) => [
      laneKey,
      await inspectLane(SKYGRID_WALLET_LANES.lanes[laneKey], walletAddress)
    ])
  );
  const lanes = Object.fromEntries(inspected);
  const allRequestedLanesHealthy = laneKeys.every((laneKey) => lanes[laneKey]?.ok === true);

  return sendJson(res, allRequestedLanesHealthy ? 200 : 502, {
    ok: allRequestedLanesHealthy,
    linked: allRequestedLanesHealthy,
    product: PRODUCT,
    integration: SKYGRID_WALLET_LANES.integration,
    mode: "read_only_non_custodial",
    routing: {
      requestedLane,
      requestedLaneCount: laneKeys.length,
      healthyLaneCount: laneKeys.filter((laneKey) => lanes[laneKey]?.ok === true).length,
      failClosed: !allRequestedLanesHealthy
    },
    wallet: {
      address: walletAddress,
      addressSource: queryAddress ? "query" : "environment"
    },
    lanes,
    permissions: SKYGRID_WALLET_LANES.safety,
    timestamp: new Date().toISOString()
  });
}
