import assert from "node:assert/strict";
import test from "node:test";

import {
  REQUIRED_CODE,
  validCoinbaseReferralUrl,
  verifyCoinbaseReferral,
  verifyCoinbaseReferralBatch
} from "../lib/referrals/coinbase-preflight.mjs";

function completeRecord() {
  return {
    provider: "Coinbase",
    referral_code: REQUIRED_CODE,
    referral_url: `https://www.coinbase.com/join/${REQUIRED_CODE}`,
    consent: { granted: true, evidence_id: "consent-001" },
    signup: {
      new_account: true,
      used_referral_at_signup: true,
      evidence_id: "signup-001"
    },
    qualification: { confirmed: true, evidence_id: "trade-001" },
    reward: { credited_or_confirmed: true, evidence_id: "reward-001" }
  };
}

test("accepts a complete Coinbase referral at the 0.96 gate", () => {
  const result = verifyCoinbaseReferral(completeRecord(), { threshold: 0.96 });
  assert.equal(result.verification_score, 1);
  assert.equal(result.deposit_ready, true);
  assert.equal(result.deposit_executed, false);
  assert.deepEqual(result.blockers, []);
});

test("fails closed when Coinbase has not confirmed the reward", () => {
  const record = completeRecord();
  record.reward = { credited_or_confirmed: false, evidence_id: "" };

  const result = verifyCoinbaseReferral(record, { threshold: 0.96 });
  assert.equal(result.verification_score, 0.88);
  assert.equal(result.deposit_ready, false);
  assert.ok(result.blockers.includes("coinbase_reward_not_confirmed"));
});

test("fails closed without recipient consent", () => {
  const record = completeRecord();
  record.consent = { granted: false, evidence_id: "" };

  const result = verifyCoinbaseReferral(record, { threshold: 0.96 });
  assert.equal(result.deposit_ready, false);
  assert.ok(result.blockers.includes("recipient_consent_not_proven"));
});

test("requires an HTTPS Coinbase URL carrying the referral code", () => {
  assert.equal(
    validCoinbaseReferralUrl(`https://www.coinbase.com/join/${REQUIRED_CODE}`),
    true
  );
  assert.equal(
    validCoinbaseReferralUrl(`https://example.com/join/${REQUIRED_CODE}`),
    false
  );
  assert.equal(
    validCoinbaseReferralUrl("https://www.coinbase.com/join/OTHER"),
    false
  );
});

test("batch summary separates ready from blocked records", () => {
  const blocked = completeRecord();
  blocked.signup.used_referral_at_signup = false;

  const report = verifyCoinbaseReferralBatch([completeRecord(), blocked], {
    threshold: 0.96
  });

  assert.equal(report.total, 2);
  assert.equal(report.deposit_ready, 1);
  assert.equal(report.blocked, 1);
  assert.equal(report.ok, false);
});
