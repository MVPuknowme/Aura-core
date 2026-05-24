export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Web3 quote preview',
    mode: 'advisory_preflight',
    status: 'preview_only',
    executionAllowed: false,
    timestamp: new Date().toISOString()
  }, null, 2));
}
