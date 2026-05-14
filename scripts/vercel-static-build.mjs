import { existsSync, mkdirSync, copyFileSync, writeFileSync, cpSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const syntaxCheckFiles = [
  'app.js',
  'scripts/validator-health-check.mjs'
];

let checked = 0;

for (const file of syntaxCheckFiles) {
  if (existsSync(file)) {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    checked += 1;
  } else {
    console.log(`Skipping missing build check: ${file}`);
  }
}

mkdirSync('public', { recursive: true });

if (existsSync('index.html')) {
  copyFileSync('index.html', 'public/index.html');
} else {
  writeFileSync(
    'public/index.html',
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SkyGrid</title>
</head>
<body>
  <h1>SkyGrid deploy ready</h1>
  <p>Aura-Core static output generated.</p>
</body>
</html>
`
  );
}

if (existsSync('api')) {
  cpSync('api', 'public/api', { recursive: true });
}

console.log(`SkyGrid Vercel build ready; checked files: ${checked}`);
console.log('Vercel output directory ready: public');
