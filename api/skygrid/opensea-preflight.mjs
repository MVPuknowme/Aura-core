const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const ROUTE = "/api/skygrid/opensea-preflight";
const COLLECTION_SLUG = "bored-collection-721084995";
const COLLECTION_URL = `https://opensea.io/collection/${COLLECTION_SLUG}`;
const OPENSEA_API_URL = `https://api.opensea.io/api/v2/collections/${COLLECTION_SLUG}`;
const RECEIPT_TYPE = "skygrid_opensea_collection_preflight";
const RECEIPT_VERSION = "1.0.0";
const DEFAULT_TIMEOUT_MS = 8_000;

function normalizeAddress(value) {
  const address = String(value || "").trim().toLowerCase();
  return /^0x[0-9a-f]{40}$/.test(address) ? address : null;
}

function normalizeChain(value) {
  const chain = String(value || "").trim().toLowerCase();
  return chain || null;
}

function receiptBase(now) {
  return {
    receipt_type: RECEIPT_TYPE,
    receipt_version: RECEIPT_VERSION,
    service: PRODUCT,
    route: ROUTE,
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    source: {
      provider: "opensea",
      collection_slug: COLLECTION_SLUG,
      collection_url: COLLECTION_URL
    },
    policy: {
      advisory_only: true,
      wallet_signing: false,
      transaction_broadcast: false,
      asset_transfer: false
    },
    timestamp: now()
  };
}

function blocked(base, reason, checks, extra = {}) {
  return {
    status: 503,
    body: {
      ...base,
      ok: false,
      ready: false,
      state: "blocked",
      execution_allowed: false,
      reason,
      checks,
      ...extra
    }
  };
}

export async function evaluateOpenSeaPreflight({
  apiKey,
  expectedChain,
  expectedContract,
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  const base = receiptBase(now);
  const chain = normalizeChain(expectedChain);
  const contract = normalizeAddress(expectedContract);
  const checks = {
    api_key_configured: Boolean(String(apiKey || "").trim()),
    identity_pin_configured: Boolean(chain && contract),
    upstream_reachable: false,
    collection_resolved: false,
    collection_enabled: false,
    chain_matches: false,
    contract_matches: false
  };

  if (!checks.api_key_configured || !checks.identity_pin_configured) {
    return blocked(base, "preflight_configuration_missing", checks, {
      required_environment: [
        "OPENSEA_API_KEY",
        "OPENSEA_EXPECTED_CHAIN",
        "OPENSEA_EXPECTED_CONTRACT"
      ]
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;

  try {
    response = await fetchImpl(OPENSEA_API_URL, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": String(apiKey).trim(),
        "user-agent": "SKYGRID-OpenSea-Preflight/1.0"
      },
      signal: controller.signal
    });
  } catch (error) {
    const reason = error?.name === "AbortError"
      ? "opensea_request_timeout"
      : "opensea_unreachable";
    return blocked(base, reason, checks);
  } finally {
    clearTimeout(timeout);
  }

  checks.upstream_reachable = true;

  if (!response.ok) {
    return blocked(base, "opensea_collection_unavailable", checks, {
      upstream_status: response.status
    });
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return blocked(base, "opensea_response_invalid", checks);
  }

  const observedSlug = String(payload?.collection || "").trim();
  const contracts = Array.isArray(payload?.contracts) ? payload.contracts : [];
  const observedContracts = contracts
    .map((entry) => ({
      chain: normalizeChain(entry?.chain),
      address: normalizeAddress(entry?.address)
    }))
    .filter((entry) => entry.chain && entry.address);

  checks.collection_resolved =
    observedSlug === COLLECTION_SLUG && observedContracts.length > 0;
  checks.collection_enabled = payload?.is_disabled !== true;
  checks.chain_matches = observedContracts.some((entry) => entry.chain === chain);
  checks.contract_matches = observedContracts.some(
    (entry) => entry.chain === chain && entry.address === contract
  );

  const observed = {
    collection_slug: observedSlug || null,
    name: payload?.name || null,
    safelist_status: payload?.safelist_status || null,
    is_disabled: payload?.is_disabled === true,
    contracts: observedContracts
  };

  if (
    !checks.collection_resolved ||
    !checks.collection_enabled ||
    !checks.chain_matches ||
    !checks.contract_matches
  ) {
    return blocked(base, "collection_identity_mismatch", checks, {
      expected: { chain, contract },
      observed
    });
  }

  return {
    status: 200,
    body: {
      ...base,
      ok: true,
      ready: true,
      state: "preflight_passed",
      execution_allowed: false,
      reason: "collection_identity_verified",
      checks,
      expected: { chain, contract },
      observed
    }
  };
}

function applyHeaders(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Sentinel", "fail_closed");
}

export default async function handler(req, res) {
  applyHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      ...receiptBase(() => new Date().toISOString()),
      ok: false,
      ready: false,
      state: "blocked",
      execution_allowed: false,
      reason: "method_not_allowed",
      allowed: ["GET"]
    });
  }

  const result = await evaluateOpenSeaPreflight({
    apiKey: process.env.OPENSEA_API_KEY,
    expectedChain: process.env.OPENSEA_EXPECTED_CHAIN,
    expectedContract: process.env.OPENSEA_EXPECTED_CONTRACT
  });

  return res.status(result.status).json(result.body);
}

