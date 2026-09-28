import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolvePnpkSettlementExecutionGrant } from "../config/pnpk-settlement-execution-grant.mjs";

const NOW = "2026-09-28T23:00:00.000Z";
const RECIPIENT = "0x1111111111111111111111111111111111111111";
const AUTHORIZATION_ID = "auth_pnpk_001";
const NONCE = "pnpk:nonce:0001";
const ASSET_ID = "eip155:8453/erc20:0x2222222222222222222222222222222222222222";
const DESTINATION_FINGERPRINT = "sha256:destination-fixture";

function env(overrides = {}) {
  return {
    PNPK_SETTLEMENT_EXECUTION_ENABLED: "true",
    PNPK_SETTLEMENT_CHAIN_ALLOWLIST: "8453,42161",
    PNPK_SETTLEMENT_RECIPIENT_ALLOWLIST: RECIPIENT,
    PNPK_SETTLEMENT_MAX_USD: "25",
    PNPK_SETTLEMENT_MAX_TTL_SECONDS: "900",
    ...overrides,
  };
}

function request(overrides = {}) {
  return {
    scope: "allbridge_settlement",
    bridge: "allbridge_core",
    operatorId: "MVPuknowme",
    authorizationId: AUTHORIZATION_ID,
    nonce: NONCE,
    usedNonces: [],
    chainId: 8453,
    recipient: RECIPIENT,
    amountUsd: 10,
    amountAtomic: "10000000",
    assetId: ASSET_ID,
    destinationFingerprint: DESTINATION_FINGERPRINT,
    expiresAt: "2026-09-28T23:10:00.000Z",
    humanApproval: true,
    preflight: {
      receiptId: "receipt_pnpk_001",
      decision: "ROUTE_APPROVED",
      intentHash: "sha256:intent-fixture",
      routeNetworkId: "eip155:8453",
      assetId: ASSET_ID,
      amountAtomic: "10000000",
      recipient: RECIPIENT,
      destinationFingerprint: DESTINATION_FINGERPRINT,
      authorizationId: AUTHORIZATION_ID,
      nonce: NONCE,
    },
    ...overrides,
  };
}

test("issues a one-time, exact-bound Allbridge execution grant", () => {
  const grant = resolvePnpkSettlementExecutionGrant(env(), request(), NOW);

  assert.equal(grant.ok, true);
  assert.equal(grant.profile, "settlement-execution-grant");
  assert.equal(grant.mode, "controlled_pilot");
  assert.equal(grant.sentinel, "fail_closed");
  assert.equal(grant.scope, "allbridge_settlement");
  assert.equal(grant.bridge, "allbridge_core");
  assert.equal(grant.permissions.bridge_execution_allowed, true);
  assert.equal(grant.permissions.wallet_signing_allowed, true);
  assert.equal(grant.permissions.transaction_broadcast_allowed, true);
  assert.equal(grant.controls.raw_private_key_allowed, false);
  assert.equal(grant.controls.auto_broadcast, false);
  assert.equal(grant.controls.post_execution_reference_required, true);
  assert.match(grant.grant_hash, /^sha256:[0-9a-f]{64}$/);
});

test("fails closed without explicit human approval or exact scope", () => {
  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ humanApproval: false }),
      NOW,
    ),
    /settlement_execution_human_approval_required/,
  );

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ scope: "wallet_admin" }),
      NOW,
    ),
    /settlement_execution_scope_mismatch/,
  );
});

test("enforces chain, recipient, and amount allowlists", () => {
  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ chainId: 1 }),
      NOW,
    ),
    /settlement_execution_chain_not_allowed/,
  );

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ recipient: "0x3333333333333333333333333333333333333333" }),
      NOW,
    ),
    /settlement_execution_recipient_not_allowlisted/,
  );

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ amountUsd: 25.01 }),
      NOW,
    ),
    /settlement_execution_amount_exceeds_cap/,
  );
});

test("rejects expired, overlong, or reused grants", () => {
  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ expiresAt: "2026-09-28T22:59:59.000Z" }),
      NOW,
    ),
    /settlement_execution_grant_expired/,
  );

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ expiresAt: "2026-09-28T23:16:00.000Z" }),
      NOW,
    ),
    /settlement_execution_expiry_too_long/,
  );

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      request({ usedNonces: [NONCE] }),
      NOW,
    ),
    /settlement_execution_nonce_reused/,
  );
});

test("binds execution to the approved preflight receipt", () => {
  const base = request();

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      {
        ...base,
        preflight: { ...base.preflight, decision: "FAIL_CLOSED" },
      },
      NOW,
    ),
    /settlement_execution_preflight_not_approved/,
  );

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      {
        ...base,
        preflight: { ...base.preflight, amountAtomic: "9999999" },
      },
      NOW,
    ),
    /settlement_execution_preflight_amount_mismatch/,
  );

  assert.throws(
    () => resolvePnpkSettlementExecutionGrant(
      env(),
      {
        ...base,
        preflight: {
          ...base.preflight,
          destinationFingerprint: "sha256:other-destination",
        },
      },
      NOW,
    ),
    /settlement_execution_preflight_destination_fingerprint_mismatch/,
  );
});

test("execution grant module contains no key custody or direct broadcast implementation", async () => {
  const source = await readFile(
    new URL("../config/pnpk-settlement-execution-grant.mjs", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /process\\.env\\.[A-Z0-9_]*PRIVATE_KEY|PRIVATE_KEY\\s*[=:]|seed phrase|mnemonic/i);
  assert.doesNotMatch(source, /eth_sendRawTransaction|sendTransaction\s*\(/);
  assert.match(source, /raw_private_key_allowed:\s*false/);
  assert.match(source, /auto_broadcast:\s*false/);
});
