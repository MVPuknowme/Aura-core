const PRODUCT = 'Veteran Status Wallet Service';

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload, null, 2));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  return json(res, 501, {
    ok: false,
    product: PRODUCT,
    service_boundary: 'Standalone Wallet status-pass service; not part of the SKYGRID network console.',
    status: 'pass_signing_server_not_configured',
    message: 'Configure the standalone signer in wallet/veteran-status/server and expose it through a dedicated Wallet issuer URL.',
    content_type_required_for_wallet: 'application/vnd.apple.pkpass',
    certificate_lane: 'Apple Wallet Pass Type ID certificate only; do not use ALD certificates.'
  });
}
