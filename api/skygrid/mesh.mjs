const VERSION = '1.3.5-warehouse-mesh';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

function value(name, fallback = 'unconfigured') {
  return process.env[name] && String(process.env[name]).trim().length > 0 ? process.env[name] : fallback;
}

export default function handler(req, res) {
  const l2Network = value('AURA_L2_NETWORK');
  const meshMode = value('AURA_MESH_MODE', 'household-opt-in');
  const rpcConfigured = value('AURA_L2_RPC_URL') !== 'unconfigured';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: rpcConfigured ? 'l2-mesh-ready' : 'l2-mesh-pending-env',
    service: 'Aura L2 Web3 Household Mesh',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    generated_at: new Date().toISOString(),
    mesh: {
      mode: meshMode,
      household_participation: 'opt-in-required',
      l2_network: l2Network,
      rpc_configured: rpcConfigured,
      rpc_url_exposed: false,
      private_key_custody: false,
      direct_bridge_count_target: 3,
      bridge_purpose: 'resilience, proof routing, and authorized backup coordination'
    },
    continuity_use_cases: [
      'authorized backup status',
      'facility resilience planning',
      'outage or overheating response planning',
      'role-limited proof packet routing',
      'authorized continuity support for participating facilities'
    ],
    guardrails: [
      'No household routing without explicit technical and written opt-in.',
      'No private keys or seed phrases are accepted by this endpoint.',
      'No private facility or personal records are exposed through public routes.',
      'Continuity access must be lawful, consent-based, logged, and role-limited.',
      'Layer-2 Web3 status does not imply automatic income or guaranteed contracts.'
    ]
  }, null, 2));
}
