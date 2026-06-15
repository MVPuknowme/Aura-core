export default function handler(req, res) {
  const sponsorHandle = process.env.GITHUB_SPONSORS_HANDLE || 'MVPuknowme';
  const sponsorUrl = process.env.GITHUB_SPONSORS_URL || `https://github.com/sponsors/${sponsorHandle}`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Mode', 'controlled-pilot');

  return res.status(200).json({
    ok: true,
    status: 'online',
    service: 'SKYGRID Emergency Data On-Ramp',
    mode: 'controlled_pilot',
    sentinel: 'fail_closed',
    runtime: 'vercel-api',
    payment_execution: true,
    payment_provider: 'github_sponsors',
    sponsor_url: sponsorUrl,
    checkout_route: '/api/stripe/device-link',
    external_payment_redirect: true,
    device_activation: false,
    production_failover: false,
    private_data_movement: false,
    generated_at: new Date().toISOString()
  });
}
