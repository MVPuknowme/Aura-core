#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const requiredFiles = [
  'package.json',
  'vercel.json',
  'scripts/build-interference-preflight.mjs',
  'aws/lambda/skygrid_preflight_init.py'
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

const failures = [];
const warnings = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`missing required file: ${file}`);
}

const pkg = readJson('package.json');
const vercel = readJson('vercel.json');

if (pkg.packageManager !== 'pnpm@11.1.3') {
  failures.push(`packageManager must be pnpm@11.1.3, found ${pkg.packageManager || 'unset'}`);
}

if (!pkg.engines?.node || pkg.engines.node !== '>=24 <25') {
  failures.push(`engines.node must be >=24 <25, found ${pkg.engines?.node || 'unset'}`);
}

const installCommand = vercel.installCommand || '';
for (const expected of [
  'rm -rf node_modules',
  'corepack prepare pnpm@11.1.3 --activate',
  'pnpm config set registry https://registry.npmjs.org/',
  'pnpm run preflight:interference',
  'pnpm install --frozen-lockfile=false'
]) {
  if (!installCommand.includes(expected)) failures.push(`vercel installCommand missing: ${expected}`);
}

let nodeVersion = process.version;
if (!nodeVersion.startsWith('v24.')) {
  warnings.push(`local node is ${nodeVersion}; Vercel/Aura build lane expects v24.x`);
}

let pnpmVersion = 'unavailable';
try {
  pnpmVersion = run('pnpm', ['--version']);
} catch {
  warnings.push('pnpm is not available locally; Vercel will use Corepack during deploy');
}

console.log('SKYGRID / Aura-Core AI Build Run Config');
console.log('Mode: dry-run / proof-first');
console.log(`Node: ${nodeVersion}`);
console.log(`pnpm: ${pnpmVersion}`);
console.log(`Package manager: ${pkg.packageManager}`);
console.log(`Engine: ${pkg.engines?.node}`);
console.log('Protected install: enabled');
console.log('Interference preflight: enabled');
console.log('AWS preflight init lambda: configured');
console.log('Wallet / financial / infrastructure execution: blocked unless explicit approval gate is added');

for (const warning of warnings) console.warn(`::warning title=SkyGrid run.config::${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`::error title=SkyGrid run.config::${failure}`);
  process.exit(1);
}

console.log('SKYGRID RUN.CONFIG VALID');
