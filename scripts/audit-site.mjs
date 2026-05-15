import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteDir = join(root, 'site');
const indexPath = join(siteDir, 'index.html');
const healthPath = join(siteDir, 'status', 'health.json');

const failures = [];

function fail(message) {
  failures.push(message);
}

if (!existsSync(indexPath)) fail('Missing site/index.html');
if (!existsSync(healthPath)) fail('Missing site/status/health.json');

const html = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';

const requiredText = [
  'SKYGRID by Aura-Core™',
  'Pilot / Demo Only',
  'not a guaranteed payout program',
  'LoRa, MQTT',
  'Build reliable proof before making production claims'
];

for (const text of requiredText) {
  if (!html.includes(text)) fail(`Missing required text: ${text}`);
}

if (/Sky Protocol/i.test(html)) {
  fail('Site copy should not use Sky Protocol wording because of collision risk.');
}

if (/b12sites|b12io/i.test(html)) {
  fail('Site copy should not include B12 links.');
}

const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
const anchors = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));

for (const href of hrefs) {
  if (href.startsWith('#')) {
    const id = href.slice(1);
    if (!anchors.has(id)) fail(`Broken hash route: ${href}`);
  }

  if (href === 'status/health.json' && !existsSync(healthPath)) {
    fail('Health JSON route is referenced but missing.');
  }

  if (href.includes('github.com/MVPuknowme/Aura-core') === false && href.startsWith('https://')) {
    fail(`Unexpected external link: ${href}`);
  }
}

try {
  const health = JSON.parse(readFileSync(healthPath, 'utf8'));
  if (health.claims_mode !== 'pilot_demo_only') fail('health.json claims_mode must be pilot_demo_only');
  if (!health.guardrails?.includes('No guaranteed revenue claims')) fail('health.json missing revenue guardrail');
} catch (error) {
  fail(`health.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Static site audit failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Static site audit passed.');
console.log(`Checked ${hrefs.length} routes/links.`);
