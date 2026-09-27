const DEFAULT_THRESHOLD = 0.96;
const REQUIRED_CODE = "S2765RK8";

const WEIGHTS = Object.freeze({
  consent: 0.18,
  referral_code: 0.12,
  referral_url: 0.14,
  signup_attribution: 0.24,
  qualifying_purchase: 0.20,
  coinbase_reward_evidence: 0.12
});

function bool(value) {
  return value === true;
}

function validCoinbaseReferralUrl(value, referralCode = REQUIRED_CODE) {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return false;
    if (host !== "coinbase.com" && host !== "www.coinbase.com") return false;

    const haystack = `${url.pathname}${url.search}`.toLowerCase();
    return haystack.includes(String(referralCode).toLowerCase());
  } catch {
    return false;
  }
}

function thresholdValue(value) {
  const parsed = Number(value ?? DEFAULT_THRESHOLD);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new RangeError("threshold must be between 0 and 1");
  }
  return parsed;
}

export function verifyCoinbaseReferral(record, options = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("referral record must be an object");
  }

  const threshold = thresholdValue(options.threshold);
  const referralCode = String(record.referral_code || "").trim();
  const checks = {
    provider: String(record.provider || "").toLowerCase() === "coinbase",
    consent: bool(record.consent?.granted) && Boolean(record.consent?.evidence_id),
    referral_code: referralCode === REQUIRED_CODE,
    referral_url: validCoinbaseReferralUrl(record.referral_url, referralCode),
    signup_attribution:
      bool(record.signup?.new_account) &&
      bool(record.signup?.used_referral_at_signup) &&
      Boolean(record.signup?.evidence_id),
    qualifying_purchase:
      bool(record.qualification?.confirmed) &&
      Boolean(record.qualification?.evidence_id),
    coinbase_reward_evidence:
      bool(record.reward?.credited_or_confirmed) &&
      Boolean(record.reward?.evidence_id)
  };

  const score =
    (checks.consent ? WEIGHTS.consent : 0) +
    (checks.referral_code ? WEIGHTS.referral_code : 0) +
    (checks.referral_url ? WEIGHTS.referral_url : 0) +
    (checks.signup_attribution ? WEIGHTS.signup_attribution : 0) +
    (checks.qualifying_purchase ? WEIGHTS.qualifying_purchase : 0) +
    (checks.coinbase_reward_evidence ? WEIGHTS.coinbase_reward_evidence : 0);

  const blockers = [];
  if (!checks.provider) blockers.push("provider_not_coinbase");
  if (!checks.consent) blockers.push("recipient_consent_not_proven");
  if (!checks.referral_code) blockers.push("referral_code_mismatch");
  if (!checks.referral_url) blockers.push("coinbase_referral_url_not_verified");
  if (!checks.signup_attribution) blockers.push("signup_attribution_not_proven");
  if (!checks.qualifying_purchase) blockers.push("qualifying_purchase_not_proven");
  if (!checks.coinbase_reward_evidence) blockers.push("coinbase_reward_not_confirmed");

  const depositReady =
    checks.provider &&
    score >= threshold &&
    blockers.length === 0;

  return {
    ok: depositReady,
    provider: "Coinbase",
    referral_code: REQUIRED_CODE,
    threshold,
    verification_score: Number(score.toFixed(4)),
    deposit_ready: depositReady,
    deposit_executed: false,
    checks,
    blockers,
    policy: {
      fail_closed: true,
      retroactive_attribution_allowed: false,
      recipient_consent_required: true,
      fund_movement_authorized_by_this_check: false
    }
  };
}

export function verifyCoinbaseReferralBatch(records, options = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError("records must be an array");
  }

  const results = records.map((record) => verifyCoinbaseReferral(record, options));
  const ready = results.filter((result) => result.deposit_ready).length;

  return {
    ok: results.length > 0 && ready === results.length,
    threshold: thresholdValue(options.threshold),
    total: results.length,
    deposit_ready: ready,
    blocked: results.length - ready,
    results
  };
}

export { DEFAULT_THRESHOLD, REQUIRED_CODE, WEIGHTS, validCoinbaseReferralUrl };
