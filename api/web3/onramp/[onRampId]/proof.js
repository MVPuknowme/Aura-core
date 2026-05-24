export default function handler(req, res) {
  const onRampId = req.query?.onRampId || 'preview';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Web3 proof preview',
    mode: 'advisory_preflight',
    onRampId,
    status: 'proof_preview_ready',
    proofWritten: false,
    executionAllowed: false,
    timestamp: new Date().toISOString()
  }, null, 2));
}
