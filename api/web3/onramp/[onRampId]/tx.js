export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Web3 transaction preview guard',
    mode: 'advisory_preflight',
    status: 'not_executable',
    executionAllowed: false,
    timestamp: new Date().toISOString()
  }, null, 2));
}
