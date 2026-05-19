const VERSION = '1.3.4-aws-link';
const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';

function envFlag(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
}

export default function handler(req, res) {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'unconfigured';
  const linked = envFlag('AWS_REGION') || envFlag('AWS_DEFAULT_REGION');

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: true,
    status: linked ? 'aws-link-ready' : 'aws-link-pending-env',
    service: 'SKYGRID AWS Link',
    version: VERSION,
    powered_by: 'Aura-Core',
    did: AURA_DID,
    runtime_primary: true,
    static_primary: false,
    generated_at: new Date().toISOString(),
    aws: {
      region,
      credentials_present: envFlag('AWS_ACCESS_KEY_ID') || envFlag('AWS_WEB_IDENTITY_TOKEN_FILE') || envFlag('AWS_ROLE_ARN'),
      role_present: envFlag('AWS_ROLE_ARN'),
      access_key_present: envFlag('AWS_ACCESS_KEY_ID'),
      secret_key_reported: false,
      secret_values_exposed: false
    },
    recommended_services: [
      'CloudWatch for logs and alarms',
      'Lambda for lightweight safety webhooks',
      'DynamoDB for consent/session state',
      'S3 for signed proof packets and public docs',
      'SNS or Pinpoint for opted-in notifications',
      'EventBridge for check-in timers and escalation workflows',
      'Cognito or IAM Identity Center for authenticated operators'
    ],
    guardrails: [
      'Do not commit AWS access keys or secret keys.',
      'Prefer OIDC or IAM roles over long-lived access keys.',
      'Use least-privilege IAM policies.',
      'Keep emergency, safety, and notification flows consent-based.',
      'Do not expose private user data in logs or public endpoints.'
    ],
    next_steps: [
      'Set AWS_REGION in the deployment environment.',
      'Choose AWS auth mode: OIDC/IAM role preferred, access keys only if unavoidable.',
      'Create CloudWatch log group for SKYGRID runtime events.',
      'Create DynamoDB table for safety sessions when ready.',
      'Add notification provider only after consent and abuse-prevention controls are defined.'
    ]
  }, null, 2));
}
