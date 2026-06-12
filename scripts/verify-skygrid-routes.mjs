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

let failed = false;

for (const [method, path] of checks) {
  try {
    const res = await fetch(`${base}${path}`, { method });
    const ok =
      (method === "POST" && path === "/api/skygrid/intake" && [200, 202].includes(res.status)) ||
      (method === "GET" && [200, 202, 405].includes(res.status));

    console.log(`${method} ${base}${path} -> ${res.status} ${ok ? "OK" : "FAIL"}`);
    if (!ok) failed = true;
  } catch (error) {
    failed = true;
    console.error(`${method} ${base}${path} -> ERROR ${error.message}`);
  }
}

if (failed) process.exit(1);
