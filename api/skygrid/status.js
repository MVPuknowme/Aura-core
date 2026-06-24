export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "method_not_allowed",
      allowed: ["GET"]
    });
  }

  return res.status(200).json({
    ok: true,
    system: "SKYGRID Emergency Data On-Ramp",
    route: "/api/skygrid/status",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
}
