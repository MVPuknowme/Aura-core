const VERSION = '1.3.8-recognized-helm';
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
    status: { mode: 'read-only', summary: 'Return SKYGRID route and mirror readiness.' },
    'check-routes': { mode: 'read-only', summary: 'List public API routes to check after deployment.' },
    'b12-onboarding': { mode: 'advisory', summary: 'Return safe B12 onboarding instructions.' },
    'incident-brief': { mode: 'advisory', summary: 'Create a short operator-reviewed incident brief template.' },
    'dry-run-plan': { mode: 'dry-run-only', summary: 'Draft a non-executing operator review plan.' }
  };
  return registry[command] || registry.status;
}

function buildPlan(command) {
  if (command === 'check-routes') {
    return [
      'GET /api/index',
      'GET /api/health',
      'GET /health.json',
      'GET /api/skygrid/aws',
      'GET /api/skygrid/warehouse',
      'GET /api/skygrid/mesh',
      'GET /api/skygrid/ingress',
      'GET /api/skygrid/helm',
      'GET /api/skygrid/code-mirror'
    ];
  }

  if (command === 'b12-onboarding') {
    return [
      'Use /api/skygrid/ingress as the B12 status link.',
      'Use /api/skygrid/helm as the operator-assist status link.',
      'Use /api/skygrid/code-mirror as the AWS mirror status link.',
      'Collect partner interest only, not secrets or private records.'
    ];
  }

  if (command === 'incident-brief') {
    return [
      'State the event type and affected service.',
      'Confirm authorization scope.',
      'List public route status only.',
      'Recommend the next operator-reviewed step.',
      'Log the result as a proof packet.'
    ];
  }

  if (command === 'dry-run-plan') {
    return [
      'Check Vercel route health.',
      'Check AWS link status.',
      'Check AWS code mirror status.',
      'Check warehouse and mesh configuration.',
      'Do not execute infrastructure changes from this endpoint.'
    ];
  }

  return [
    'Report current helm readiness.',
    'Treat this as a recognized operator-assist build surface.',
    'Keep actions read-only unless a separate authenticated admin system is built.'
  ];
}

export default function handler(req, res) {
  const method = req.method || 'GET';
  const queryCommand = req.query?.command;
  const bodyCommand = method === 'POST' ? req.body?.command : undefined;
  const command = normalizeCommand(bodyCommand || queryCommand || 'status');
  const action = allowedAction(command);
  const awsRegion = envValue('AWS_REGION', envValue('AWS_DEFAULT_REGION'));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: 'helm-online',
    service: 'SKYGRID Helm Status',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    generated_at: new Date().toISOString(),
    command,
    action,
    recognized_assistive_build: {
      operator: 'MVP',
      assistant_layer: 'ChatGPT-assisted planning and code review',
      embedded_autonomous_ai: false,
      vercel_role: 'public API surface and route health',
      aws_role: 'code mirror, logs, warehouse state, and proof packets'
    },
    helm: {
      authority: 'operator-assist-only',
      commander: 'MVP',
      autonomous_execution: false,
      default_mode: 'read-only-and-dry-run',
      destructive_actions_enabled: false,
      secrets_exposed: false
    },
    readiness: {
      vercel: 'api-route-ready',
      aws_region: awsRegion,
      aws_link_route: '/api/skygrid/aws',
      ingress_route: '/api/skygrid/ingress',
      warehouse_route: '/api/skygrid/warehouse',
      mesh_route: '/api/skygrid/mesh',
      helm_route: '/api/skygrid/helm',
      code_mirror_route: '/api/skygrid/code-mirror',
      warehouse_table_configured: envValue('SKYGRID_WAREHOUSE_TABLE') !== 'unconfigured',
      proof_bucket_configured: envValue('SKYGRID_PROOF_BUCKET') !== 'unconfigured',
      code_mirror_bucket_configured: envValue('SKYGRID_CODE_MIRROR_BUCKET') !== 'unconfigured',
      l2_network: envValue('AURA_L2_NETWORK'),
      l2_rpc_configured: envFlag('AURA_L2_RPC_URL')
    },
    plan: buildPlan(command),
    allowed_commands: ['status', 'check-routes', 'b12-onboarding', 'incident-brief', 'dry-run-plan'],
    guardrails: [
      'Helm is operator-assist only and does not autonomously control infrastructure.',
      'No destructive action runs from this endpoint.',
      'No secrets, keys, credentials, medical records, or private records are accepted or returned.',
      'Operational changes require a separate authenticated admin system and human approval.'
    ]
  }, null, 2));
}
