const VERSION = '1.3.7-ai-helm';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

function envValue(name, fallback = 'unconfigured') {
  return process.env[name] && String(process.env[name]).trim().length > 0 ? process.env[name] : fallback;
}

function envFlag(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
}

function normalizeCommand(input) {
  return String(input || 'status').trim().toLowerCase().replace(/[^a-z0-9:_-]+/g, '-').slice(0, 80) || 'status';
}

function allowedAction(command) {
  const registry = {
    status: {
      mode: 'read-only',
      summary: 'Return SKYGRID runtime, AWS, ingress, warehouse, and mesh readiness.'
    },
    'check-routes': {
      mode: 'read-only',
      summary: 'List public API routes that should be checked after Vercel deployment.'
    },
    'draft-failover-plan': {
      mode: 'advisory',
      summary: 'Draft an operator-reviewed failover sequence for home, town, or city continuity.'
    },
    'b12-onboarding': {
      mode: 'advisory',
      summary: 'Return B12 form fields and safe onboarding instructions.'
    },
    'incident-brief': {
      mode: 'advisory',
      summary: 'Create a short operator incident brief template without exposing private data.'
    },
    'dry-run-failover': {
      mode: 'dry-run-only',
      summary: 'Simulate failover decisions. Does not execute infrastructure changes.'
    }
  };

  return registry[command] || registry.status;
}

function buildPlan(command, tier) {
  const safeTier = ['home-pc', 'town', 'city'].includes(tier) ? tier : 'home-pc';

  if (command === 'check-routes') {
    return [
      'GET /api/index',
      'GET /api/health',
      'GET /health.json',
      'GET /api/skygrid/aws',
      'GET /api/skygrid/warehouse',
      'GET /api/skygrid/mesh',
      'GET /api/skygrid/ingress',
      'GET /api/skygrid/helm'
    ];
  }

  if (command === 'b12-onboarding') {
    return [
      'Use /api/skygrid/ingress as the B12 technical status link.',
      'Collect partner interest only: name, email, city/state, node tier, consent, capacity, and continuity use case.',
      'Do not collect secrets, private keys, AWS credentials, medical records, or passwords through public forms.',
      'Route signed customers to a secure backend or CRM after terms are published.'
    ];
  }

  if (command === 'incident-brief') {
    return [
      'State the event type and affected region.',
      'Confirm whether participation is opt-in and authorized.',
      'List affected routes without exposing private records.',
      'Recommend next operator-reviewed step.',
      'Log all actions and preserve a proof packet.'
    ];
  }

  if (command === 'draft-failover-plan' || command === 'dry-run-failover') {
    return [
      `Tier selected: ${safeTier}.`,
      'Confirm operator authorization and consent scope.',
      'Check Vercel API health and AWS link status.',
      'Check warehouse table and proof bucket configuration.',
      'Check mesh mode and L2 RPC readiness.',
      'Prefer local safe-mode continuity before cloud escalation.',
      'Escalate to town or city partners only with formal authorization.',
      'Record result as a proof packet. No autonomous execution.'
    ];
  }

  return [
    'Report current helm readiness.',
    'Keep control read-only unless explicitly upgraded with authenticated operator approval.',
    'Use dry-run plans for failover decisions before any real infrastructure change.'
  ];
}

export default function handler(req, res) {
  const method = req.method || 'GET';
  const queryCommand = req.query?.command;
  const bodyCommand = method === 'POST' ? req.body?.command : undefined;
  const command = normalizeCommand(bodyCommand || queryCommand || 'status');
  const tier = String(req.query?.tier || req.body?.tier || 'home-pc').trim().toLowerCase();
  const action = allowedAction(command);
  const awsRegion = envValue('AWS_REGION', envValue('AWS_DEFAULT_REGION'));
  const aiProviderConfigured = envFlag('OPENAI_API_KEY') || envFlag('AI_PROVIDER_API_KEY') || envFlag('ANTHROPIC_API_KEY');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: 'helm-online',
    service: 'SKYGRID AI Helm Control',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    generated_at: new Date().toISOString(),
    command,
    action,
    helm: {
      authority: 'operator-assist-only',
      commander: 'MVP',
      autonomous_execution: false,
      default_mode: 'read-only-and-dry-run',
      destructive_actions_enabled: false,
      secrets_exposed: false,
      ai_provider_configured: aiProviderConfigured
    },
    readiness: {
      vercel: 'api-route-ready',
      aws_region: awsRegion,
      aws_link_route: '/api/skygrid/aws',
      ingress_route: '/api/skygrid/ingress',
      warehouse_route: '/api/skygrid/warehouse',
      mesh_route: '/api/skygrid/mesh',
      helm_route: '/api/skygrid/helm',
      warehouse_table_configured: envValue('SKYGRID_WAREHOUSE_TABLE') !== 'unconfigured',
      proof_bucket_configured: envValue('SKYGRID_PROOF_BUCKET') !== 'unconfigured',
      l2_network: envValue('AURA_L2_NETWORK'),
      l2_rpc_configured: envFlag('AURA_L2_RPC_URL')
    },
    plan: buildPlan(command, tier),
    allowed_commands: [
      'status',
      'check-routes',
      'draft-failover-plan',
      'dry-run-failover',
      'b12-onboarding',
      'incident-brief'
    ],
    guardrails: [
      'AI Helm is operator-assist only and does not autonomously control infrastructure.',
      'No destructive action runs from this endpoint.',
      'No secrets, private keys, seed phrases, AWS credentials, medical records, or raw private speech are accepted or returned.',
      'Failover and continuity actions require consent, authorization, logging, and role-limited access.',
      'Emergency use must supplement, not replace, official emergency services or licensed professional systems.'
    ]
  }, null, 2));
}
