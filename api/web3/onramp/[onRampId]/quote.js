export default function handler(req, res) {
  const onRampId = req.query?.onRampId || 'preview';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Web3 quote guard',
    mode: 'advisory_preflight',
    onRampId,
    status: 'not_executable',
    quotePrepared: false,
    executionAllowed: false,
    timestamp: new Date().toISOString()
  }, null, 2));
}
