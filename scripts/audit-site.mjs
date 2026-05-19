import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const siteDir = join(root, 'site');
const indexPath = join(siteDir, 'index.html');
const healthPath = join(siteDir, 'status', 'health.json');
const deviceStatusPath = join(siteDir, 'device-status.js');

const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function pass(message) {
  notes.push(`✅ ${message}`);
}

function checkFile(path, label) {
  if (!existsSync(path)) {
    fail(`Missing ${label}`);
    return false;
  }

  const stat = statSync(path);
  if (!stat.isFile()) {
    fail(`${label} exists but is not a file`);
    return false;
  }

  pass(`${label} found`);
  return true;
}

if (!existsSync(siteDir)) {
  fail('Missing site/ directory');
} else if (!statSync(siteDir).isDirectory()) {
  fail('site exists but is not a directory');
} else {
  pass('site path found');
}

const hasIndex = checkFile(indexPath, 'site/index.html');
const hasHealth = checkFile(healthPath, 'site/status/health.json');
const hasDeviceScript = checkFile(deviceStatusPath, 'site/device-status.js');

const html = hasIndex ? readFileSync(indexPath, 'utf8') : '';
const deviceScript = hasDeviceScript ? readFileSync(deviceStatusPath, 'utf8') : '';

const requiredText = [
  'SKYGRID by Aura-Core™',
  'Pilot / Demo Only',
  'not a guaranteed payout program',
  'LoRa, MQTT',
  'Build reliable proof before making production claims',
  'Device Connected Status'
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

if (!html.includes('id="device-status"')) fail('Missing device status component: #device-status');
else pass('device status component found');

if (!html.includes('id="device-last-checked"')) fail('Missing device last checked timestamp element: #device-last-checked');
if (!html.includes('id="device-status-refresh"')) fail('Missing device status refresh control: #device-status-refresh');
if (!html.includes('<script src="device-status.js" defer></script>')) fail('site/index.html must load site/device-status.js with defer');
else pass('device-status.js is wired into index.html');

const requiredDeviceScriptSnippets = [
  'navigator.onLine',
  'getDeviceClass',
  'localStorage',
  "fetch('status/health.json'",
  "window.addEventListener('online'",
  "window.addEventListener('offline'"
];

for (const snippet of requiredDeviceScriptSnippets) {
  if (!deviceScript.includes(snippet)) fail(`device-status.js missing required safe check: ${snippet}`);
}

if (/MAC|IMEI|serial|geolocation|getCurrentPosition|wallet|privateKey|did:aura:\s*['"`]/i.test(deviceScript)) {
  fail('device-status.js appears to reference invasive identifiers, wallet keys, geolocation, or an empty Aura DID.');
}

if (hasDeviceScript) pass('required JS asset found: site/device-status.js');
if (hasHealth) pass('required site asset found: site/status/health.json');

const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
const anchors = new Set([...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]));

for (const href of hrefs) {
  if (href.startsWith('#')) {
    const id = href.slice(1);
    if (!anchors.has(id)) fail(`Broken hash route: ${href}`);
  }

  if (href === 'status/health.json' && !hasHealth) {
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

if (existsSync(siteDir) && hasIndex) pass('Pages artifact path valid: site/');

console.log('SKYGRID static site audit report');
console.log('================================');
for (const item of notes) console.log(item);
console.log(`Checked ${hrefs.length} routes/links.`);

if (failures.length) {
  console.error('\nStatic site audit failed:');
  for (const item of failures) console.error(`- ${item}`);
  process.exit(1);
}

console.log('\nStatic site audit passed.');
