export default function handler(req, res) {
  const userAgent = req.headers['user-agent'] || '';
  const mobile = /Mobi|iPhone|Android.*Mobile/i.test(userAgent);
  const tablet = /iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.end(JSON.stringify({
    ok: true,
    status: 'connected',
    service: 'Aura-Core Device Status',
    powered_by: 'Aura-Core',
    generated_at: new Date().toISOString(),
    device_class: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop',
    checks: {
      request_reached_runtime: true,
      runtime_primary: true,
      static_primary: false,
      safe_browser_signals_only: true
    },
    privacy: {
      mac_address_collected: false,
      imei_collected: false,
      serial_number_collected: false,
      precise_location_collected: false,
      wallet_keys_required: false
    }
  }, null, 2));
}
