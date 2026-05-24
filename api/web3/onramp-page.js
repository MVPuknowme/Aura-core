export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SkyGrid Web3 On-Ramp Preview</title>
  <style>
    body { margin:0; min-height:100vh; font-family:system-ui,-apple-system,Segoe UI,sans-serif; background:#06101f; color:#f7fbff; }
    main { width:min(760px, calc(100% - 32px)); margin:0 auto; padding:48px 0; }
    h1 { font-size:clamp(2rem, 9vw, 4rem); line-height:.95; letter-spacing:-.05em; }
    p { color:#b8c7d9; line-height:1.7; font-size:1.05rem; }
    a { color:#6deaff; font-weight:800; }
    .card { border:1px solid rgba(255,255,255,.15); border-radius:22px; padding:18px; background:rgba(255,255,255,.06); margin-top:18px; }
  </style>
</head>
<body>
  <main>
    <h1>SkyGrid Web3 On-Ramp Preview</h1>
    <p>Advisory preview for Base / USDC on-ramp references. This page does not request private keys, seed phrases, or custodial wallet control.</p>
    <div class="card">
      <p><strong>Status:</strong> preview only / fail closed</p>
      <p><strong>Default chain:</strong> Base mainnet, chain ID 8453</p>
      <p><a href="/api/web3/chains/health">Check chain health JSON</a></p>
      <p><a href="/api/web3/onramp/new">Create preview draft JSON</a></p>
    </div>
  </main>
</body>
</html>`);
}
