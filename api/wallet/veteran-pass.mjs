const PRODUCT = 'Veteran Status Wallet Service';
const SERVICE_BOUNDARY = 'Standalone Wallet status-pass service; not part of the SKYGRID network console.';
const SENSITIVE_DATA_POLICY = {
  mode: 'minimal_status_only',
  prohibited: [
    'government identifiers',
    'SSN',
    'date of birth',
    'DD-214 content',
    'medical data',
    'benefit data',
    'claim data',
    'account credentials',
    'raw document images',
    'biometric material'
  ]
};

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload, null, 2));
}

function getConfiguredIssuerUrl() {
  const raw = process.env.VETERAN_WALLET_PASS_SERVER_URL;
  if (!raw) return { configured: false };

  let url;
  try {
    url = new URL(raw);
  } catch {
    return { configured: true, error: 'issuer_url_invalid' };
  }

  if (url.protocol !== 'https:') {
    return { configured: true, error: 'issuer_url_requires_https' };
  }

  if (/(^|\.)skygrid-protocol\.net$/i.test(url.hostname) || /skygrid/i.test(url.hostname)) {
    return { configured: true, error: 'issuer_url_must_be_separate_from_skygrid' };
  }

  return { configured: true, url };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  const issuer = getConfiguredIssuerUrl();

  if (issuer.url) {
    res.statusCode = 307;
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Location', issuer.url.toString());
    res.setHeader('X-Wallet-Service-Boundary', 'standalone');
    res.end();
    return;
  }

  if (issuer.configured && issuer.error) {
    return json(res, 503, {
      ok: false,
      product: PRODUCT,
      service_boundary: SERVICE_BOUNDARY,
      status: 'pass_signing_server_misconfigured',
      error: issuer.error,
      message: 'VETERAN_WALLET_PASS_SERVER_URL must be a valid HTTPS URL on a standalone non-SKYGRID issuer host.',
      sensitive_data_policy: SENSITIVE_DATA_POLICY
    });
  }

  return json(res, 501, {
    ok: false,
    product: PRODUCT,
    service_boundary: SERVICE_BOUNDARY,
    status: 'pass_signing_server_not_configured',
    message: 'Configure the standalone signer in wallet/veteran-status/server and set VETERAN_WALLET_PASS_SERVER_URL to its dedicated HTTPS issuer URL.',
    content_type_required_for_wallet: 'application/vnd.apple.pkpass',
    certificate_lane: 'Apple Wallet Pass Type ID certificate only; do not use ALD certificates.',
    sensitive_data_policy: SENSITIVE_DATA_POLICY
  });
}
