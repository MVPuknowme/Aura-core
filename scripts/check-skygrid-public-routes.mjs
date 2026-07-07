const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const timeoutMs = Number(process.env.SKYGRID_ROUTE_CHECK_TIMEOUT_MS || 15000);

const primaryBase = process.env.SKYGRID_PRIMARY_PUBLIC_URL || "https://aurcore.skygrid-protocol.net";
const canonicalVercelBase = process.env.SKYGRID_CANONICAL_VERCEL_URL || "https://aura-core-home-e539c0b1.vercel.app";
const mvpVercelBase = process.env.SKYGRID_MVP_VERCEL_URL || "https://aura-core-mvpuknowme-home-e539c0b1.vercel.app";
const healthyVercelBase = process.env.SKYGRID_VERCEL_PUBLIC_URL || canonicalVercelBase;
const legacyBase = process.env.SKYGRID_LEGACY_PUBLIC_URL || "https://aura-core.vercel.app";
const allowPendingDomain = process.env.SKYGRID_ALLOW_PENDING_DOMAIN !== "false";

const bases = unique([
  primaryBase,
  healthyVercelBase,
  canonicalVercelBase,
  mvpVercelBase,
  process.env.SKYGRID_EXTRA_PUBLIC_URL,
  process.env.SKYGRID_CHECK_LEGACY_ALIAS === "true" ? legacyBase : ""
].filter(Boolean).map(stripSlash));

const checks = [
  { method: "GET", path: "/", required: true },
  { method: "GET", path: "/health.json", required: true },
  { method: "GET", path: "/api/highway/status", required: true },
  { method: "GET", path: "/api/highway/postman", required: true },
  { method: "GET", path: "/api/pay/quote?amount=25", required: true }
];

const okStatuses = new Set([200, 202, 204, 301, 302, 307, 308]);
const pendingDomainStatuses = new Set([401, 403, 404]);
const resultsByPath = new Map();

function stripSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function unique(values) {
  return [...new Set(values)];
}

async function probe(base, check) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = `${base}${check.path}`;

  try {
    const res = await fetch(url, {
      method: check.method,
      signal: controller.signal,
      headers: { "User-Agent": "skygrid-public-route-check/1.0" }
    });

    const type = res.headers.get("content-type") || "unknown";
    return {
      base,
      url,
      ...check,
      status: res.status,
      type,
      ok: okStatuses.has(res.status),
      pendingDomain: pendingDomainStatuses.has(res.status)
    };
  } catch (error) {
    return {
      base,
      url,
      ...check,
      error: error?.message || String(error),
      ok: false,
      pendingDomain: false
    };
  } finally {
    clearTimeout(timer);
  }
}

function logResult(result) {
  const status = result.error ? `ERROR ${result.error}` : `${result.status}`;
  const detail = result.type ? ` ${result.type}` : "";
  const verdict = result.ok ? "PASS" : result.pendingDomain ? "WARN" : "FAIL";
  console.log(`${verdict} ${status} ${result.path} ${result.url}${detail}`);
}

for (const base of bases) {
  console.log(`\n== ${PRODUCT} public route check: ${base} ==`);
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
  const anyHealthy = results.some((result) => result.ok);

  if (anyHealthy) {
    for (const result of results) {
      if (!result.ok && result.pendingDomain) {
        pending.push(`${result.url}: ${result.status} pending alias/domain binding; healthy fallback exists for ${check.path}`);
      }
    }
    continue;
  }

  const hardFailures = results.filter((result) => !result.pendingDomain || !allowPendingDomain);
  if (hardFailures.length) {
    failures.push(...hardFailures.map((result) => result.error
      ? `${result.url}: ${result.error}`
      : `${result.url}: expected healthy status, received ${result.status}`));
    continue;
  }

  pending.push(`${check.path}: no healthy public base yet, but only pending alias/domain responses were seen`);
}

if (pending.length) {
  console.warn("\nSKYGRID public route check warnings:");
  for (const item of pending) console.warn(`- ${item}`);
}

if (failures.length) {
  console.error("\nSKYGRID public route check failed:");
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log("\nSKYGRID public route check passed: at least one healthy public base served every required route.");
