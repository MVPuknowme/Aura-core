const VERSION = '1.3.10-newman-route-repair';

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aura-Core SKYGRID Runtime</title>
</head>
<body>
  <main>
    <h1>Aura-Core SKYGRID Runtime</h1>
    <p>SKYGRID runtime is online for public reliability checks.</p>
    <ul>
      <li><a href="/api/health">Health API</a></li>
      <li><a href="/api/skygrid/helm?command=status">SKYGRID Helm Status</a></li>
      <li><a href="/api/skygrid/provenance">Provenance Mirror Status</a></li>
    </ul>
  </main>
</body>
</html>`);
}
