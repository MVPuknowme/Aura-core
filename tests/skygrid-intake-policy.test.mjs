import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/runtime.mjs";

function createRequest({ method = "POST", path = "/api/skygrid/intake", body = {} } = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  return {
    method,
    url: path,
    headers: { host: "127.0.0.1:3000" },
    async *[Symbol.asyncIterator]() {
      if (payload.length > 0) {
        yield Buffer.from(payload);
      }
    }
  };
}

function createResponse() {
  const headers = {};
  let body = "";

  return {
    statusCode: 200,
    setHeader(name, value) {
      headers[name] = value;
    },
    end(chunk) {
      body += String(chunk ?? "");
    },
    getBody() {
      return body;
    },
    getHeaders() {
      return headers;
    }
  };
}

async function invokeHandler(body, path = "/api/skygrid/intake") {
  const req = createRequest({ body, path });
  const res = createResponse();
  await handler(req, res);

  return {
    statusCode: res.statusCode,
    headers: res.getHeaders(),
    body: JSON.parse(res.getBody())
  };
}

test("accepts PNPK-approved diagnostic and emergency routing requests", async () => {
  const diagnostic = await invokeHandler({
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home"
  });

  assert.equal(diagnostic.statusCode, 202);
  assert.equal(diagnostic.body.event.decision.ok, true);
  assert.equal(diagnostic.body.event.decision.reason, "partition_route_approved");
  assert.equal(diagnostic.body.event.decision.selected_partition, "diagnostic");
  assert.equal(diagnostic.body.event.decision.selected_ramp, "postman");
  assert.equal(diagnostic.body.event.decision.selected_node_group, "home");

  const emergency = await invokeHandler({
    route_type: "emergency",
    requested_ramp: "aws_lambda",
    requested_node: "validator",
    owner_approval: true,
    emergency_operator_approval: true
  });

  assert.equal(emergency.statusCode, 202);
  assert.equal(emergency.body.event.decision.ok, true);
  assert.equal(emergency.body.event.decision.reason, "partition_route_approved");
  assert.equal(emergency.body.event.decision.selected_partition, "emergency");
  assert.equal(emergency.body.event.decision.selected_ramp, "aws_lambda");
  assert.equal(emergency.body.event.decision.selected_node_group, "validator");
});

test("fails closed for missing approvals and unsafe policy triggers", async () => {
  const rejectionCases = [
    {
      name: "missing owner approval",
      body: {
        route_type: "emergency",
        requested_ramp: "aws_lambda",
        requested_node: "validator",
        emergency_operator_approval: true
      },
      expectedStatus: 403,
      expectedReason: "owner_approval_required"
    },
    {
      name: "missing emergency operator approval",
      body: {
        route_type: "emergency",
        requested_ramp: "aws_lambda",
        requested_node: "validator",
        owner_approval: true
      },
      expectedStatus: 403,
      expectedReason: "emergency_operator_approval_required"
    },
    {
      name: "unknown partition",
      body: {
        route_type: "unknown",
        requested_ramp: "postman",
        requested_node: "home"
      },
      expectedStatus: 403,
      expectedReason: "unknown_partition"
    },
    {
      name: "unapproved ramp",
      body: {
        route_type: "diagnostic",
        requested_ramp: "aws_lambda",
        requested_node: "home"
      },
      expectedStatus: 403,
      expectedReason: "unapproved_ramp"
    },
    {
      name: "unapproved node",
      body: {
        route_type: "diagnostic",
        requested_ramp: "postman",
        requested_node: "unknown"
      },
      expectedStatus: 403,
      expectedReason: "unapproved_node"
    },
    {
      name: "wallet signing requested",
      body: {
        route_type: "diagnostic",
        requested_ramp: "postman",
        requested_node: "home",
        wallet_signing_requested: true
      },
      expectedStatus: 403,
      expectedReason: "wallet_signing_prohibited"
    },
    {
      name: "transaction broadcast requested",
      body: {
        route_type: "diagnostic",
        requested_ramp: "postman",
        requested_node: "home",
        transaction_broadcast_requested: true
      },
      expectedStatus: 403,
      expectedReason: "transaction_broadcast_prohibited"
    },
    {
      name: "payment execution requested",
      body: {
        route_type: "diagnostic",
        requested_ramp: "postman",
        requested_node: "home",
        payment_execution_requested: true
      },
      expectedStatus: 403,
      expectedReason: "payment_execution_prohibited"
    },
    {
      name: "production failover requested",
      body: {
        route_type: "diagnostic",
        requested_ramp: "postman",
        requested_node: "home",
        production_failover_requested: true
      },
      expectedStatus: 403,
      expectedReason: "production_failover_prohibited"
    },
    {
      name: "private data movement requested",
      body: {
        route_type: "diagnostic",
        requested_ramp: "postman",
        requested_node: "home",
        private_data_movement_requested: true
      },
      expectedStatus: 403,
      expectedReason: "private_data_movement_prohibited"
    }
  ];

  for (const testCase of rejectionCases) {
    const result = await invokeHandler(testCase.body);
    assert.equal(result.statusCode, testCase.expectedStatus, `${testCase.name} status code mismatch`);
    assert.equal(result.body.event.decision.ok, false, `${testCase.name} should be rejected`);
    assert.equal(result.body.event.decision.mode, "controlled_pilot", `${testCase.name} mode mismatch`);
    assert.equal(result.body.event.decision.sentinel, "fail_closed", `${testCase.name} sentinel mismatch`);
    assert.equal(result.body.event.decision.reason, testCase.expectedReason, `${testCase.name} reason mismatch`);
  }
});

test("rejects missing routing fields and supports nested event and payload wrappers", async () => {
  const missingFields = await invokeHandler({
    requested_ramp: "postman",
    requested_node: "home"
  });

  assert.equal(missingFields.statusCode, 400);
  assert.equal(missingFields.body.event.decision.ok, false);
  assert.equal(missingFields.body.event.decision.reason, "missing_routing_fields");
  assert.equal(missingFields.body.event.decision.mode, "controlled_pilot");
  assert.equal(missingFields.body.event.decision.sentinel, "fail_closed");

  const nestedEvent = await invokeHandler({
    event: {
      route_type: "diagnostic",
      requested_ramp: "postman",
      requested_node: "home"
    }
  });

  assert.equal(nestedEvent.statusCode, 202);
  assert.equal(nestedEvent.body.event.decision.ok, true);
  assert.equal(nestedEvent.body.event.decision.selected_partition, "diagnostic");
  assert.equal(nestedEvent.body.event.decision.selected_ramp, "postman");
  assert.equal(nestedEvent.body.event.decision.selected_node_group, "home");

  const nestedPayload = await invokeHandler({
    payload: {
      route_type: "diagnostic",
      requested_ramp: "postman",
      requested_node: "home"
    }
  });

  assert.equal(nestedPayload.statusCode, 202);
  assert.equal(nestedPayload.body.event.decision.ok, true);
  assert.equal(nestedPayload.body.event.decision.selected_partition, "diagnostic");
  assert.equal(nestedPayload.body.event.decision.selected_ramp, "postman");
  assert.equal(nestedPayload.body.event.decision.selected_node_group, "home");
});
