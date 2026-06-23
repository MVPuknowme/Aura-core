export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      system: "SKYGRID Emergency Data On-Ramp",
      status: "method_not_allowed",
      allowed: ["POST"]
    });
  }

  const requestId = `skygrid_${Date.now()}`;

  return res.status(202).json({
    ok: true,
    system: "SKYGRID Emergency Data On-Ramp",
    requestId,
    receivedAt: new Date().toISOString(),
    route: "vercel-local",
    status: "accepted"
  });
}
