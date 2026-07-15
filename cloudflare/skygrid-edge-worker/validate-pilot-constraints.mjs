import {
  mkdirSync,
  readFileSync,
  rmSync
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const temporaryDirectory = fileURLToPath(
  new URL("./.tmp/", import.meta.url)
);

const databasePath = fileURLToPath(
  new URL(
    "./.tmp/skygrid-pilot-constraints.sqlite",
    import.meta.url
  )
);

const schemaPath = fileURLToPath(
  new URL(
    "./schema/skygrid-pilot-events.sql",
    import.meta.url
  )
);

mkdirSync(temporaryDirectory, {
  recursive: true
});

rmSync(databasePath, {
  force: true
});

const database = new DatabaseSync(databasePath);
const schema = readFileSync(schemaPath, "utf8");

const insertSql = `
  INSERT INTO SkygridPilotEvents (
    EventId,
    PartnerId,
    CorrelationId,
    ReceivedAt,
    RouteType,
    RequestedRamp,
    RequestedNode,
    DecisionOk,
    HttpStatus,
    DecisionReason,
    Mode,
    Sentinel,
    OwnerApproval,
    EmergencyOperatorApproval,
    PayloadHash,
    PayloadBytes,
    ReceiptHash,
    ProcessingMs,
    AuraValidated
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`;

function expectBlocked(name, operation) {
  try {
    operation();

    return {
      name,
      blocked: false,
      error:
        "Constraint unexpectedly permitted the operation"
    };
  } catch (error) {
    return {
      name,
      blocked: true,
      error: String(error.message)
    };
  }
}

try {
  database.exec(schema);

  const insert = database.prepare(insertSql);

  insert.run(
    "pilot_local_001",
    "skygrid_internal",
    "correlation_local_001",
    new Date().toISOString(),
    "diagnostic",
    "postman",
    "home",
    1,
    202,
    "partition_route_approved",
    "controlled_pilot",
    "fail_closed",
    0,
    0,
    "sha256:test-payload",
    128,
    "sha256:test-receipt",
    25,
    1
  );

  const receipt = database.prepare(`
    SELECT
      EventId,
      PartnerId,
      CorrelationId,
      DecisionOk,
      DecisionReason,
      Mode,
      Sentinel,
      AuraValidated,
      ProcessingMs
    FROM SkygridPilotEvents
    WHERE EventId = ?
  `).get("pilot_local_001");

  const tests = [];

  tests.push(expectBlocked(
    "duplicate partner correlation",
    () => insert.run(
      "pilot_local_002",
      "skygrid_internal",
      "correlation_local_001",
      new Date().toISOString(),
      "diagnostic",
      "postman",
      "home",
      1,
      202,
      "partition_route_approved",
      "controlled_pilot",
      "fail_closed",
      0,
      0,
      "sha256:test-payload-2",
      130,
      "sha256:test-receipt-2",
      30,
      1
    )
  ));

  tests.push(expectBlocked(
    "null event ID",
    () => insert.run(
      null,
      "skygrid_internal",
      "correlation_null_event",
      new Date().toISOString(),
      "diagnostic",
      "postman",
      "home",
      1,
      202,
      "partition_route_approved",
      "controlled_pilot",
      "fail_closed",
      0,
      0,
      "sha256:null-event",
      100,
      "sha256:null-event-receipt",
      20,
      1
    )
  ));

  tests.push(expectBlocked(
    "rejected event claiming Aura validation",
    () => insert.run(
      "pilot_local_003",
      "skygrid_internal",
      "correlation_invalid_aura",
      new Date().toISOString(),
      "diagnostic",
      "postman",
      "home",
      0,
      403,
      "unsafe_action_requested",
      "controlled_pilot",
      "fail_closed",
      0,
      0,
      "sha256:rejected-payload",
      140,
      "sha256:rejected-receipt",
      18,
      1
    )
  ));

  tests.push(expectBlocked(
    "non-pilot mode",
    () => insert.run(
      "pilot_local_004",
      "skygrid_internal",
      "correlation_invalid_mode",
      new Date().toISOString(),
      "diagnostic",
      "postman",
      "home",
      1,
      202,
      "partition_route_approved",
      "production",
      "fail_closed",
      0,
      0,
      "sha256:invalid-mode",
      120,
      "sha256:invalid-mode-receipt",
      22,
      1
    )
  ));

  const ok =
    receipt?.AuraValidated === 1 &&
    tests.every((test) => test.blocked);

  console.log(JSON.stringify({
    ok,
    databasePath,
    receipt,
    constraintTests: tests
  }, null, 2));

  if (!ok) {
    process.exitCode = 1;
  }
} finally {
  database.close();
}