import { createHmac, randomBytes } from "node:crypto";
import "./skygrid-ci-auth-bootstrap.mjs";

const nativeFetch = globalThis.fetch;

function normalizeTrainingBody(rawBody) {
  try {
    const payload = JSON.parse(rawBody);
    const event = payload?.event;
    if (!event || typeof event !== "object" || Array.isArray(event)) {
      return rawBody;
    }

    for (const key of [
      "route_type",
      "requested_ramp",
      "requested_node",
      "owner_approval",
      "emergency_operator_approval",
      "wallet_signing_requested",
      "transaction_broadcast_requested",
      "payment_execution_requested",
      "production_failover_requested",
      "private_data_movement_requested"
    ]) {
      if (payload[key] === undefined && event[key] !== undefined) {
        payload[key] = event[key];
      }
    }

    if (!payload.type) {
      payload.type = event.type || event.event_type || event.route_type || payload.category;
    }

    return JSON.stringify(payload);
  } catch {
    return rawBody;
  }
}

if (nativeFetch && !globalThis.__skygridTrainingSignedFetchInstalled) {
  globalThis.fetch = (input, init = {}) => {
    const method = String(init.method || "GET").toUpperCase();
    const originalBody = typeof init.body === "string" ? init.body : "";

    if (method !== "POST" || !originalBody) {
      return nativeFetch(input, init);
    }

    const secret = process.env.SKYGRID_INGEST_SECRET;
    if (!secret) {
      throw new Error(
        "SKYGRID_INGEST_SECRET is required to run authenticated training drills."
      );
    }

    const rawBody = normalizeTrainingBody(originalBody);
    const timestamp = String(Date.now());
    const nonce = randomBytes(18).toString("base64url");
    const signature = createHmac("sha256", secret)
      .update(`${timestamp}.${nonce}.${rawBody}`)
      .digest("hex");
    const headers = new Headers(init.headers || {});
    headers.set("content-type", "application/json");
    headers.set("x-skygrid-timestamp", timestamp);
    headers.set("x-skygrid-nonce", nonce);
    headers.set("x-skygrid-signature", signature);

    return nativeFetch(input, {
      ...init,
      body: rawBody,
      headers
    });
  };

  globalThis.__skygridTrainingSignedFetchInstalled = true;
}
