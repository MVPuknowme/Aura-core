export default function handler(req, res) {
  const onRampId = req.query?.onRampId || 'preview';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SkyGrid On-Ramp ${onRampId}</title>
  <style>body{margin:0;font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#06101f;color:#f7fbff}main{width:min(760px,calc(100% - 32px));margin:0 auto;padding:48px 0}a{color:#6deaff;font-weight:800}.card{border:1px solid rgba(255,255,255,.15);border-radius:22px;padding:18px;background:rgba(255,255,255,.06);margin-top:18px}</style>
</head>
<body>
  <main>
    <h1>SkyGrid On-Ramp ${onRampId}</h1>
    <p>This is an advisory preview page only. No transaction is created and no wallet custody is requested.</p>
    <div class="card">
      <p><a href="/api/web3/onramp/${onRampId}">Details JSON</a></p>
      <p><a href="/api/web3/onramp/${onRampId}/quote">Quote guard JSON</a></p>
      <p><a href="/api/web3/onramp/${onRampId}/tx">Transaction guard JSON</a></p>
      <p><a href="/api/web3/onramp/${onRampId}/proof">Proof preview JSON</a></p>
    </div>
  </main>
</body>
</html>`);
}
