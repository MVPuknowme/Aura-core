const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const ROUTE = "/api/skygrid/gspc";
const GSPC_URL = "https://councilof.ai/api/gspc";
const EXPECTED_SCHEMA = "csoai.gspc-axes/0.5";

function receiptBase(now) {
  return {
    receipt_type: "skygrid_gspc_read",
    receipt_version: "1.0.0",
    service: PRODUCT,
    route: ROUTE,
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    source: { provider: "councilof.ai", endpoint: GSPC_URL },
    policy: { read_only: true, upstream_auth: false, execution: false, writes_board: false },
    timestamp: now()
  };
}

function sanitizePayload(payload) {
  return {
    schema: payload.schema,
    issuer: payload.issuer ?? null,
    doi: payload.doi ?? null,
    measured_on: payload.measured_on ?? null,
    totals: payload.totals ?? null,
    axis: payload.axis ?? null,
    note: payload.note ?? null,
    state_enum: payload.state_enum ?? null,
    site_attestation: payload.site_attestation ?? null
  };
}

export async function evaluateGspcRead({
  axis,
  fetchImpl = fetch,
  now = () => new Date().toISOString()
} = {}) {
  const base = receiptBase(now);
  const upstream = new URL(GSPC_URL);
  const axisName = String(axis || "").trim();
  if (axisName) upstream.searchParams.set("axis", axisName);

  const response = await fetchImpl(upstream, {
    method: "GET",
    headers: { accept: "application/json", "user-agent": "SKYGRID-GSPC-Read/1.0" }
  });
  const payload = await response.json();

  return {
    status: 200,
    body: {
      ...base,
      ok: true,
      state: "read_verified",
      execution_allowed: false,
      reason: "gspc_read_verified",
      ...(axisName ? { query: { axis: axisName } } : {}),
      data: sanitizePayload(payload)
    }
  };
}

export { EXPECTED_SCHEMA, GSPC_URL };
