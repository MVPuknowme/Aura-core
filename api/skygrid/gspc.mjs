const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const ROUTE = "/api/skygrid/gspc";
const GSPC_URL = "https://councilof.ai/api/gspc";
const EXPECTED_SCHEMA = "csoai.gspc-axes/0.5";
const DEFAULT_TIMEOUT_MS = 8_000;
function receiptBase(now) { return { receipt_type: "skygrid_gspc_read", receipt_version: "1.0.0", service: PRODUCT, route: ROUTE, mode: "controlled_pilot", sentinel: "fail_closed", source: { provider: "councilof.ai", endpoint: GSPC_URL }, policy: { read_only: true, upstream_auth: false, execution: false, writes_board: false }, timestamp: now() }; }
function blocked(base, status, reason, extra = {}) { return { status, body: { ...base, ok: false, state: "blocked", execution_allowed: false, reason, ...extra } }; }
function safeAxisList(value) { return Array.isArray(value) ? value.filter((item) => typeof item === "string" && /^[a-z0-9-]{1,64}$/.test(item)).slice(0, 64) : []; }
function sanitizePayload(payload) { return { schema: payload.schema, issuer: payload.issuer ?? null, doi: payload.doi ?? null, measured_on: payload.measured_on ?? null, totals: payload.totals ?? null, axis: payload.axis ?? null, note: payload.note ?? null, state_enum: payload.state_enum ?? null, site_attestation: payload.site_attestation ?? null }; }
export async function evaluateGspcRead({ axis, fetchImpl = fetch, now = () => new Date().toISOString(), timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const base = receiptBase(now); const upstream = new URL(GSPC_URL); const axisName = String(axis || "").trim();
  if (axisName && !/^[a-z0-9-]{1,64}$/.test(axisName)) return blocked(base, 400, "gspc_axis_invalid");
  if (axisName) upstream.searchParams.set("axis", axisName);
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), timeoutMs); let response;
  try { response = await fetchImpl(upstream, { method: "GET", headers: { accept: "application/json", "user-agent": "SKYGRID-GSPC-Read/1.0" }, signal: controller.signal }); }
  catch (error) { return blocked(base, error?.name === "AbortError" ? 504 : 502, error?.name === "AbortError" ? "gspc_request_timeout" : "gspc_unreachable"); }
  finally { clearTimeout(timeout); }
  let payload; try { payload = await response.json(); } catch { return blocked(base, 502, "gspc_response_invalid"); }
  if (axisName && response.status === 404 && payload?.error === "unknown axis") return blocked(base, 404, "gspc_axis_unknown", { query: { axis: axisName }, known: safeAxisList(payload.known) });
  if (payload?.schema !== EXPECTED_SCHEMA) return blocked(base, 502, "gspc_schema_mismatch", { expected_schema: EXPECTED_SCHEMA });
  return { status: 200, body: { ...base, ok: true, state: "read_verified", execution_allowed: false, reason: "gspc_read_verified", ...(axisName ? { query: { axis: axisName } } : {}), data: sanitizePayload(payload) } };
}
export { EXPECTED_SCHEMA, GSPC_URL };
