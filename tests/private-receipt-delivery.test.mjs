import test from "node:test";
import assert from "node:assert/strict";
import { deliverPrivateReceipt, minimizePrivateReceipt } from "../lib/security/private-receipt-delivery.mjs";

const receipt = { schema: "pnpk.private-export-preflight.v1", decision: "fail_closed",
  ip: "192.0.2.1", mac: "00:11:22:33:44:55", token: "SECRET-TOKEN-DO-NOT-ECHO", fisa: true };
const relayUrl = "https://relay.example.test/receipts";

test("delivery payload omits network identities, free text, and surveillance assertions", () => {
  const minimized = minimizePrivateReceipt(receipt);
  assert.equal(minimized.network_identity, "withheld");
  assert.equal(minimized.monitoring_status, "unknown");
  for (const value of [receipt.ip, receipt.mac, receipt.token, "fisa"]) {
    assert.equal(JSON.stringify(minimized).includes(value), false);
  }
  assert.ok(Object.isFrozen(minimized));
});

test("unverified, mismatched, and direct egress cannot deliver", async () => {
  let deliveries = 0;
  for (const egress of [undefined, { verified: "true", destination: relayUrl, mode: "vpn" },
    { verified: true, destination: relayUrl, mode: "direct" },
    { verified: true, destination: "https://other.example.test/", mode: "vpn" }]) {
    assert.equal(await deliverPrivateReceipt(receipt, { relayUrl, transport: {
      verifyEgress: async () => egress, deliver: async () => { deliveries++; return true; }
    } }), false);
  }
  assert.equal(deliveries, 0);
  assert.equal(await deliverPrivateReceipt(receipt), false);
});

test("verified private transport receives only the minimized receipt", async () => {
  for (const mode of ["vpn", "outsourced_relay"]) {
    let sent;
    assert.equal(await deliverPrivateReceipt(receipt, { relayUrl, transport: {
      verifyEgress: async destination => ({ verified: true, destination, mode }),
      deliver: async (destination, payload) => { sent = { destination, payload }; return true; }
    } }), true);
    assert.deepEqual(sent, { destination: relayUrl, payload: minimizePrivateReceipt(receipt) });
  }
});

test("transport failure never falls back or reports a delivered receipt", async () => {
  let deliveries = 0;
  assert.equal(await deliverPrivateReceipt(receipt, { relayUrl, transport: {
    verifyEgress: async destination => ({ verified: true, destination, mode: "vpn" }),
    deliver: async () => { deliveries++; throw new Error("private transport failure"); }
  } }), false);
  assert.equal(deliveries, 1);
  for (const relayUrl of ["http://relay.example.test", "https://user:password@relay.example.test",
    "https://relay.example.test?token=secret", "https://relay.example.test/#secret", "invalid"]) {
    assert.equal(await deliverPrivateReceipt(receipt, { relayUrl }), false);
  }
});
