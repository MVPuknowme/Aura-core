const DEFAULTS = {
  b12SiteUrl: 'https://aura-sky-skygrid-protocol-staging.b12sites.com',
  vercelRuntimeUrl: 'https://aura-core.vercel.app',
  web3GatewayUrl: 'https://aura-core.vercel.app/api/intake',
  awsServiceUrl: 'https://aura-core.vercel.app',
};

function cleanUrl(value, fallback) {
  const raw = String(value || fallback || '').trim().replace(/\/+$/, '');
  return /^https?:\/\//.test(raw) ? raw : fallback;
}

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, status: 'method_not_allowed', expectedMethod: 'GET' }, null, 2));
    return;
  }

  const vercelRuntimeUrl = cleanUrl(process.env.NEXT_PUBLIC_SKYGRID_RUNTIME_URL, DEFAULTS.vercelRuntimeUrl);
  const b12SiteUrl = cleanUrl(process.env.NEXT_PUBLIC_SKYGRID_B12_SITE_URL, DEFAULTS.b12SiteUrl);
  const awsServiceUrl = cleanUrl(process.env.NEXT_PUBLIC_SKYGRID_AWS_SERVICE_URL, DEFAULTS.awsServiceUrl);
  const web3GatewayUrl = cleanUrl(process.env.NEXT_PUBLIC_SKYGRID_WEB3_GATEWAY_URL, `${vercelRuntimeUrl}/api/intake`);

  const payload = {
    ok: true,
    service: 'Patrick/Newman Postman Kafka Bridge TM',
    status: 'cross_link_ready',
    mode: 'temporary_emergency_notice_interoperability',
    generatedAt: new Date().toISOString(),
    layers: {
      publicSite: {
        name: 'SkyGrid B12 Public Site',
        role: 'public_information_onboarding_and_partner_intake_surface',
        url: b12SiteUrl,
      },
      vercelRuntime: {
        name: 'Aura-Core Vercel Runtime',
        role: 'operational_api_ingress_health_and_bridge_acknowledgement_layer',
        url: vercelRuntimeUrl,
        health: `${vercelRuntimeUrl}/api/health`,
        intake: `${vercelRuntimeUrl}/api/intake`,
        status: `${vercelRuntimeUrl}/api/status`,
      },
      web3Reference: {
        name: 'Web3 Gateway Reference',
        role: 'optional_reference_ingress_for_bridge_validation_only',
        url: web3GatewayUrl,
      },
      awsEmergencyRamp: {
        name: 'SKYGRID AWS Emergency Ramp',
        role: 'reserve_validation_and_emergency_continuity_target',
        url: awsServiceUrl,
        status: `${awsServiceUrl}/api/skygrid/aws`,
      },
      verification: {
        name: 'Patrick/Newman Postman Kafka Bridge TM',
        role: 'postman_newman_delivery_state_verification_and_kafka_capable_event_bridge',
        collection: 'postman/skygrid-reliability.collection.json',
      },
    },
    publicButtons: [
      { label: 'SkyGrid Public Site', href: b12SiteUrl },
      { label: 'System Health', href: `${vercelRuntimeUrl}/api/health` },
      { label: 'Submit Intake', href: `${vercelRuntimeUrl}/api/intake` },
      { label: 'AWS Ramp Status', href: `${awsServiceUrl}/api/skygrid/aws` },
    ],
    guardrails: [
      'Verification and intake acknowledgement only',
      'No autonomous emergency dispatch authority',
      'No wallet or fund movement',
      'No device entitlement activation',
      'Operator review required for production routing changes',
    ],
  };

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Bridge', 'Patrick-Newman-Postman-Kafka');
  res.end(JSON.stringify(payload, null, 2));
}
