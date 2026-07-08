import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '..');

const required = [
  'PASS_TYPE_IDENTIFIER',
  'TEAM_IDENTIFIER',
  'ORGANIZATION_NAME',
  'PASS_CERT_PATH',
  'PASS_KEY_PATH',
  'WWDR_CERT_PATH',
  'PUBLIC_BASE_URL',
];

const failures = [];
const warnings = [];

function env(name) {
  return process.env[name]?.trim() || '';
}

function resolveFromServerRoot(value) {
  return path.isAbsolute(value) ? value : path.resolve(serverRoot, value);
}

for (const name of required) {
  if (!env(name)) failures.push(`Missing required env: ${name}`);
}

if (env('PASS_TYPE_IDENTIFIER') && !env('PASS_TYPE_IDENTIFIER').startsWith('pass.')) {
  failures.push('PASS_TYPE_IDENTIFIER should be an Apple Wallet Pass Type Identifier beginning with "pass."');
}

if (/skygrid/i.test(env('PASS_TYPE_IDENTIFIER')) || /skygrid/i.test(env('ORGANIZATION_NAME')) || /skygrid/i.test(env('PUBLIC_BASE_URL'))) {
  failures.push('Veteran Status Wallet Service must use a separate non-SKYGRID identifier, organization name, and issuer URL.');
}

if (env('TEAM_IDENTIFIER') && env('TEAM_IDENTIFIER').length < 8) {
  warnings.push('TEAM_IDENTIFIER looks short. Confirm it is the Apple Developer Team ID, not a bundle ID.');
}

if (env('PUBLIC_BASE_URL') && !env('PUBLIC_BASE_URL').startsWith('https://')) {
  warnings.push('PUBLIC_BASE_URL should use HTTPS for physical iPhone testing. Local HTTP is acceptable only for server smoke checks.');
}

for (const name of ['PASS_CERT_PATH', 'PASS_KEY_PATH', 'WWDR_CERT_PATH']) {
  const value = env(name);
  if (!value) continue;

  const resolved = resolveFromServerRoot(value);
  if (!fs.existsSync(resolved)) {
    failures.push(`${name} does not exist at ${resolved}`);
  }
}

if (/ald/i.test(env('PASS_CERT_PATH')) || /ald/i.test(env('PASS_KEY_PATH'))) {
  failures.push('Certificate path appears to reference ALD. Use Apple Wallet Pass Type ID certificate material instead.');
}

console.log('Veteran Wallet PassKit preflight');
console.log('----------------------------------');
console.log(`PASS_TYPE_IDENTIFIER: ${env('PASS_TYPE_IDENTIFIER') || '(missing)'}`);
console.log(`TEAM_IDENTIFIER: ${env('TEAM_IDENTIFIER') ? '(set)' : '(missing)'}`);
console.log(`PUBLIC_BASE_URL: ${env('PUBLIC_BASE_URL') || '(missing)'}`);

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (failures.length) {
  console.error('\nPreflight failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('\nPreflight passed. Certificate files are present and the standalone Wallet pass lane is configured for presentation.');
