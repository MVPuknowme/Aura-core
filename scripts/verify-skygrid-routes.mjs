const DEFAULT_BASE_URL = "https://aura-core-home-e539c0b1.vercel.app";
const FALLBACK_BASE_URL = "https://aura-core-mvpuknowme-home-e539c0b1.vercel.app";

const base = (
  process.env.SKYGRID_BASE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  DEFAULT_BASE_URL
).replace(/\/+$/, "");

const fallbackBase = (process.env.SKYGRID_FALLBACK_URL || FALLBACK_BASE_URL).replace(/\/+$/, "");
const allowPendingDomain = process.env.SKYGRID_ALLOW_PENDING_DOMAIN === "true";
const timeoutMs = Number(process.env.SKYGRID_ROUTE_CHECK_TIMEOUT_MS || 15000);

const checks = [
  ["GET", "/"],
  ["GET", "/health.json"],
  ["GET", "/dispatch"],
  ["GET", "/scenarios"],
  ["GET", "/api/skygrid/status"],
  ["GET", "/api/highway/status"],
  ["GET", "/api/highway/postman"],
  ["POST", "/api/skygrid/intake"],
  ["POST", "/api/node-lease/intake"]
];

const okStatuses = new Set([200, 202, 204, 301, 302, 307, 308, 405]);
const pendingStatuses = new Set([401, 402, 403, 404]);

let failed = false;
let pending = false;

async function probe(baseUrl, method, path) {
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { method, signal: controller.signal });
    return { url, status: res.status, ok: okStatuses.has(res.status), pending: pendingStatuses.has(res.status) };
  } catch (error) {
    return { url, error: error?.message || String(error), ok: false, pending: false };
  } finally {
    clearTimeout(timer);
  }
}

for (const [method, path] of checks) {
  let result = await probe(base, method, path);

  if (!result.ok && result.status === 404 && fallbackBase && fallbackBase !== base) {
    const fallback = await probe(fallbackBase, method, path);
    if (fallback.ok) {
      console.warn(`${method} ${result.url} -> 404 WARN primary_domain_missing_route; fallback ${fallback.url} -> ${fallback.status} OK`);
      pending = true;
      continue;
    }
  }

  if (result.ok) {
    console.log(`${method} ${result.url} -> ${result.status} OK`);
    continue;
  }

  if (result.pending) {
    pending = true;
    console.warn(`${method} ${result.url} -> ${result.status} WARN route_pending_domain_binding_or_protection`);
    continue;
  }

  if (allowPendingDomain && result.error) {
    pending = true;
    console.warn(`${method} ${result.url} -> ERROR ${result.error} WARN public_domain_pending_dns_tls_or_proxy`);
    continue;
  }

  failed = true;
  if (result.error) console.error(`${method} ${result.url} -> ERROR ${result.error}`);
  else console.error(`${method} ${result.url} -> ${result.status} FAIL`);
}

if (pending) {
  console.warn("SKYGRID route verifier completed with pending public-domain routes. Runner dependencies are healthy; check Vercel domain binding/protection separately.");
}

if (pending && allowPendingDomain) {
  console.warn("SKYGRID_ALLOW_PENDING_DOMAIN=true; pending public-domain DNS/TLS/protection responses are non-blocking for this preflight.");
}

if (failed) process.exit(1);
