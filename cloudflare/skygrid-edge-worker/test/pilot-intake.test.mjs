import test from "node:test";
import assert from "node:assert/strict";

import worker from "../src/index.js";
import { handlePilotIntake } from "../src/pilot-intake.js";

function createFakeDatabase({ runError } = {}) {
  const state = {
    sql: null,
    values: null,
    runs: 0
  };

  const database = {
    prepare(sql) {
      state.sql = sql;

      return {
        bind(...values) {
          state.values = values;

          return {
            async run() {
              state.runs += 1;

              if (runError) {
                throw runError;
              }

              return {
                success: true,
                meta: {
                  changes: 1
                }
              };
            }
          };
        }
      };
    }
  };

  return {
    database,
    state
  };
}

function createRequest({
  method = "POST",
  key = "pilot-secret",
  partnerId = "partner-one",
  correlationId = "correlation-001",
  body = {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home"
  }
} = {}) {
  const headers = {
    "content-type": "application/json"
  };

  if (key !== null) {
    headers["x-skygrid-pilot-key"] = key;
  }

  if (partnerId !== null) {
    headers["x-skygrid-partner-id"] = partnerId;
  }

  if (correlationId !== null) {
    headers["x-skygrid-correlation-id"] =
      correlationId;
  }

  return new Request(
    "https://edge.test/edge/intake",
    {
      method,
      headers,
      body:
        method === "POST"
          ? JSON.stringify(body)
          : undefined
    }
  );
}

function approvedRuntimeResponse() {
  return new Response(
    JSON.stringify({
      accepted: true,
      event: {
        eventId: "skygrid_pilot_001",
        receivedAt: "2026-07-15T05:00:00.000Z",
        decision: {
          ok: true,
          reason: "partition_route_approved",
          mode: "controlled_pilot",
          sentinel: "fail_closed"
        }
      }
    }),
    {
      status: 202,
      headers: {
        "content-type": "application/json"
      }
    }
  );
}

test(
  "authenticated event receives a PNPK decision and persists sanitized evidence",
  async () => {
    const { database, state } =
      createFakeDatabase();

    const privateMarker =
      "private-value-must-not-be-persisted";

    const request = createRequest({
      body: {
        route_type: "diagnostic",
        requested_ramp: "postman",
        requested_node: "home",
        private_note: privateMarker
      }
    });

    let runtimeCalls = 0;

    const response = await handlePilotIntake(
      request,
      {
        SKYGRID_PILOT_API_KEY: "pilot-secret",
        MY_DB: database
      },
      {
        origin: "https://runtime.test",
        fetchImpl: async (url, options) => {
          runtimeCalls += 1;

          assert.equal(
            url,
            "https://runtime.test/api/skygrid/intake"
          );

          assert.equal(options.method, "POST");
          assert.equal(
            options.headers["x-skygrid-partner-id"],
            "partner-one"
          );

          return approvedRuntimeResponse();
        }
      }
    );

    const payload = await response.json();

    assert.equal(response.status, 202);
    assert.equal(runtimeCalls, 1);
    assert.equal(state.runs, 1);

    assert.equal(payload.ok, true);
    assert.equal(payload.accepted, true);
    assert.equal(
      payload.receipt.eventId,
      "skygrid_pilot_001"
    );
    assert.equal(
      payload.receipt.decisionReason,
      "partition_route_approved"
    );
    assert.equal(
      payload.receipt.mode,
      "controlled_pilot"
    );
    assert.equal(
      payload.receipt.sentinel,
      "fail_closed"
    );
    assert.equal(
      payload.receipt.auraValidated,
      true
    );

    assert.match(
      payload.receipt.payloadHash,
      /^sha256:[a-f0-9]{64}$/
    );

    assert.match(
      payload.receipt.receiptHash,
      /^sha256:[a-f0-9]{64}$/
    );

    assert.equal(state.values.length, 20);
    assert.equal(state.values[0], "skygrid_pilot_001");
    assert.equal(state.values[1], "partner-one");
    assert.equal(state.values[2], "correlation-001");
    assert.equal(state.values[7], 1);
    assert.equal(state.values[8], 202);
    assert.equal(
      state.values[9],
      "partition_route_approved"
    );
    assert.equal(state.values[18], 1);

    assert.equal(
      state.values.some((value) =>
        String(value).includes(privateMarker)
      ),
      false
    );
  }
);

