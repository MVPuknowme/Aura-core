import { timingSafeEqual } from "node:crypto";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const ROUTE = "/api/skygrid/etherscan-read";
const ETHERSCAN_V2_URL = "https://api.etherscan.io/v2/api";
const RECEIPT_TYPE = "skygrid_etherscan_read";
const RECEIPT_VERSION = "1.0.0";
const DEFAULT_TIMEOUT_MS = 8_000;

const OPERATIONS = Object.freeze({
  balance: Object.freeze({
    module: "account",
    action: "balance",
    parameter: "address",
    pro: false
  }),
  transaction_receipt: Object.freeze({
    module: "proxy",
    action: "eth_getTransactionReceipt",
    parameter: "txhash",
    pro: false
  }),
  token_info: Object.freeze({
    module: "token",
    action: "tokeninfo",
    parameter: "contractaddress",
    pro: true
  })
});

function singleValue(value) {
  if (Array.isArray(value)) return value.length === 1 ? value[0] : null;
  return value;
}

function normalizeAddress(value) {
  const address = String(singleValue(value) || "").trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(address) ? address : null;
}

function normalizeHash(value) {
  const hash = String(singleValue(value) || "").trim().toLowerCase();
  return /^0x[0-9a-f]{64}$/.test(hash) ? hash : null;
}

function normalizeChainId(value) {
  const chainId = String(singleValue(value) || "").trim();
  return /^[1-9][0-9]{0,19}$/.test(chainId) ? chainId : null;
}

function allowedChainSet(value) {
  const entries = Array.isArray(value) ? value : String(value || "").split(",");
  return new Set(entries.map(normalizeChainId).filter(Boolean));
}

function enabled(value) {
  return value === true || String(value || "").trim().toLowerCase() === "true";
}

function safeText(value, limit = 2_048) {
  if (typeof value !== "string") return null;
  return value.slice(0, limit);
}

function receiptBase(now) {
  return {
    receipt_type: RECEIPT_TYPE,
    receipt_version: RECEIPT_VERSION,
    service: PRODUCT,
    route: ROUTE,
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    source: { provider: "etherscan", api_version: "v2" },
    policy: {
      read_only: true,
      allowlisted_operations_only: true,
      wallet_signing: false,
      transaction_broadcast: false,
      eth_send_raw_transaction: false,
      private_key_access: false
    },
    timestamp: now()
  };
}

function blocked(base, status, reason, extra = {}) {
  return {
    status,
    body: {
      ...base,
      ok: false,
      state: "blocked",
      execution_allowed: false,
      reason,
      ...extra
    }
  };
}

function normalizeTarget(operation, input) {
  if (operation === "transaction_receipt") return normalizeHash(input?.txhash);
  if (operation === "token_info") return normalizeAddress(input?.contractaddress);
  return normalizeAddress(input?.address);
}

function sanitizeResult(operation, payload) {
  if (operation === "balance") {
    const wei = String(payload?.result || "");
    return /^\d+$/.test(wei) ? { balance_wei: wei } : null;
  }

  if (operation === "transaction_receipt") {
    const receipt = payload?.result;
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return null;
    return {
      transaction_hash: normalizeHash(receipt.transactionHash),
      status: safeText(receipt.status, 32),
      block_number: safeText(receipt.blockNumber, 32),
      block_hash: normalizeHash(receipt.blockHash),
      from: normalizeAddress(receipt.from),
      to: receipt.to == null ? null : normalizeAddress(receipt.to),
      contract_address: receipt.contractAddress == null
        ? null
        : normalizeAddress(receipt.contractAddress),
      gas_used: safeText(receipt.gasUsed, 64),
      effective_gas_price: safeText(receipt.effectiveGasPrice, 64),
      type: safeText(receipt.type, 32),
      logs_count: Array.isArray(receipt.logs) ? receipt.logs.length : 0
    };
  }

  const info = Array.isArray(payload?.result) ? payload.result[0] : null;
  if (!info || typeof info !== "object" || Array.isArray(info)) return null;
  return {
    contract_address: normalizeAddress(info.contractAddress),
    token_name: safeText(info.tokenName, 256),
    symbol: safeText(info.symbol, 64),
    divisor: safeText(info.divisor, 32),
    token_type: safeText(info.tokenType, 32),
    total_supply: safeText(info.totalSupply, 128),
    blue_checkmark: safeText(info.blueCheckmark, 16),
    description: safeText(info.description, 1_024),
    website: safeText(info.website),
    token_price_usd: safeText(info.tokenPriceUSD, 128),
    image: safeText(info.image)
  };
}

