const VERSION = '1.3.7-ai-helm';
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
    powered_by: 'Aura-Core',
    service: 'Aura-Core SKYGRID Runtime',
    version: VERSION,
    did: AURA_DID,
    runtime_primary: true,
    static_primary: false,
    routes: {
      home: '/',
      did: '/api/did',
      health: '/api/health',
      health_alias: '/health.json',
      device_status: '/api/device-status',
      skygrid_aws: '/api/skygrid/aws',
      skygrid_warehouse: '/api/skygrid/warehouse',
      skygrid_mesh: '/api/skygrid/mesh',
      skygrid_ingress: '/api/skygrid/ingress',
      skygrid_helm: '/api/skygrid/helm'
    },
    guardrails: [
      'AI helm is operator-assist only.',
      'No autonomous destructive actions.',
      'No secrets or private data exposed through public status routes.',
      'Failover requires consent, authorization, logging, and role-limited access.'
    ]
  }, null, 2));
}
