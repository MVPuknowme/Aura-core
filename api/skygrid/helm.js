const VERSION = '1.3.11-helm-route-repair';

const SAFE_COMMANDS = new Set(['status']);

export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Mode', 'controlled-pilot');
  res.setHeader('X-Phoenix-Version', VERSION);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      error: 'method_not_allowed',
      allowed_methods: ['GET'],
      service: 'SKYGRID Emergency Data On-Ramp',
      generated_at: new Date().toISOString()
    });
  }

  const command = typeof req.query?.command === 'string' ? req.query.command : 'status';

  if (!SAFE_COMMANDS.has(command)) {
    return res.status(400).json({
      ok: false,
      error: 'unsupported_command',
      supported_commands: Array.from(SAFE_COMMANDS),
      service: 'SKYGRID Emergency Data On-Ramp',
      generated_at: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok: true,
    status: 'online',
    command,
    service: 'SKYGRID Emergency Data On-Ramp',
    network: 'Aura-Core',
    mode: 'controlled_pilot',
    sentinel: 'fail_closed',
    runtime: 'skygrid-api',
    version: VERSION,
    advisory_only: true,
    payment_execution: false,
    device_activation: false,
    production_failover: false,
    private_data_movement: false,
    outbound_transmission: false,
    permission_required: true,
    audit_required: true,
    generated_at: new Date().toISOString()
  });
}
