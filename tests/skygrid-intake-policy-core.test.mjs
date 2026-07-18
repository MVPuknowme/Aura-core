import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/runtime-core.mjs";

function request(body, path = "/api/skygrid/intake") {
  const raw = JSON.stringify(body);
  return {
    method: "POST",
    url: path,
    headers: { host: "127.0.0.1:3000", "content-type": "application/json" },
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(raw);
    }
  };
}

function response() {
  let body = "";
  return {
    statusCode: 200,
    setHeader() {},
    end(chunk = "") { body += String(chunk); },
    json() { return JSON.parse(body); }
  };
}

async function invoke(body, path) {
  const res = response();
  await handler(request(body, path), res);
  return { status: res.statusCode, body: res.json() };
}

const acceptedCases = [
  {
    name: "diagnostic route",
    body: {
      route_type: "diagnostic",
      requested_ramp: "postman",
      requested_node: "home"
    },
    partition: "diagnostic"
  },
  {
    name: "approved emergency route",
    body: {
      route_type: "emergency",
      requested_ramp: "aws_lambda",
      requested_node: "validator",
      owner_approval: true,
      emergency_operator_approval: true
    },
    partition: "emergency"
  }
];

for (const entry of acceptedCases) {
  test(`core accepts ${entry.name}`, async () => {
    const result = await invoke(entry.body);
    assert.equal(result.status, 202);
    assert.equal(result.body.event.decision.ok, true);
    assert.equal(result.body.event.decision.reason, "partition_route_approved");
    assert.equal(result.body.event.decision.selected_partition, entry.partition);
  });
}

const rejectedCases = [
  ["missing owner approval", {
    route_type: "emergency",
    requested_ramp: "aws_lambda",
    requested_node: "validator",
    emergency_operator_approval: true
  }, "owner_approval_required", 403],
  ["missing operator approval", {
    route_type: "emergency",
    requested_ramp: "aws_lambda",
    requested_node: "validator",
    owner_approval: true
  }, "emergency_operator_approval_required", 403],
  ["unknown partition", {
    route_type: "unknown",
    requested_ramp: "postman",
    requested_node: "home"
  }, "unknown_partition", 403],
  ["unapproved ramp", {
    route_type: "diagnostic",
    requested_ramp: "aws_lambda",
    requested_node: "home"
  }, "unapproved_ramp", 403],
  ["unapproved node", {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "unknown"
  }, "unapproved_node", 403],
  ["wallet signing", {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home",
    wallet_signing_requested: true
  }, "wallet_signing_prohibited", 403],
  ["transaction broadcast", {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home",
    transaction_broadcast_requested: true
  }, "transaction_broadcast_prohibited", 403],
  ["payment execution", {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home",
    payment_execution_requested: true
  }, "payment_execution_prohibited", 403],
  ["production failover", {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home",
    production_failover_requested: true
  }, "production_failover_prohibited", 403],
  ["private data movement", {
    route_type: "diagnostic",
    requested_ramp: "postman",
    requested_node: "home",
    private_data_movement_requested: true
  }, "private_data_movement_prohibited", 403],
  ["missing routing fields", {
    requested_ramp: "postman",
    requested_node: "home"
  }, "missing_routing_fields", 400]
];

for (const [name, body, reason, status] of rejectedCases) {
  test(`core fails closed for ${name}`, async () => {
    const result = await invoke(body);
    assert.equal(result.status, status);
    assert.equal(result.body.event.decision.ok, false);
    assert.equal(result.body.event.decision.reason, reason);
    assert.equal(result.body.event.decision.sentinel, "fail_closed");
  });
}

test("core supports nested routing wrappers", async () => {
  const result = await invoke({
    event: {
      route_type: "diagnostic",
      requested_ramp: "postman",
      requested_node: "home"
    }
  });
  assert.equal(result.status, 202);
  assert.equal(result.body.event.decision.ok, true);
});