export function accessTokenMatches(provided, expected) {
  const left = Buffer.from(String(provided || ""), "utf8");
  const right = Buffer.from(String(expected || ""), "utf8");
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

export async function evaluateEtherscanRead({
  apiKey,
  allowedChainIds,
  proEndpointsEnabled = false,
  authorized = false,
  operation,
  chainId,
  input = {},
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const base = receiptBase(now);
  const operationName = String(singleValue(operation) || "").trim();
  const definition = OPERATIONS[operationName];
  const normalizedChainId = normalizeChainId(chainId);
  const allowedChains = allowedChainSet(allowedChainIds);

  if (!authorized) {
    return blocked(base, 401, "read_access_denied");
  }

  if (!String(apiKey || "").trim() || allowedChains.size === 0) {
    return blocked(base, 503, "etherscan_configuration_missing", {
      required_environment: ["ETHERSCAN_API_KEY", "ETHERSCAN_ALLOWED_CHAIN_IDS"]
    });
  }

  if (!definition) {
    return blocked(base, 400, "operation_not_allowlisted", {
      allowed_operations: Object.keys(OPERATIONS)
    });
  }

  if (!normalizedChainId) {
    return blocked(base, 400, "chain_id_invalid");
  }

  if (!allowedChains.has(normalizedChainId)) {
    return blocked(base, 403, "chain_id_not_allowed", {
      chain_id: normalizedChainId
    });
  }

  if (definition.pro && !enabled(proEndpointsEnabled)) {
    return blocked(base, 403, "pro_endpoint_not_enabled", {
      operation: operationName
    });
  }

  const target = normalizeTarget(operationName, input);
  if (!target) {
    return blocked(base, 400, "query_target_invalid", {
      operation: operationName,
      required_parameter: definition.parameter
    });
  }

  const upstream = new URL(ETHERSCAN_V2_URL);
  upstream.searchParams.set("chainid", normalizedChainId);
  upstream.searchParams.set("module", definition.module);
  upstream.searchParams.set("action", definition.action);
  upstream.searchParams.set(definition.parameter, target);
  if (operationName === "balance") upstream.searchParams.set("tag", "latest");
  upstream.searchParams.set("apikey", String(apiKey).trim());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetchImpl(upstream, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "SKYGRID-Etherscan-Read/1.0"
      },
      signal: controller.signal
    });
  } catch (error) {
    return blocked(
      base,
      error?.name === "AbortError" ? 504 : 502,
      error?.name === "AbortError" ? "etherscan_request_timeout" : "etherscan_unreachable"
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return blocked(base, 502, "etherscan_upstream_unavailable", {
      upstream_status: response.status
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return blocked(base, 502, "etherscan_response_invalid");
  }

  if (payload?.error || (operationName !== "transaction_receipt" && payload?.status !== "1")) {
    return blocked(base, 502, "etherscan_query_failed", {
      operation: operationName
    });
  }

  if (operationName === "transaction_receipt" && payload?.result == null) {
    return blocked(base, 404, "transaction_receipt_not_found", {
      operation: operationName,
      chain_id: normalizedChainId,
      query: { [definition.parameter]: target }
    });
  }

  const data = sanitizeResult(operationName, payload);
  if (!data) {
    return blocked(base, 502, "etherscan_result_invalid", {
      operation: operationName
    });
  }

  return {
    status: 200,
    body: {
      ...base,
      ok: true,
      state: "read_verified",
      execution_allowed: false,
      reason: "etherscan_read_verified",
      operation: operationName,
      chain_id: normalizedChainId,
      query: { [definition.parameter]: target },
      data
    }
  };
}

function applyHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Sentinel", "fail_closed");
  res.setHeader("X-SKYGRID-Execution", "disabled");
}

export default async function handler(req, res) {
  applyHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ...receiptBase(() => new Date().toISOString()),
      ok: false,
      state: "blocked",
      execution_allowed: false,
      reason: "method_not_allowed",
      allowed: ["GET"]
    });
  }

  const providedToken = req.headers?.["x-skygrid-read-token"];
  const expectedToken = process.env.ETHERSCAN_READ_ACCESS_TOKEN;
  const result = await evaluateEtherscanRead({
    apiKey: process.env.ETHERSCAN_API_KEY,
    allowedChainIds: process.env.ETHERSCAN_ALLOWED_CHAIN_IDS,
    proEndpointsEnabled: process.env.ETHERSCAN_ENABLE_PRO_ENDPOINTS,
    authorized: accessTokenMatches(singleValue(providedToken), expectedToken),
    operation: req.query?.operation,
    chainId: req.query?.chainid,
    input: {
      address: req.query?.address,
      txhash: req.query?.txhash,
      contractaddress: req.query?.contractaddress
    }
  });

  return res.status(result.status).json(result.body);
}

export { OPERATIONS };
