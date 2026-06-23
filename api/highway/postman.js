export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    system: "SKYGRID Emergency Data On-Ramp",
    route: "vercel-local",
    status: "postman_ready",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/api/health",
      "/api/intake",
      "/api/highway/status",
      "/api/highway/postman"
    ]
  });
}
