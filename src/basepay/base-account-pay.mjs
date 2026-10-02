import { getPaymentStatus, pay } from "@base-org/account";

const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

function getAllowlistedRecipients(env = process.env) {
  return new Set(
    String(env.SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getMaxUsdAmount(env = process.env) {
  const raw = env.SKYGRID_BASEPAY_MAX_USD ?? "25";
  const parsed = Number.parseFloat(String(raw));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

function assertBaseAccountPayPolicy({ amount, recipient, chainId, humanApproval }, env = process.env) {
  if (!Number.isInteger(chainId) || ![BASE_MAINNET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID].includes(chainId)) {
    throw new Error("Unsupported Base chain ID.");
  }

  if (typeof amount !== "string" || !/^\d+(\.\d{1,6})?$/.test(amount)) {
    throw new Error("amount must be a decimal string with up to 6 decimals");
  }

  const numericAmount = Number.parseFloat(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Base Account payment amount must be greater than zero.");
  }

  if (typeof recipient !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    throw new Error("recipient must be a valid EVM address");
  }

  const allowlist = getAllowlistedRecipients(env);
  if (allowlist.size === 0) {
    throw new Error("SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST is empty; payment rejected fail-closed.");
  }

  if (!allowlist.has(recipient.toLowerCase())) {
    throw new Error("Recipient is not allowlisted for SKYGRID BasePay execution.");
  }

  const maxUsd = getMaxUsdAmount(env);
  if (numericAmount > maxUsd) {
    throw new Error(`BasePay amount exceeds SKYGRID_BASEPAY_MAX_USD policy cap of ${maxUsd}.`);
  }

  if (humanApproval !== true) {
    throw new Error("Explicit human approval is required before Base Account payment execution.");
  }
}

export async function sendBaseAccountUsdcPayment(
  { amount, recipient, chainId, humanApproval },
  env = process.env,
) {
  assertBaseAccountPayPolicy({ amount, recipient, chainId, humanApproval }, env);

  const payment = await pay({
    amount,
    to: recipient,
    testnet: chainId === BASE_SEPOLIA_CHAIN_ID,
  });

  return {
    id: payment.id,
    amount,
    recipient,
    chainId,
  };
}

export function getBaseAccountPaymentStatus(id, chainId) {
  if (!Number.isInteger(chainId) || ![BASE_MAINNET_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID].includes(chainId)) {
    throw new Error("Unsupported Base chain ID.");
  }

  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("payment id is required");
  }

  return getPaymentStatus({
    id,
    testnet: chainId === BASE_SEPOLIA_CHAIN_ID,
  });
}
