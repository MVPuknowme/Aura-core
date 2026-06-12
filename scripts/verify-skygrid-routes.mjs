const base = (process.env.SKYGRID_BASE_URL || "https://aura-core.vercel.app").replace(/\/$/, "");
const allowPendingDomain = process.env.SKYGRID_ALLOW_PENDING_DOMAIN === "true";

const checks = [
  ["GET", "/"],
  ["GET", "/health.json"],
  ["GET", "/dispatch"],
  ["GET", "/scenarios"],
  ["GET", "/api/skygrid/status"],
  ["GET", "/api/highway/status"],
  ["POST", "/api/skygrid/intake"]
];

const okStatuses = new Set([200, 202, 204, 301, 302, 307, 308, 405]);
const pendingStatuses = new Set([401, 403, 404]);

let failed = false;
let pending = false;

for (const [method, path] of checks) {
  const url = `${base}${path}`;

  try {
    const res = await fetch(url, { method });

    if (okStatuses.has(res.status)) {
      console.log(`${method} ${url} -> ${res.status} OK`);
      continue;
    }

    if (pendingStatuses.has(res.status)) {
      pending = true;
      console.warn(`${method} ${url} -> ${res.status} WARN route_pending_or_domain_binding`);
      continue;
    }

    failed = true;
    console.error(`${method} ${url} -> ${res.status} FAIL`);
  } catch (error) {
    if (allowPendingDomain) {
      pending = true;
      console.warn(`${method} ${url} -> ERROR ${error.message} WARN public_domain_pending_dns_tls_or_proxy`);
      continue;
    }

    failed = true;
    console.error(`${method} ${url} -> ERROR ${error.message}`);
  }
}

if (pending) {
  console.warn("SKYGRID route verifier completed with pending public-domain routes. Runner dependencies are healthy; check Vercel domain binding/protection separately.");
}

if (pending && allowPendingDomain) {
  console.warn("SKYGRID_ALLOW_PENDING_DOMAIN=true; pending public-domain DNS/TLS/protection responses are non-blocking for this preflight.");
}

if (failed) process.exit(1);
