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

  const token = String(req.query?.token || '').trim();
  if (!token) {
    return json(res, 400, { ok: false, error: 'missing_token' });
  }

  return json(res, 200, {
    valid: true,
    status: 'verified_veteran',
    issuer: 'SKYGRID / Aura pilot',
    token_reference: token.slice(0, 12),
    sensitive_profile_fields_returned: false,
    note: 'Pilot stub only. Production must validate token server-side and support revocation.',
    timestamp: new Date().toISOString(),
  });
}
