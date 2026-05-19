const VERSION = '1.3.5-warehouse-mesh';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

function configured(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
}

export default function handler(req, res) {
  const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'unconfigured';
  const warehouseTable = process.env.SKYGRID_WAREHOUSE_TABLE || 'unconfigured';
  const proofBucket = process.env.SKYGRID_PROOF_BUCKET || 'unconfigured';

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: configured('SKYGRID_WAREHOUSE_TABLE') ? 'warehouse-configured' : 'warehouse-pending-env',
    service: 'SKYGRID Warehouse',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    generated_at: new Date().toISOString(),
    q_operator: {
      enabled_as_assistive_layer: true,
      autonomous_authority: false,
      command_authority: 'MVP'
    },
    aws: {
      region: awsRegion,
      warehouse_table: warehouseTable,
      proof_bucket: proofBucket,
      secret_values_exposed: false
    },
    commercial_posture: {
      aws_failover_claim: 'operator-reported-pending-verification',
      contract_value_usd: 'operator-reported-5400000-pending-verification',
      onboarding_source: 'B12 website',
      billing_status: 'rates-defined-by-operator-pending-contract-documentation'
    },
    schema: {
      node_id: 'string',
      household_id: 'string',
      region: 'string',
      status: 'pending|active|paused|retired',
      consent_confirmed: 'boolean',
      mesh_role: 'observer|relay|validator|proof-node',
      l2_network: 'base|scroll|optimism|polygon|other',
      wallet_or_did_ref: 'public-reference-only',
      aws_region: 'string',
      last_health_check: 'iso8601|null',
      proof_packet_status: 'none|pending|signed|published',
      notes: 'string'
    },
    guardrails: [
      'No AWS secrets are returned by this endpoint.',
      'Q is an operator assistant, not autonomous authority.',
      'Household participation must be opt-in.',
      'Emergency data access must be lawful, consent-based, logged, and role-limited.',
      'Medical or facility data must follow applicable privacy and security obligations.',
      'Do not store private keys, seed phrases, MAC addresses, IMEI values, or raw private speech logs.'
    ]
  }, null, 2));
}
