const PRODUCT = 'SKYGRID Veteran Status Wallet Pass';

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

  const passServerUrl = process.env.VETERAN_WALLET_PASS_SERVER_URL;
  if (passServerUrl) {
    res.statusCode = 307;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', passServerUrl);
    res.end();
    return;
  }

  return json(res, 501, {
    ok: false,
    product: PRODUCT,
    status: 'pass_signing_server_not_configured',
    message: 'Configure the standalone signer in wallet/veteran-status/server and set VETERAN_WALLET_PASS_SERVER_URL to redirect this endpoint to the signed .pkpass service.',
    content_type_required_for_wallet: 'application/vnd.apple.pkpass',
    certificate_lane: 'Apple Wallet Pass Type ID certificate only; do not use ALD certificates.',
    sensitive_data_policy: 'No DoD ID, disability rating, claim, DD-214, SSN, medical, benefit, or VA account data in the pass or QR payload.',
  });
}
