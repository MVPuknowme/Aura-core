const VERSION = '1.3.8-provenance-mirror';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

function envValue(name, fallback = 'unconfigured') {
  return process.env[name] && String(process.env[name]).trim().length > 0 ? process.env[name] : fallback;
}

function envFlag(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
}

export default function handler(req, res) {
  const awsRegion = envValue('AWS_REGION', envValue('AWS_DEFAULT_REGION'));
  const mirrorStore = envValue('SKYGRID_PROVENANCE_STORE');
  const mirrorPrefix = envValue('SKYGRID_PROVENANCE_PREFIX', 'aura-core/skygrid');
  const commitSha = envValue('VERCEL_GIT_COMMIT_SHA', envValue('SKYGRID_SOURCE_COMMIT'));

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: mirrorStore !== 'unconfigured' ? 'provenance-mirror-configured' : 'provenance-mirror-pending-env',
    service: 'SKYGRID Provenance Mirror Status',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    generated_at: new Date().toISOString(),
    source: {
      repo: 'MVPuknowme/Aura-core',
      branch: envValue('VERCEL_GIT_COMMIT_REF', 'MVPuknowme'),
      commit_sha: commitSha,
      public_runtime: 'Vercel',
      mirror_posture: 'AWS record and proof storage'
    },
    aws_record: {
      region: awsRegion,
      store_configured: mirrorStore !== 'unconfigured',
      store_name_exposed: false,
      prefix: mirrorPrefix,
      role_present: envFlag('AWS_ROLE_ARN'),
      access_key_present: envFlag('AWS_ACCESS_KEY_ID'),
      secret_values_exposed: false
    },
    recognized_assistive_build: {
      operator: 'MVP',
      assistant_layer: 'ChatGPT-assisted planning and code review',
      embedded_autonomous_ai: false,
      vercel_role: 'public API status surface',
      aws_role: 'provenance records, proof packets, and deployment audit posture'
    },
    guardrails: [
      'This endpoint is read-only status only.',
      'No commands are executed from this route.',
      'No credentials, private keys, seed phrases, or private records are accepted or returned.',
      'Use authenticated deployment tooling for any artifact publication outside this endpoint.'
    ],
    next_steps: [
      'Set SKYGRID_PROVENANCE_STORE in the deployment environment.',
      'Set SKYGRID_PROVENANCE_PREFIX if a custom record path is desired.',
      'Keep proof packets separate from public status endpoints.',
      'Use the /api/skygrid/helm route for operator-assist status only.'
    ]
  }, null, 2));
}
