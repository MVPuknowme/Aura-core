function resolveMessengerUrl(env = process.env) {
  const explicitUrl = String(env.FACEBOOK_MESSENGER_URL || '').trim();
  if (explicitUrl) return explicitUrl;

  const username = String(env.FACEBOOK_MESSENGER_USERNAME || '')
    .trim()
    .replace(/^@+/, '');

  if (!username) return null;
  return `https://m.me/${encodeURIComponent(username)}`;
}

export default function handler(req, res) {
  const messengerUrl = resolveMessengerUrl();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Mode', 'controlled-pilot');

  if (!messengerUrl) {
    return res.status(503).json({
      ok: false,
      error: 'messenger_route_unconfigured',
      service: 'SKYGRID Emergency Data On-Ramp',
      route: '/api/payments/messenger',
      mode: 'controlled_pilot',
      sentinel: 'fail_closed',
      purpose: 'payment_contact',
      payment_execution: false,
      generated_at: new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok: true,
    status: 'online',
    service: 'SKYGRID Emergency Data On-Ramp',
    route: '/api/payments/messenger',
    mode: 'controlled_pilot',
    sentinel: 'fail_closed',
    contact_provider: 'facebook_messenger',
    purpose: 'payment_contact',
    messenger_url: messengerUrl,
    payment_execution: false,
    generated_at: new Date().toISOString()
  });
}
