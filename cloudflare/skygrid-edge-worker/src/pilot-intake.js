import {
  authenticatePilot,
  createPilotReceipt,
  persistPilotReceipt,
  readPilotPayload
} from "./pilot-evidence.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-skygrid-edge": "cloudflare-worker"
    }
  });
}

function failureDecision(reason, eventId = null) {
  return {
    accepted: false,
    event: {
      eventId: eventId ?? `pilot_${crypto.randomUUID()}`,
      receivedAt: new Date().toISOString(),
      decision: {
        ok: false,
        reason,
        mode: "controlled_pilot",
        sentinel: "fail_closed"
      }
    }
  };
}

function validCorrelationId(value) {
  return /^[A-Za-z0-9._:-]{8,128}$/.test(value);
}

function decisionIsStructurallySafe(runtimePayload) {
  const decision = runtimePayload?.event?.decision;

  if (!decision || typeof decision.ok !== "boolean") {
    return false;
  }

  if (decision.ok === false) {
    return true;
  }

  return (
    decision.reason === "partition_route_approved" &&
    decision.mode === "controlled_pilot" &&
    decision.sentinel === "fail_closed"
  );
}

export async function handlePilotIntake(
  request,
  env,
  {
    fetchImpl = fetch,
    origin =
      env.SKYGRID_ORIGIN ??
      "https://aurcore.skygrid-protocol.net"
  } = {}
) {
  const authentication = authenticatePilot(request, env);

  if (!authentication.ok) {
    return json(
      {
        ok: false,
        system: "SKYGRID Emergency Data On-Ramp",
        reason: authentication.reason
      },
      authentication.status
    );
  }

  const parsed = await readPilotPayload(request);

  if (!parsed.ok) {
    return json(
      {
        ok: false,
        system: "SKYGRID Emergency Data On-Ramp",
        reason: parsed.reason,
        payloadBytes: parsed.payloadBytes
      },
      parsed.status
    );
  }

  const correlationId = String(
    request.headers.get("x-skygrid-correlation-id") ??
    parsed.body.correlation_id ??
    ""
  ).trim();

  if (!validCorrelationId(correlationId)) {
    return json(
      {
        ok: false,
        system: "SKYGRID Emergency Data On-Ramp",
        reason: "valid_correlation_id_required"
      },
      400
    );
  }

  const startedAt = Date.now();
  let runtimePayload;
  let runtimeStatus;

  try {
    const runtimeUrl = new URL(
      "/api/skygrid/intake",
      origin
    );

    const runtimeResponse = await fetchImpl(
      runtimeUrl.toString(),
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "user-agent":
            "SKYGRID-Cloudflare-Pilot-Intake/1.0",
          "x-skygrid-partner-id":
            authentication.partnerId,
          "x-skygrid-correlation-id":
            correlationId
        },
        body: JSON.stringify(parsed.body)
      }
    );

    runtimeStatus = runtimeResponse.status;

    try {
      runtimePayload = await runtimeResponse.json();
    } catch {
      runtimePayload = failureDecision(
        "runtime_response_invalid"
      );
      runtimeStatus = 502;
    }

    if (!decisionIsStructurallySafe(runtimePayload)) {
      runtimePayload = failureDecision(
        "runtime_policy_mismatch",
        runtimePayload?.event?.eventId
      );
      runtimeStatus = 502;
    }
  } catch {
    runtimePayload = failureDecision(
      "runtime_unavailable"
    );
    runtimeStatus = 502;
  }

  const processingMs = Date.now() - startedAt;

  const receipt = await createPilotReceipt({
    body: parsed.body,
    rawPayload: parsed.raw,
    payloadBytes: parsed.payloadBytes,
    partnerId: authentication.partnerId,
    correlationId,
    runtimePayload,
    httpStatus: runtimeStatus,
    processingMs
  });

  try {
    await persistPilotReceipt(env.MY_DB, receipt);
  } catch (error) {
    const message = String(error?.message ?? error);

    if (
      message.includes("UNIQUE constraint failed") ||
      message.includes("PartnerId") &&
      message.includes("CorrelationId")
    ) {
      return json(
        {
          ok: false,
          system: "SKYGRID Emergency Data On-Ramp",
          reason: "correlation_already_recorded",
          correlationId
        },
        409
      );
    }

    console.error(
      "Pilot evidence persistence failed",
      error
    );

    return json(
      {
        ok: false,
        system: "SKYGRID Emergency Data On-Ramp",
        reason: "evidence_persistence_failed",
        sentinel: "fail_closed"
      },
      503
    );
  }

  return json(
    {
      ok: receipt.DecisionOk === 1,
      accepted: receipt.DecisionOk === 1,
      system: "SKYGRID Emergency Data On-Ramp",
      edge: "cloudflare-worker",
      receipt: {
        eventId: receipt.EventId,
        partnerId: receipt.PartnerId,
        correlationId: receipt.CorrelationId,
        receivedAt: receipt.ReceivedAt,
        decisionReason: receipt.DecisionReason,
        mode: receipt.Mode,
        sentinel: receipt.Sentinel,
        payloadHash: receipt.PayloadHash,
        receiptHash: receipt.ReceiptHash,
        processingMs: receipt.ProcessingMs,
        auraValidated:
          receipt.AuraValidated === 1,
        receiptVersion: receipt.ReceiptVersion
      }
    },
    runtimeStatus
  );
}