export default function handler(req, res) {
  const paymentsEnabled = process.env.SKYGRID_PAYMENTS_ENABLED === 'true';

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
    payment_execution: paymentsEnabled,
    payment_provider: 'stripe',
    checkout_route: '/api/stripe/device-link',
    device_activation: false,
    production_failover: false,
    private_data_movement: false,
    generated_at: new Date().toISOString()
  });
}
