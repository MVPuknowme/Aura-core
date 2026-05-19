const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.end(JSON.stringify({
    ok: true,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    runtime_primary: true,
    static_primary: false,
    routes: {
      did: '/api/did',
      health: '/api/health',
      health_alias: '/health.json',
      device_status: '/api/device-status'
    }
  }, null, 2));
}
