import assert from "node:assert/strict";
import test from "node:test";

import { SEAPORT_CONFIG } from "../scripts/seaport.mjs";

test("Seaport configuration is pinned to Arbitrum One and remains fail-closed", () => {
  assert.equal(SEAPORT_CONFIG.service, "SKYGRID Emergency Data On-Ramp");
  assert.equal(SEAPORT_CONFIG.mode, "controlled_pilot");
  assert.equal(SEAPORT_CONFIG.sentinel, "fail_closed");

  assert.equal(SEAPORT_CONFIG.network.name, "arbitrum-one");
  assert.equal(SEAPORT_CONFIG.network.chain_id, 42161);

  assert.equal(SEAPORT_CONFIG.protocol.name, "Seaport");
  assert.equal(SEAPORT_CONFIG.protocol.version, "1.6");
  assert.equal(
    SEAPORT_CONFIG.protocol.address.toLowerCase(),
    "0x0000000000000068f116a894984e2db1123eb395"
  );
  assert.equal(
    SEAPORT_CONFIG.protocol.conduit.toLowerCase(),
    "0x1e0049783f008a0085193e00003d00cd54003c71"
  );

  assert.equal(SEAPORT_CONFIG.policy.read_only, true);
  assert.equal(SEAPORT_CONFIG.policy.wallet_signing, false);
  assert.equal(SEAPORT_CONFIG.policy.token_approvals, false);
  assert.equal(SEAPORT_CONFIG.policy.order_submission, false);
  assert.equal(SEAPORT_CONFIG.policy.order_fulfillment, false);
  assert.equal(SEAPORT_CONFIG.policy.transaction_broadcast, false);
  assert.equal(SEAPORT_CONFIG.policy.asset_transfer, false);
});

test("Seaport configuration is provider-neutral", () => {
  assert.equal(JSON.stringify(SEAPORT_CONFIG).toLowerCase().includes("vercel"), false);
});
