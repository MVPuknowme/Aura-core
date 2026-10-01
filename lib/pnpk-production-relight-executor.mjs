import { createHash } from "node:crypto";

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function httpsUrl(value, code) {
  const url = new URL(String(value ?? ""));
  if (url.protocol !== "https:") throw new Error(code);
  return url;
}

export async function executeProductionRelight({
  routeId,
  preflight,
  executorUrl,
  healthUrl,
  executorToken = "",
  now = new Date(),
  fetchImpl = fetch
} = {}) {
  if (preflight?.decision !== "RELIGHT_APPROVED") {
    throw new Error("relight_executor_preflight_not_approved");
  }
  if (preflight?.authorization?.authenticated !== true) {
    throw new Error("relight_executor_authorization_not_authenticated");
  }
  if (
    preflight.route_id !== routeId ||
    preflight.authorization.route_id !== routeId
  ) {
    throw new Error("relight_executor_route_mismatch");
  }

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const expiresMs = new Date(preflight.authorization.expires_at).getTime();
  if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) {
    throw new Error("relight_executor_preflight_expired");
  }

  const executor = httpsUrl(
    executorUrl,
    "relight_executor_https_required"
  );
  const health = httpsUrl(
    healthUrl,
    "relight_executor_health_https_required"
  );

  const response = await fetchImpl(executor, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(executorToken
        ? { authorization: `Bearer ${executorToken}` }
        : {})
    },
    body: JSON.stringify({
      action: "network_relight",
      route_id: routeId,
      activation_grant_id: preflight.activation_grant_id,
      preflight_receipt_hash: preflight.receipt_hash
    })
  });

  let executionPayload = {};
  try {
    executionPayload = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(`relight_executor_rejected_${response.status}`);
  }

  const healthResponse = await fetchImpl(health, {
    method: "GET",
    headers: { accept: "application/json" }
  });

  let healthPayload = {};
  try {
    healthPayload = await healthResponse.json();
  } catch {}

  const postHealthOk =
    healthResponse.ok &&
    (healthPayload.ok === true || healthPayload.status === "ok");

  const postReceipt = {
    schema: "pnpk.production-network-relight-result.v1",
    route_id: routeId,
    activation_grant_id: preflight.activation_grant_id,
    preflight_receipt_hash: preflight.receipt_hash,
    execution_http_status: response.status,
    execution_reference:
      executionPayload.operation_id ??
      executionPayload.request_id ??
      null,
    post_health_http_status: healthResponse.status,
    post_health_ok: postHealthOk,
    observed_at: new Date(nowMs).toISOString(),
    decision: postHealthOk
      ? "RELIGHT_COMPLETED"
      : "ROLLBACK_REQUIRED"
  };

  return {
    ...postReceipt,
    post_receipt_hash: hash(postReceipt)
  };
}
