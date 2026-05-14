import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const publicDir = 'public';
mkdirSync(publicDir, { recursive: true });

if (existsSync('index.html')) {
  copyFileSync('index.html', `${publicDir}/index.html`);
} else {
  writeFileSync(`${publicDir}/index.html`, `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkyGrid + Aura-Core</title>
</head>
<body>
  <main>
    <h1>SkyGrid + Aura-Core</h1>
    <p>Static deployment is online.</p>
    <p><a href="/node-ledger.html">Open Node Ledger</a></p>
  </main>
</body>
</html>`);
}

try {
  execFileSync('node', ['scripts/build-node-ledger.mjs'], { stdio: 'inherit' });
} catch (error) {
  console.warn('Node ledger build skipped or failed:', error.message);
}

writeFileSync(`${publicDir}/health.json`, JSON.stringify({
  ok: true,
  service: 'aura-core',
  network: 'skygrid',
  generated_at: new Date().toISOString()
}, null, 2));

console.log('Vercel static output ready in public/');
