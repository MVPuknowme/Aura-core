import test from "node:test";
import assert from "node:assert/strict";

import {
  authenticatePilot,
  createPilotReceipt,
  persistPilotReceipt,
  readPilotPayload,
  sha256Hex
} from "../src/pilot-evidence.js";

test("creates stable SHA-256 hashes", async () => {
  const first = await sha256Hex("SKYGRID");
  const second = await sha256Hex("SKYGRID");

  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("requires the pilot API key and partner ID", () => {
  const missingKeyRequest = new Request("https://example.test");

  assert.deepEqual(
    authenticatePilot(missingKeyRequest, {
      SKYGRID_PILOT_API_KEY: "pilot-secret"
    }),
    {
      ok: false,
      status: 401,
      reason: "pilot_key_required"
    }
  );

  const validRequest = new Request("https://example.test", {
    headers: {
      "x-skygrid-pilot-key": "pilot-secret",
      "x-skygrid-partner-id": "partner-one"
    }
  });

  assert.deepEqual(
    authenticatePilot(validRequest, {
      SKYGRID_PILOT_API_KEY: "pilot-secret"
    }),
    {
      ok: true,
      status: 200,
      partnerId: "partner-one"
    }
  );
});

test("reads a valid pilot payload", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify({
      route_type: "diagnostic",
      requested_ramp: "postman",
      requested_node: "home"
    })
  });

  const result = await readPilotPayload(request);

  assert.equal(result.ok, true);
  assert.equal(result.body.route_type, "diagnostic");
  assert.ok(result.payloadBytes > 0);
});

test("approved route creates one validated Aura unit", async () => {
  const body = {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home"
  };

  const rawPayload = JSON.stringify(body);

  const receipt = await createPilotReceipt({
    body,
    rawPayload,
    payloadBytes: new TextEncoder().encode(rawPayload).byteLength,
    partnerId: "partner-one",
    correlationId: "correlation-one",
    runtimePayload: {
      accepted: true,
      event: {
        eventId: "skygrid_test_001",
        receivedAt: "2026-07-15T04:30:00.000Z",
        decision: {
          ok: true,
          reason: "partition_route_approved",
          mode: "controlled_pilot",
          sentinel: "fail_closed"
        }
      }
    },
    httpStatus: 202,
    processingMs: 25
  });

  assert.equal(receipt.EventId, "skygrid_test_001");
  assert.equal(receipt.DecisionOk, 1);
  assert.equal(receipt.AuraValidated, 1);
  assert.match(receipt.PayloadHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(receipt.ReceiptHash, /^sha256:[a-f0-9]{64}$/);
});

test("rejected route does not validate Aura", async () => {
  const body = {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home",
    wallet_signing_requested: true
  };

  const rawPayload = JSON.stringify(body);

  const receipt = await createPilotReceipt({
    body,
    rawPayload,
    payloadBytes: new TextEncoder().encode(rawPayload).byteLength,
    partnerId: "partner-one",
    correlationId: "correlation-two",
    runtimePayload: {
      accepted: false,
      event: {
        eventId: "skygrid_test_002",
        decision: {
          ok: false,
          reason: "wallet_signing_prohibited",
          mode: "controlled_pilot",
          sentinel: "fail_closed"
        }
      }
    },
    httpStatus: 403,
    processingMs: 18
  });

  assert.equal(receipt.DecisionOk, 0);
  assert.equal(receipt.AuraValidated, 0);
});

test("binds and persists the sanitized receipt", async () => {
  let boundValues;
  let executed = false;

  const fakeDatabase = {
    prepare() {
      return {
        bind(...values) {
          boundValues = values;

          return {
            async run() {
              executed = true;
              return {
                success: true
              };
            }
          };
        }
      };
    }
  };

  const receipt = {
    EventId: "skygrid_test_003",
    PartnerId: "partner-one",
    CorrelationId: "correlation-three",
    ReceivedAt: "2026-07-15T04:30:00.000Z",
    RouteType: "diagnostic",
    RequestedRamp: "postman",
    RequestedNode: "home",
    DecisionOk: 1,
    HttpStatus: 202,
    DecisionReason: "partition_route_approved",
    Mode: "controlled_pilot",
    Sentinel: "fail_closed",
    OwnerApproval: 0,
    EmergencyOperatorApproval: 0,
    PayloadHash: "sha256:payload",
    PayloadBytes: 128,
    ReceiptHash: "sha256:receipt",
    ProcessingMs: 20,
    AuraValidated: 1,
    ReceiptVersion: "1.0"
  };

  await persistPilotReceipt(fakeDatabase, receipt);

  assert.equal(executed, true);
  assert.equal(boundValues.length, 20);
  assert.equal(boundValues[0], "skygrid_test_003");
  assert.equal(boundValues[18], 1);
});