#!/usr/bin/env node

const scenario = process.argv.find(a => a.startsWith("--scenario="))?.split("=")[1] ?? "primary";

const defaults = {
  primary: { primary: "healthy", aws: "healthy", local: "standby" },
  local: { primary: "degraded", aws: "degraded", local: "healthy" },
  queue: { primary: "offline", aws: "offline", local: "offline" }
}[scenario] ?? { primary: "healthy", aws: "healthy", local: "standby" };

const routes = [
  { id: "primary-cloudflare-onramp", status: defaults.primary, score: 100 },
  { id: "aws-emergency-onramp", status: defaults.aws, score: 95 },
  { id: "local-worker-fallback", status: defaults.local, score: 80 },
  { id: "safe-queue-preserve", status: "preserve", score: 10 }
];

const selectable = routes
  .filter(r => ["healthy", "ready", "online"].includes(r.status))
  .sort((a, b) => b.score - a.score);

const selected = selectable[0] ?? routes.find(r => r.id === "safe-queue-preserve");

const expected = {
  primary: "primary-cloudflare-onramp",
  local: "local-worker-fallback",
  queue: "safe-queue-preserve"
}[scenario];

const ok = selected.id === expected;

console.log(JSON.stringify({
  ok,
  scenario,
  expected,
  selected: selected.id,
  routes
}, null, 2));

if (!ok) process.exit(1);
