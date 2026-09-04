export const BASE_MAINNET_CHAIN_ID = 8453;
export const BASE_SEPOLIA_CHAIN_ID = 84532;
export const BASE_SIGNER_ALLOWED_CHAIN_IDS = Object.freeze([
  BASE_MAINNET_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
]);
export const BASE_SIGNER_ALLOWED_MODES = Object.freeze([
  "manual_wallet",
  "wallet_provider",
]);

function normalizeAllowlist(raw) {
  return new Set(
    String(raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function resolveMaxUsd(env) {
  const raw = env.SKYGRID_BASE_SIGNER_MAX_USD ?? "25";
  const parsed = Number.parseFloat(String(raw));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

export function resolveBaseSignerPolicy(env = {}, request = {}) {
  const signerMode = String(env.SKYGRID_BASE_SIGNER_MODE ?? "manual_wallet").trim();
  if (!BASE_SIGNER_ALLOWED_MODES.includes(signerMode)) {
    throw new Error("base_signer_mode_not_allowed");
  }

  const allowlist = normalizeAllowlist(env.SKYGRID_BASE_SIGNER_RECIPIENT_ALLOWLIST);
  if (allowlist.size === 0) {
    throw new Error("base_signer_recipient_allowlist_empty");
  }

  const chainId = Number(request.chainId);
  if (!BASE_SIGNER_ALLOWED_CHAIN_IDS.includes(chainId)) {
    throw new Error("base_signer_chain_not_allowed");
  }

  const recipient = String(request.recipient ?? "").trim().toLowerCase();
  if (!recipient || !allowlist.has(recipient)) {
    throw new Error("base_signer_recipient_not_allowlisted");
  }

  const amountUsd = Number(request.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new Error("base_signer_amount_invalid");
  }

  const maxUsd = resolveMaxUsd(env);
  if (amountUsd > maxUsd) {
    throw new Error("base_signer_amount_exceeds_cap");
  }

  if (request.humanApproval !== true) {
    throw new Error("base_signer_human_approval_required");
  }

  return {
    ok: true,
    signer_mode: signerMode,
    chain_id: chainId,
    recipient,
    amount_usd: amountUsd,
    max_usd: maxUsd,
    require_human_approval: true,
    human_approval_present: true,
    raw_private_key_allowed: false,
    auto_broadcast: false,
  };
}
