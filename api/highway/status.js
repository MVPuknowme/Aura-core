export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    status: "online",
    service: "SKYGRID Emergency Data On-Ramp",
    route: "/api/highway/status",
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    runtime: "vercel",
    highway: "advisory",
    routing: "pilot_only",
    production_failover: false,
    generated_at: new Date().toISOString()
  });
}
