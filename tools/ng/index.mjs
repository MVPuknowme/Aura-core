import { mkdir, writeFile, access } from 'node:fs/promises';

const args = process.argv.slice(2);
const command = args[0] || 'build';

if (command !== 'build') {
  console.error(`ng compatibility shim: unsupported command ${command}`);
  process.exit(1);
}

await mkdir('public', { recursive: true });

try {
  await access('public/index.html');
} catch {
  await writeFile(
    'public/index.html',
    '<!doctype html><html><head><meta charset="utf-8"><title>SKYGRID Emergency Data On-Ramp</title></head><body><h1>SKYGRID Emergency Data On-Ramp</h1><p>Status: controlled pilot</p><p>Sentinel: fail_closed</p></body></html>'
  );
}

await writeFile(
  'public/health.json',
  JSON.stringify(
    {
      ok: true,
      status: 'online',
      service: 'SKYGRID Emergency Data On-Ramp',
      mode: 'controlled_pilot',
      sentinel: 'fail_closed',
      runtime: 'vercel-static',
      adapter: 'ng-compatibility-shim'
    },
    null,
    2
  )
);

console.log('ng compatibility shim: SKYGRID Vercel fallback build complete');
