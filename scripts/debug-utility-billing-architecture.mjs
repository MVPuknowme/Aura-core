import fs from 'node:fs';

const configPath = 'config/skygrid-utility-billing.architecture.json';
const docPath = 'docs/stripe-utility-billing-system.md';

const fail = (message) => {
  console.error(`ARCHITECTURE DEBUG FAIL: ${message}`);
  process.exitCode = 1;
};

const pass = (message) => {
  console.log(`PASS: ${message}`);
};

if (!fs.existsSync(configPath)) {
  fail(`Missing ${configPath}`);
  process.exit();
}

if (!fs.existsSync(docPath)) {
  fail(`Missing ${docPath}`);
  process.exit();
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const doc = fs.readFileSync(docPath, 'utf8');

if (config.project !== 'aura-core/skygrid') fail('project must be aura-core/skygrid');
else pass('project identity locked');

if (!Array.isArray(config.tier_anchors) || config.tier_anchors.length < 5) fail('expected at least five tier anchors');
else pass(`tier anchors present: ${config.tier_anchors.length}`);

if (!Array.isArray(config.adaptive_riders) || config.adaptive_riders.length < 5) fail('expected at least five adaptive riders');
else pass(`adaptive riders present: ${config.adaptive_riders.length}`);

if (!Array.isArray(config.invoice_lines) || config.invoice_lines.length < 10) fail('expected utility invoice line list');
else pass(`invoice lines present: ${config.invoice_lines.length}`);

const requiredRiders = [
  'two_way_bridge_rider',
  'web3_infrastructure_backup_rider',
  'isp_condition_rider',
  'crisis_emergency_data_pack_rider',
  'infrastructure_support_insurance_rider',
];

const riderIds = new Set(config.adaptive_riders.map((r) => r.id));
for (const rider of requiredRiders) {
  if (!riderIds.has(rider)) fail(`missing rider: ${rider}`);
  else pass(`rider found: ${rider}`);
}

const web3 = config.adaptive_riders.find((r) => r.id === 'web3_infrastructure_backup_rider');
if (!web3?.rate_basis?.includes('eth_reference_rate')) fail('web3 rider must include ETH reference rate');
else pass('web3 rider includes ETH reference rate');

const isp = config.adaptive_riders.find((r) => r.id === 'isp_condition_rider');
const ispTerms = ['isp_up', 'isp_down', 'degraded_trend'];
for (const term of ispTerms) {
  if (!isp?.rate_basis?.includes(term)) fail(`isp rider missing ${term}`);
}
if (process.exitCode !== 1) pass('ISP rider includes up/down/degraded trend');

const crisis = config.adaptive_riders.find((r) => r.id === 'crisis_emergency_data_pack_rider');
if (!crisis?.rate_basis?.includes('local_supply')) fail('crisis rider must include local supply');
else pass('crisis rider includes local supply');

const insurance = config.adaptive_riders.find((r) => r.id === 'infrastructure_support_insurance_rider');
if (!insurance?.safety?.includes('not_guaranteed')) fail('insurance rider must state no guaranteed emergency outcome');
else pass('insurance rider safety language present');

const forbiddenPatterns = [/sk_live_/i, /sk_test_/i, /pk_live_[A-Za-z0-9]{10,}/i];
for (const pattern of forbiddenPatterns) {
  if (pattern.test(JSON.stringify(config)) || pattern.test(doc)) {
    fail(`forbidden credential-like pattern found: ${pattern}`);
  }
}

const docMustContain = [
  'fixed tier anchors',
  'adaptive riders',
  'two-way bridge',
  'ETH',
  'ISP',
  'crisis',
  'infrastructure support',
];

for (const phrase of docMustContain) {
  if (!doc.toLowerCase().includes(phrase.toLowerCase())) fail(`doc missing phrase: ${phrase}`);
  else pass(`doc contains: ${phrase}`);
}

if (process.exitCode === 1) {
  console.error('Utility billing architecture debug completed with failures.');
} else {
  console.log('Utility billing architecture debug completed successfully.');
}
