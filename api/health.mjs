const VERSION = '1.3.2-aura-did';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);
  res.end(JSON.stringify({
    ok: true,
    status: 'online',
    service: 'Aura-Core SKYGRID Runtime',
    version: VERSION,
    did: AURA_DID,
    powered_by: 'Aura-Core',
    static_primary: false,
    runtime_primary: true,
    generated_at: new Date().toISOString(),
    routes: {
      home: '/',
      api_index: '/api',
      did: '/api/did',
      health: '/api/health',
      health_alias: '/health.json',
      device_status: '/api/device-status'
    },
    guardrails: [
      'No guaranteed revenue claims',
      'No invasive device fingerprinting',
      'No private wallet keys or credentials required',
      'Runtime health is verified by this API response',
      'Empty did:aura: values are invalid and must be rejected before gateway fetches'
    ]
  }, null, 2));
}
