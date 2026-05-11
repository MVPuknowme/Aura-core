export default function handler(request, response) {
  response.status(200).json({
    ok: true,
    service: 'SkyGrid / Aura-Core',
    mode: 'advisory-simulation',
    phoenix: '1.2.0',
    branch: 'skygrid-site-launch',
    timestamp: new Date().toISOString()
  });
}
