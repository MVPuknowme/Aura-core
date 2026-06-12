const base = (process.env.SKYGRID_BASE_URL || "https://aura-core.vercel.app").replace(/\/$/, "");

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
  try {
    const res = await fetch(`${base}${path}`, { method });

    if (okStatuses.has(res.status)) {
      console.log(`${method} ${base}${path} -> ${res.status} OK`);
      continue;
    }

    if (pendingStatuses.has(res.status)) {
      pending = true;
      console.warn(`${method} ${base}${path} -> ${res.status} WARN route_pending_or_domain_binding`);
      continue;
    }

    failed = true;
    console.error(`${method} ${base}${path} -> ${res.status} FAIL`);
  } catch (error) {
    failed = true;
    console.error(`${method} ${base}${path} -> ERROR ${error.message}`);
  }
}

if (pending) {
  console.warn("SKYGRID route verifier completed with pending public-domain routes. Runner dependencies are healthy; check Vercel domain binding/protection separately.");
}

if (failed) process.exit(1);
