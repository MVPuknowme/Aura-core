export default function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Mode', 'controlled-pilot');

  return res.status(200).json({
    ok: true,
    service: 'SKYGRID AWS Mirror',
    status: 'optional',
    enabled: false,
    connected: false,
    externalMirrorConfigured: false,
    operatorAssistOnly: true,
    autonomousControl: false,
    generated_at: new Date().toISOString()
  });
}
