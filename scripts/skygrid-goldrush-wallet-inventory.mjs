import { pathToFileURL } from "node:url";

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export const GOLDRUSH_CONFIG = Object.freeze({
  service: "SKYGRID GoldRush Wallet Inventory",
  baseUrl: "https://api.covalenthq.com/v1",
  chainName: "arbitrum-mainnet",
  endpoint: "balances_v2",
  authEnv: "GOLDRUSH_API_KEY",
  walletsEnv: "SKYGRID_WALLET_ADDRESSES",
  readOnly: true,
  walletSigningAllowed: false,
  tokenApprovalsAllowed: false,
  transactionBroadcastAllowed: false,
  assetTransferAllowed: false,
  paymentExecutionAllowed: false,
});

export function normalizeWalletAddresses(walletAddresses) {
  if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
    throw new Error("At least one EVM wallet address is required.");
  }

  const unique = [];
  const seen = new Set();

  for (const rawAddress of walletAddresses) {
    const address = String(rawAddress ?? "").trim();
    if (!EVM_ADDRESS_RE.test(address)) {
      throw new Error(`Invalid EVM wallet address: ${address || "<empty>"}`);
    }

    const key = address.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(address);
    }
  }

  return unique;
}

export function buildBalancesUrl(walletAddress) {
  if (!EVM_ADDRESS_RE.test(walletAddress)) {
    throw new Error(`Invalid EVM wallet address: ${walletAddress || "<empty>"}`);
  }

  return `${GOLDRUSH_CONFIG.baseUrl}/${GOLDRUSH_CONFIG.chainName}/address/${walletAddress}/${GOLDRUSH_CONFIG.endpoint}/`;
}

function normalizeBalanceItem(item = {}) {
  return {
    ticker: item.contract_ticker_symbol ?? null,
    contractAddress: item.contract_address ?? null,
    balance: item.balance ?? null,
    decimals: Number.isInteger(item.contract_decimals) ? item.contract_decimals : null,
    quoteRate: typeof item.quote_rate === "number" ? item.quote_rate : null,
    quote: typeof item.quote === "number" ? item.quote : null,
  };
}

export async function collectWalletBalances({
  apiKey,
  walletAddresses,
  fetchImpl = globalThis.fetch,
} = {}) {
  const key = String(apiKey ?? "").trim();
  if (!key) {
    throw new Error(`${GOLDRUSH_CONFIG.authEnv} is required.`);
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("A fetch implementation is required.");
  }

  const wallets = normalizeWalletAddresses(walletAddresses);
  const results = [];

  for (const walletAddress of wallets) {
    const url = buildBalancesUrl(walletAddress);
    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response?.ok) {
      const status = Number(response?.status) || "unknown";
      throw new Error(`GoldRush balance read failed for ${walletAddress} with status ${status}.`);
    }

    const payload = await response.json();
    if (!payload?.data || !Array.isArray(payload.data.items)) {
      throw new Error(`GoldRush balance response schema mismatch for ${walletAddress}.`);
    }

    results.push({
      walletAddress,
      chainName: payload.data.chain_name ?? GOLDRUSH_CONFIG.chainName,
      items: payload.data.items.map(normalizeBalanceItem),
    });
  }

  return results;
}

function parseWalletEnv(value) {
  return String(value ?? "")
    .split(/[\s,;]+/)
    .map((valuePart) => valuePart.trim())
    .filter(Boolean);
}

async function main() {
  const results = await collectWalletBalances({
    apiKey: process.env[GOLDRUSH_CONFIG.authEnv],
    walletAddresses: parseWalletEnv(process.env[GOLDRUSH_CONFIG.walletsEnv]),
  });

  const summary = results.map((wallet) => ({
    walletAddress: wallet.walletAddress,
    chainName: wallet.chainName,
    tokenCount: wallet.items.length,
    quotedUsd: wallet.items.reduce(
      (total, item) => total + (Number.isFinite(item.quote) ? item.quote : 0),
      0,
    ),
    items: wallet.items,
  }));

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(`SKYGRID GoldRush inventory blocked: ${error.message}`);
    process.exitCode = 1;
  });
}
