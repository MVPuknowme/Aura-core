const encoder = new TextEncoder();

export const MAX_PILOT_PAYLOAD_BYTES = 16_384;

export async function sha256Hex(value) {
  const bytes =
    value instanceof Uint8Array
      ? value
      : encoder.encode(String(value));

  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function constantTimeEqual(leftValue, rightValue) {
  const left = encoder.encode(String(leftValue ?? ""));
  const right = encoder.encode(String(rightValue ?? ""));

  const maximumLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;

  for (let index = 0; index < maximumLength; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }

  return difference === 0;
}

export function authenticatePilot(request, env) {
  const expectedKey = String(env.SKYGRID_PILOT_API_KEY ?? "");
  const suppliedKey = String(
    request.headers.get("x-skygrid-pilot-key") ?? ""
  );

  if (!expectedKey) {
    return {
      ok: false,
      status: 503,
      reason: "pilot_key_not_configured"
    };
  }

  if (!suppliedKey) {
    return {
      ok: false,
      status: 401,
      reason: "pilot_key_required"
    };
  }

  if (!constantTimeEqual(suppliedKey, expectedKey)) {
    return {
      ok: false,
      status: 403,
      reason: "pilot_key_invalid"
    };
  }

  const partnerId = String(
    request.headers.get("x-skygrid-partner-id") ?? ""
  ).trim();

  if (!partnerId) {
    return {
      ok: false,
      status: 400,
      reason: "partner_id_required"
    };
  }

  return {
    ok: true,
    status: 200,
    partnerId
  };
}

export async function readPilotPayload(
  request,
  maximumBytes = MAX_PILOT_PAYLOAD_BYTES
) {
  const raw = await request.text();
  const payloadBytes = encoder.encode(raw).byteLength;

  if (payloadBytes > maximumBytes) {
    return {
      ok: false,
      status: 413,
      reason: "payload_too_large",
      payloadBytes
    };
  }

  let body;

  try {
    body = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      status: 400,
      reason: "invalid_json",
      payloadBytes
    };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      reason: "payload_must_be_object",
      payloadBytes
    };
  }

  return {
    ok: true,
    body,
    raw,
    payloadBytes
  };
}

export async function createPilotReceipt({
  body,
  rawPayload,
  payloadBytes,
  partnerId,
  correlationId,
  runtimePayload,
  httpStatus,
  processingMs
}) {
  const event = runtimePayload?.event ?? {};
  const decision = event?.decision ?? {};

  const decisionOk =
    decision.ok === true ||
    runtimePayload?.accepted === true;

  const auraValidated =
    decisionOk &&
    decision.reason === "partition_route_approved" &&
    decision.mode === "controlled_pilot" &&
    decision.sentinel === "fail_closed";

  const eventId =
    event.eventId ??
    `pilot_${crypto.randomUUID()}`;

  const receivedAt =
    event.receivedAt ??
    new Date().toISOString();

  const payloadHash = await sha256Hex(rawPayload);

  const receiptCore = {
    eventId,
    partnerId,
    correlationId,
    receivedAt,
    routeType: body.route_type ?? null,
    requestedRamp: body.requested_ramp ?? null,
    requestedNode: body.requested_node ?? null,
    decisionOk,
    httpStatus,
    decisionReason:
      decision.reason ?? "runtime_decision_missing",
    mode: decision.mode ?? "controlled_pilot",
    sentinel: decision.sentinel ?? "fail_closed",
    payloadHash,
    payloadBytes,
    processingMs,
    auraValidated
  };

  const receiptHash = await sha256Hex(
    JSON.stringify(receiptCore)
  );

  return {
    EventId: eventId,
    PartnerId: partnerId,
    CorrelationId: correlationId,
    ReceivedAt: receivedAt,
    RouteType: String(body.route_type ?? "unknown"),
    RequestedRamp: String(
      body.requested_ramp ?? "unknown"
    ),
    RequestedNode: String(
      body.requested_node ?? "unknown"
    ),
    DecisionOk: decisionOk ? 1 : 0,
    HttpStatus: Number(httpStatus),
    DecisionReason: String(
      decision.reason ?? "runtime_decision_missing"
    ),
    Mode: String(
      decision.mode ?? "controlled_pilot"
    ),
    Sentinel: String(
      decision.sentinel ?? "fail_closed"
    ),
    OwnerApproval:
      body.owner_approval === true ? 1 : 0,
    EmergencyOperatorApproval:
      body.emergency_operator_approval === true
        ? 1
        : 0,
    PayloadHash: `sha256:${payloadHash}`,
    PayloadBytes: Number(payloadBytes),
    ReceiptHash: `sha256:${receiptHash}`,
    ProcessingMs: Math.max(
      0,
      Number(processingMs)
    ),
    AuraValidated: auraValidated ? 1 : 0,
    ReceiptVersion: "1.0"
  };
}

export async function persistPilotReceipt(
  database,
  receipt
) {
  if (!database) {
    throw new Error("D1 binding MY_DB is unavailable");
  }

  const statement = database.prepare(`
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
      AuraValidated,
      ReceiptVersion
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  return statement.bind(
    receipt.EventId,
    receipt.PartnerId,
    receipt.CorrelationId,
    receipt.ReceivedAt,
    receipt.RouteType,
    receipt.RequestedRamp,
    receipt.RequestedNode,
    receipt.DecisionOk,
    receipt.HttpStatus,
    receipt.DecisionReason,
    receipt.Mode,
    receipt.Sentinel,
    receipt.OwnerApproval,
    receipt.EmergencyOperatorApproval,
    receipt.PayloadHash,
    receipt.PayloadBytes,
    receipt.ReceiptHash,
    receipt.ProcessingMs,
    receipt.AuraValidated,
    receipt.ReceiptVersion
  ).run();
}