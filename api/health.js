export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: "skygrid-aura",
    status: "online",
    message: "SkyGrid keeps the path alive. Aura offers the options.",
    privacy: {
      noSpying: true,
      surveillance: false,
      covertCollection: false,
      consentRequired: true,
      telemetry: "health-status-only"
    },
    timestamp: new Date().toISOString()
  });
}
