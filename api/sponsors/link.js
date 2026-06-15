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
    route: '/api/sponsors/link',
    mode: 'controlled_pilot',
    sentinel: 'fail_closed',
    support_provider: 'github_sponsors',
    sponsor_url: sponsorUrl,
    generated_at: new Date().toISOString()
  });
}
