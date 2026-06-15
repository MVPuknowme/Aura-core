export default function handler(req, res) {
  const sponsorHandle = process.env.GITHUB_SPONSORS_HANDLE || 'MVPuknowme';
  const sponsorUrl = process.env.GITHUB_SPONSORS_URL || `https://github.com/sponsors/${sponsorHandle}`;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  res.status(200).json({
    ok: true,
    status: 'online',
    service: 'SKYGRID Emergency Data On-Ramp',
    route: '/api/stripe/device-link',
    mode: 'controlled_pilot',
    sentinel: 'fail_closed',
    runtime: 'vercel',
    payment_provider: 'github_sponsors',
    payment_execution: true,
    external_payment_redirect: true,
    sponsor_url: sponsorUrl,
    device_activation: false,
    generated_at: new Date().toISOString()
  });
}
