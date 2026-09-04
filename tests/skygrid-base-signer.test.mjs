import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function loadSignerPolicy() {
  try {
    return await import("../config/skygrid-base-signer.mjs");
  } catch {
    return null;
  }
}

const allowlistedRecipient = "0x1111111111111111111111111111111111111111";

function env(overrides = {}) {
  return {
    SKYGRID_BASE_SIGNER_MODE: "manual_wallet",
    SKYGRID_BASE_SIGNER_RECIPIENT_ALLOWLIST: allowlistedRecipient,
    SKYGRID_BASE_SIGNER_MAX_USD: "25",
    ...overrides,
  };
}

test("Base signer policy exists and fails closed when recipient allowlist is empty", async () => {
  const module = await loadSignerPolicy();
  assert.equal(typeof module?.resolveBaseSignerPolicy, "function");

  assert.throws(
    () => module.resolveBaseSignerPolicy(
      env({ SKYGRID_BASE_SIGNER_RECIPIENT_ALLOWLIST: "" }),
      {
        chainId: 8453,
        recipient: allowlistedRecipient,
        amountUsd: 5,
        humanApproval: true,
      },
    ),
    /base_signer_recipient_allowlist_empty/,
  );
});

test("Base signer policy requires explicit human approval", async () => {
  const { resolveBaseSignerPolicy } = await loadSignerPolicy();

  assert.throws(
    () => resolveBaseSignerPolicy(env(), {
      chainId: 8453,
      recipient: allowlistedRecipient,
      amountUsd: 5,
      humanApproval: false,
    }),
    /base_signer_human_approval_required/,
  );
});

test("Base signer policy rejects unsupported chains and over-cap requests", async () => {
  const { resolveBaseSignerPolicy } = await loadSignerPolicy();

  assert.throws(
    () => resolveBaseSignerPolicy(env(), {
      chainId: 1,
      recipient: allowlistedRecipient,
      amountUsd: 5,
      humanApproval: true,
    }),
    /base_signer_chain_not_allowed/,
  );

  assert.throws(
    () => resolveBaseSignerPolicy(env(), {
      chainId: 8453,
      recipient: allowlistedRecipient,
      amountUsd: 26,
      humanApproval: true,
    }),
    /base_signer_amount_exceeds_cap/,
  );
});

test("Base signer policy returns a non-broadcasting approval envelope for an allowed request", async () => {
  const { resolveBaseSignerPolicy } = await loadSignerPolicy();
  const result = resolveBaseSignerPolicy(env(), {
    chainId: 8453,
    recipient: allowlistedRecipient,
    amountUsd: 10,
    humanApproval: true,
  });

  assert.deepEqual(result, {
    ok: true,
    signer_mode: "manual_wallet",
    chain_id: 8453,
    recipient: allowlistedRecipient,
    amount_usd: 10,
    max_usd: 25,
    require_human_approval: true,
    human_approval_present: true,
    raw_private_key_allowed: false,
    auto_broadcast: false,
  });
});

test("Base signer adapter is registered without raw-key or transaction-broadcast code", async () => {
  const adapter = await readFile(new URL("../src/action-providers/base-signer.ts", import.meta.url), "utf8");
  const agentkit = await readFile(new URL("../src/agentkit/create-skygrid-agentkit.ts", import.meta.url), "utf8");

  assert.match(adapter, /prepare_base_signer_request/);
  assert.match(adapter, /resolveBaseSignerPolicy/);
  assert.doesNotMatch(adapter, /PRIVATE_KEY|eth_sendRawTransaction|sendTransaction\s*\(/);
  assert.match(agentkit, /baseSignerActionProvider/);
  assert.match(agentkit, /baseSignerActionProvider\(\)/);
});
