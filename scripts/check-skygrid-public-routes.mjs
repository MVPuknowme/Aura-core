const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const timeoutMs = Number(process.env.SKYGRID_ROUTE_CHECK_TIMEOUT_MS || 15000);

const localBase = process.env.SKYGRID_LOCAL_PUBLIC_URL || "http://127.0.0.1:3000";
const devcontainerBase = process.env.SKYGRID_DEVCONTAINER_PUBLIC_URL || process.env.SKYGRID_CODESPACE_PUBLIC_URL || "";
const extraBase = process.env.SKYGRID_EXTRA_PUBLIC_URL || "";

const checkRemotePublic = process.env.SKYGRID_CHECK_REMOTE_PUBLIC === "true";
const checkVercel = process.env.SKYGRID_CHECK_VERCEL === "true";
const checkLegacyAlias = process.env.SKYGRID_CHECK_LEGACY_ALIAS === "true";

const primaryBase = process.env.SKYGRID_PRIMARY_PUBLIC_URL || "https://aurcore.skygrid-protocol.net";
const canonicalVercelBase = process.env.SKYGRID_CANONICAL_VERCEL_URL || "https://aura-core-home-e539c0b1.vercel.app";
const mvpVercelBase = process.env.SKYGRID_MVP_VERCEL_URL || "https://aura-core-mvpuknowme-home-e539c0b1.vercel.app";
const healthyVercelBase = process.env.SKYGRID_VERCEL_PUBLIC_URL || canonicalVercelBase;
const legacyBase = process.env.SKYGRID_LEGACY_PUBLIC_URL || "https://aura-core.vercel.app";
const allowPendingDomain = process.env.SKYGRID_ALLOW_PENDING_DOMAIN !== "false";

const bases = unique([
  localBase,
  devcontainerBase,
  extraBase,
  checkRemotePublic ? primaryBase : "",
  checkVercel ? healthyVercelBase : "",
  checkVercel ? canonicalVercelBase : "",
  checkVercel ? mvpVercelBase : "",
  checkLegacyAlias ? legacyBase : ""
].filter(Boolean).map(stripSlash));

const checks = [
  { method: "GET", path: "/", required: true, expectedStatuses: [200], expectedType: "text/html" },
  { method: "GET", path: "/health.json", required: true, expectedStatuses: [200], expectedType: "application/json" },
  { method: "GET", path: "/api/highway/status", required: true, expectedStatuses: [200], expectedType: "application/json" },
  { method: "GET", path: "/api/highway/postman", required: true, expectedStatuses: [200], expectedType: "application/json" },
  { method: "GET", path: "/api/pay/quote?amount=25", required: true, expectedStatuses: [200], expectedType: "application/json" }
];

const pendingDomainStatuses = new Set([401, 403, 404]);
const resultsByPath = new Map();

function stripSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function unique(values) {
  return [...new Set(values)];
}

function expectedStatusSet(check) {
  return new Set(check.expectedStatuses || [200]);
}

function contentTypeMatches(actual, expected) {
  if (!expected) return true;
  return String(actual || "").toLowerCase().includes(expected.toLowerCase());
}

async function probe(base, check) {
  const url = `${base}${check.path}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: check.method,
      headers: {
        Accept: check.expectedType || "*/*",
        "User-Agent": `${PRODUCT.replace(/\s+/g, "-")}/public-route-check`
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
    const elapsedMs = Date.now() - started;
    const contentType = res.headers.get("content-type") || "";
    const expectedStatuses = expectedStatusSet(check);
    const statusOk = expectedStatuses.has(res.status);
    const typeOk = statusOk && contentTypeMatches(contentType, check.expectedType);
    const pendingDomain = !statusOk && allowPendingDomain && pendingDomainStatuses.has(res.status);
    return { base, path: check.path, method: check.method, status: res.status, contentType, elapsedMs, statusOk, typeOk, ok: statusOk && typeOk, pendingDomain, expectedStatuses: [...expectedStatuses] };
  } catch (error) {
    return { base, path: check.path, method: check.method, status: 0, contentType: "", elapsedMs: Date.now() - started, statusOk: false, typeOk: false, ok: false, pendingDomain: false, error: String(error?.message || error), expectedStatuses: check.expectedStatuses || [200] };
  }
}

function logResult(result) {
  const label = result.ok ? "PASS" : result.pendingDomain ? "PENDING" : "FAIL";
  const status = result.status || "ERR";
  const type = result.contentType || result.error || "";
  console.log(`${label} ${status} ${result.path} ${result.elapsedMs}ms ${type}`.trim());
}

if (!bases.length) {
  console.error("No SKYGRID route-check base URLs were configured.");
  process.exit(1);
}

console.log("SKYGRID public route checker running in local/devcontainer-first mode.");
console.log("Remote public domains are skipped unless SKYGRID_CHECK_REMOTE_PUBLIC=true.");
console.log("Vercel aliases are skipped unless SKYGRID_CHECK_VERCEL=true.");

for (const base of bases) {
  console.log(`\n== SKYGRID public route check: ${base} ==`);
  for (const check of checks) {
    const result = await probe(base, check);
    logResult(result);
    if (!resultsByPath.has(check.path)) resultsByPath.set(check.path, []);
    resultsByPath.get(check.path).push(result);
  }
}

const failures = [];
const pending = [];

for (const check of checks) {
  const results = resultsByPath.get(check.path) || [];
  const healthy = results.filter((result) => result.ok);
  const pendingResults = results.filter((result) => result.pendingDomain);

  if (!check.required) continue;
  if (healthy.length > 0) {
    if (pendingResults.length > 0) {
      pending.push(...pendingResults.map((result) => `${result.base}${result.path} returned ${result.status} while another base passed`));
    }
    continue;
  }

  failures.push(...results.map((result) => {
    const expected = (result.expectedStatuses || check.expectedStatuses || [200]).join("/");
    if (result.error) return `${result.base}${result.path}: expected ${expected} received ${result.error}`;
    if (!result.statusOk) return `${result.base}${result.path}: expected ${expected} received ${result.status}`;
    return `${result.base}${result.path}: content-type ${result.contentType || "missing"} did not include ${check.expectedType}`;
  }));
}

if (pending.length) {
  console.warn("\nSKYGRID pending-domain warnings:");
  for (const item of pending) console.warn(`- ${item}`);
}

if (failures.length) {
  console.error("\nSKYGRID public route check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\nSKYGRID public route check passed.");
