export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "skygrid-aura",
    status: "online",
    message: "SkyGrid keeps the path alive. Aura offers the options.",
    timestamp: new Date().toISOString()
  });
}
