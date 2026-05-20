const VERSION = '1.3.9-vercel-home';
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
    service: 'Aura-Core SKYGRID Home Runtime',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    runtime_primary: true,
    static_primary: false,
    message: 'SKYGRID runtime home is online.',
    routes: {
      home: '/',
      api_home: '/api/home',
      api_index: '/api',
      health: '/api/health',
      health_alias: '/health.json',
      did: '/api/did',
      helm: '/api/skygrid/helm',
      provenance: '/api/skygrid/provenance',
      ingress: '/api/skygrid/ingress',
      aws: '/api/skygrid/aws',
      warehouse: '/api/skygrid/warehouse',
      mesh: '/api/skygrid/mesh'
    },
    generated_at: new Date().toISOString(),
    guardrails: [
      'Public status route only.',
      'No secrets or private records are accepted or returned.',
      'Operational actions require authenticated operator approval outside this public endpoint.'
    ]
  }, null, 2));
}
