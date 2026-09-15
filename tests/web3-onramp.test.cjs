const assert = require('node:assert/strict');
const test = require('node:test');

const DESTINATION = '0xA4b6cf2BAaA235ab7Fe10EADB84b82460165B38F';
const BASE_MAINNET = 8453;

async function loadPolicy() {
  return import('../config/skygrid-base-signer.mjs');
}

function env(overrides = {}) {
  return {
    SKYGRID_BASE_SIGNER_MODE: 'manual_wallet',
    SKYGRID_BASE_SIGNER_RECIPIENT_ALLOWLIST: DESTINATION,
    SKYGRID_BASE_SIGNER_MAX_USD: '25',
    ...overrides,
  };
}

test('Base on-ramp prepares the configured destination without broadcasting', async () => {
  const { resolveBaseSignerPolicy } = await loadPolicy();
  const result = resolveBaseSignerPolicy(env(), {
    chainId: BASE_MAINNET,
    recipient: DESTINATION,
    amountUsd: 1,
    humanApproval: true,
  });

  assert.equal(result.ok, true);
  assert.equal(result.chain_id, BASE_MAINNET);
  assert.equal(result.recipient, DESTINATION.toLowerCase());
  assert.equal(result.signer_mode, 'manual_wallet');
  assert.equal(result.raw_private_key_allowed, false);
  assert.equal(result.auto_broadcast, false);
  assert.equal(result.require_human_approval, true);
});

test('Base on-ramp fails closed for an unapproved recipient', async () => {
  const { resolveBaseSignerPolicy } = await loadPolicy();
  assert.throws(
    () => resolveBaseSignerPolicy(env(), {
      chainId: BASE_MAINNET,
      recipient: '0x1111111111111111111111111111111111111111',
      amountUsd: 1,
      humanApproval: true,
    }),
    /base_signer_recipient_not_allowlisted/,
  );
});

test('Base on-ramp requires explicit human approval', async () => {
  const { resolveBaseSignerPolicy } = await loadPolicy();
  assert.throws(
    () => resolveBaseSignerPolicy(env(), {
      chainId: BASE_MAINNET,
      recipient: DESTINATION,
      amountUsd: 1,
      humanApproval: false,
    }),
    /base_signer_human_approval_required/,
  );
});
