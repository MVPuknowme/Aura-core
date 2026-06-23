export default function handler(req, res) {
  return res.status(200).json({
    ok: true,
    system: "SKYGRID Emergency Data On-Ramp",
    route: "vercel-local",
    status: "online",
    timestamp: new Date().toISOString()
  });
}
