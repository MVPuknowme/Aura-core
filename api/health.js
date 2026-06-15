export default function handler(_req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Mode', 'controlled-pilot');

  return res.status(200).json({
    ok: true,
    status: 'online',
    service: 'Aura-Core SKYGRID Runtime',
    product: 'SKYGRID Emergency Data On-Ramp',
    mode: 'controlled_pilot',
    operator_mode: 'operator-assist',
    runtime: 'vercel-api',
    sentinel: 'fail_closed',
    operatorAssistOnly: true,
    autonomousControl: false,
    device_activation: false,
    production_failover: false,
    private_data_movement: false,
    routes: {
      home: '/',
      health: '/api/health',
      helm: '/api/skygrid/helm?command=status',
      provenance: '/api/skygrid/provenance',
      aws: '/api/skygrid/aws'
    },
    generated_at: new Date().toISOString()
  });
}
