const base = process.env.SKYGRID_BASE_URL || "https://skygrid-protocol.net";

const checks = [
  ["GET", "/"],
  ["GET", "/status"],
  ["GET", "/api/health"],
  ["POST", "/api/intake"],
  ["GET", "/api/route"],
  ["GET", "/api/aura-core"],
  ["GET", "/api/allbridge"],
  ["GET", "/dispatch"],
  ["GET", "/partners"],
  ["GET", "/investors"],
  ["GET", "/contact"]
];

let failed = false;

for (const [method, path] of checks) {
  const res = await fetch(`${base}${path}`, { method });
  const ok =
    (method === "POST" && path === "/api/intake" && res.status === 202) ||
    (method === "GET" && res.status === 200);

  console.log(`${method} ${path} -> ${res.status} ${ok ? "OK" : "FAIL"}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