test(
  "missing pilot key fails before runtime or database access",
  async () => {
    let runtimeCalls = 0;

    const response = await handlePilotIntake(
      createRequest({
        key: null
      }),
      {
        SKYGRID_PILOT_API_KEY: "pilot-secret",
        MY_DB: {
          prepare() {
            throw new Error(
              "Database must not be accessed"
            );
          }
        }
      },
      {
        fetchImpl: async () => {
          runtimeCalls += 1;
          return approvedRuntimeResponse();
        }
      }
    );

    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.reason, "pilot_key_required");
    assert.equal(runtimeCalls, 0);
  }
);

test(
  "unsafe runtime approval is converted to a fail-closed rejection receipt",
  async () => {
    const { database, state } =
      createFakeDatabase();

    const response = await handlePilotIntake(
      createRequest({
        correlationId: "correlation-unsafe"
      }),
      {
        SKYGRID_PILOT_API_KEY: "pilot-secret",
        MY_DB: database
      },
      {
        origin: "https://runtime.test",
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              accepted: true,
              event: {
                eventId: "skygrid_unsafe_001",
                decision: {
                  ok: true,
                  reason:
                    "partition_route_approved",
                  mode: "production",
                  sentinel: "fail_open"
                }
              }
            }),
            {
              status: 202,
              headers: {
                "content-type":
                  "application/json"
              }
            }
          )
      }
    );

    const payload = await response.json();

    assert.equal(response.status, 502);
    assert.equal(payload.ok, false);
    assert.equal(payload.accepted, false);

    assert.equal(
      payload.receipt.decisionReason,
      "runtime_policy_mismatch"
    );

    assert.equal(
      payload.receipt.auraValidated,
      false
    );

    assert.equal(state.runs, 1);
    assert.equal(state.values[7], 0);
    assert.equal(state.values[8], 502);
    assert.equal(
      state.values[9],
      "runtime_policy_mismatch"
    );
    assert.equal(state.values[18], 0);
  }
);

test(
  "D1 failure prevents an accepted response",
  async () => {
    const { database } = createFakeDatabase({
      runError: new Error("D1 unavailable")
    });

    const response = await handlePilotIntake(
      createRequest({
        correlationId: "correlation-d1-failure"
      }),
      {
        SKYGRID_PILOT_API_KEY: "pilot-secret",
        MY_DB: database
      },
      {
        fetchImpl: async () =>
          approvedRuntimeResponse()
      }
    );

    const payload = await response.json();

    assert.equal(response.status, 503);
    assert.equal(
      payload.reason,
      "evidence_persistence_failed"
    );
    assert.equal(payload.sentinel, "fail_closed");
  }
);

test(
  "duplicate partner correlation returns conflict",
  async () => {
    const { database } = createFakeDatabase({
      runError: new Error(
        "UNIQUE constraint failed: " +
        "SkygridPilotEvents.PartnerId, " +
        "SkygridPilotEvents.CorrelationId"
      )
    });

    const response = await handlePilotIntake(
      createRequest({
        correlationId: "correlation-duplicate"
      }),
      {
        SKYGRID_PILOT_API_KEY: "pilot-secret",
        MY_DB: database
      },
      {
        fetchImpl: async () =>
          approvedRuntimeResponse()
      }
    );

    const payload = await response.json();

    assert.equal(response.status, 409);
    assert.equal(
      payload.reason,
      "correlation_already_recorded"
    );
    assert.equal(
      payload.correlationId,
      "correlation-duplicate"
    );
  }
);

test(
  "Worker route rejects non-POST intake requests",
  async () => {
    const response = await worker.fetch(
      createRequest({
        method: "GET"
      }),
      {}
    );

    const payload = await response.json();

    assert.equal(response.status, 405);
    assert.equal(payload.ok, false);
    assert.match(
      payload.message,
      /POST is required/
    );
  }
);