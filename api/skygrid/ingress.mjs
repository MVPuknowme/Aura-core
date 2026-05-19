const VERSION = '1.3.6-b12-ingress';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';
const AWS_LINK_COMMIT = '653e1a15619785615b37cf0a44a7fa2bbad800ef';

function envValue(name, fallback = 'unconfigured') {
  return process.env[name] && String(process.env[name]).trim().length > 0 ? process.env[name] : fallback;
}

export default function handler(req, res) {
  const awsRegion = envValue('AWS_REGION', envValue('AWS_DEFAULT_REGION'));
  const ingressMode = envValue('SKYGRID_INGRESS_MODE', 'b12-onboarding');
  const warehouseTable = envValue('SKYGRID_WAREHOUSE_TABLE');
  const meshMode = envValue('AURA_MESH_MODE', 'household-opt-in');
  const l2Network = envValue('AURA_L2_NETWORK');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: 'ingress-ready-for-b12-link',
    service: 'SKYGRID API Ingress',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    aws_link_commit: AWS_LINK_COMMIT,
    generated_at: new Date().toISOString(),
    q_operator: {
      status: 'operator-reported-green-light',
      role: 'assistive-routing-and-deployment-support',
      autonomous_authority: false,
      command_authority: 'MVP'
    },
    ingress: {
      mode: ingressMode,
      b12_link_ready: true,
      public_onboarding_route: '/api/skygrid/ingress',
      aws_status_route: '/api/skygrid/aws',
      warehouse_route: '/api/skygrid/warehouse',
      mesh_route: '/api/skygrid/mesh',
      aws_region: awsRegion,
      warehouse_table_configured: warehouseTable !== 'unconfigured',
      mesh_mode: meshMode,
      l2_network: l2Network
    },
    failover_tiers: [
      {
        tier: 'home-pc',
        purpose: 'opt-in household backup, local continuity, and proof-node readiness',
        participation: 'explicit-opt-in-required'
      },
      {
        tier: 'town',
        purpose: 'community resilience, local outage support, and emergency communications planning',
        participation: 'partner-or-municipal-authorization-required'
      },
      {
        tier: 'city',
        purpose: 'regional continuity coordination, facility support, and disaster-readiness routing',
        participation: 'formal-agreement-required'
      }
    ],
    b12_form_fields: [
      'name',
      'email',
      'phone',
      'city_state',
      'participant_type',
      'node_tier',
      'consent_confirmed',
      'aws_or_local_capacity',
      'continuity_use_case',
      'notes'
    ],
    allowed_participant_types: [
      'home_pc_owner',
      'household_node',
      'community_partner',
      'facility_partner',
      'municipal_or_resilience_contact',
      'sponsor_or_customer'
    ],
    guardrails: [
      'B12 can link to this endpoint for status and onboarding language, not for submitting secrets.',
      'No private keys, seed phrases, AWS credentials, medical records, or raw private speech should be submitted through public forms.',
      'Disaster failover requires opt-in, authorization, logging, and role-limited access.',
      'Home, town, and city participation must be consent-based and documented.',
      'Do not claim guaranteed uptime, guaranteed safety, or finalized contract revenue without signed proof.'
    ],
    next_steps: [
      'Add this endpoint as the B12 technical status link.',
      'Use B12 form fields to collect partner interest only.',
      'Route real submissions to a secure backend or CRM after consent terms are published.',
      'Verify AWS environment variables before marking production live.',
      'Publish pricing and onboarding terms on the B12 site.'
    ]
  }, null, 2));
}
