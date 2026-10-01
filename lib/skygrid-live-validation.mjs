import { createHash } from "node:crypto";

function hash(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export async function runLiveValidation({
  baseUrl,
  targets = [],
  allowedHosts = [],
  fetchImpl = fetch,
  observedAt = new Date()
} = {}) {
  const base = new URL(String(baseUrl ?? ""));
  if (base.protocol !== "https:") {
    throw new Error("live_validation_https_required");
  }
  if (!allowedHosts.includes(base.hostname)) {
    throw new Error("live_validation_host_not_allowed");
  }
  if (!Array.isArray(targets) || targets.length === 0) {
    throw new Error("live_validation_targets_required");
  }

  const results = [];
  for (const target of targets) {
    const path = String(target ?? "");
    if (!path.startsWith("/") || path.startsWith("//")) {
      throw new Error("live_validation_target_invalid");
    }

    const url = new URL(path, base);
    if (
      url.protocol !== "https:" ||
      url.hostname !== base.hostname
    ) {
      throw new Error("live_validation_target_escape_blocked");
    }

    const response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json,text/html;q=0.9,*/*;q=0.1"
      }
    });

    let body = "";
    try {
      body = await response.text();
    } catch {}

    results.push({
      target: path,
      http_status: response.status,
      ok: response.ok,
      body_hash: hash(body)
    });
  }

  const receipt = {
    schema: "skygrid.live-validation.v1",
    observed_at: observedAt.toISOString(),
    base_url: base.origin,
    method: "GET",
    targets,
    results,
    decision: results.every((item) => item.ok)
      ? "LIVE_VALIDATION_PASS"
      : "FAIL_CLOSED"
  };

  return {
    ...receipt,
    receipt_hash: hash(receipt)
  };
}
