import { readFile } from 'node:fs/promises';

const pnpkPath = process.env.PNPK_PATH || 'bridge/skygrid-emergency-onramp.pnpk';
const pnpk = JSON.parse(await readFile(pnpkPath, 'utf8'));

const input = {
  route_type: process.env.SKYGRID_ROUTE_TYPE || process.argv[2] || 'emergency',
  lease_need: process.env.SKYGRID_LEASE_NEED || process.argv[3] || 'none',
  requested_compute_space: Number(process.env.SKYGRID_COMPUTE_SPACE || process.argv[4] || 0),
  ethereum_gas_units: Number(process.env.ETH_GAS_UNITS || process.argv[5] || 0),
  ethereum_max_fee_gwei: Number(process.env.ETH_MAX_FEE_GWEI || process.argv[6] || 0),
  source: process.env.SKYGRID_SOURCE || 'postman_or_ci'
};

function failClosed(reason, extra = {}) {
  console.log(JSON.stringify({
    ok: false,
    decision: 'fail_closed',
    reason,
    service: pnpk.service,
    mode: pnpk.mode,
    sentinel: pnpk.sentinel,
    ...extra
  }, null, 2));
  process.exit(2);
}

if (pnpk.mode !== 'controlled_pilot' || pnpk.sentinel !== 'fail_closed') {
  failClosed('PNPK is not in controlled_pilot/fail_closed posture');
}

for (const [key, value] of Object.entries(pnpk.runtime_policy || {})) {
  if (value !== false) {
    failClosed(`Runtime policy ${key} must remain false`);
  }
}

const router = pnpk.provisioning_router;
if (!router?.enabled) {
  failClosed('Provisioning router is not enabled in PNPK');
}

const routeType = String(input.route_type).toLowerCase();
const leaseNeed = String(input.lease_need).toLowerCase();

let selectedRuntime = null;
let reason = null;

if (routeType === 'emergency') {
  selectedRuntime = 'lambda';
  reason = 'emergency route selected AWS Lambda validation path';
} else if (routeType === 'provisional_lease' || leaseNeed !== 'none') {
  selectedRuntime = 'web3';
  reason = 'provisional lease selected Web3 quote/provisioning path';
} else {
  selectedRuntime = 'postman';
  reason = 'diagnostic route selected Postman validation path';
}

const gasQuote = {
  chain: 'ethereum',
  quote_only: true,
  execution_allowed: false,
  gas_units: input.ethereum_gas_units,
  max_fee_gwei: input.ethereum_max_fee_gwei,
  max_fee_eth: input.ethereum_gas_units > 0 && input.ethereum_max_fee_gwei > 0
    ? Number(((input.ethereum_gas_units * input.ethereum_max_fee_gwei) / 1e9).toFixed(12))
    : null,
  note: 'Gas is represented as a provisioning quote only. No wallet signing, payment execution, or on-chain transaction is performed.'
};

const autoDrillEnvelope = {
  enabled: true,
  mode: 'quote_and_reserve_only',
  requested_compute_space: input.requested_compute_space,
  harvest_execution_allowed: false,
  provisioning_note: 'Auto-Drill may use this envelope to plan route/compute space only. It must not execute production failover or payments in controlled pilot.'
};

const decision = {
  ok: true,
  service: pnpk.service,
  mode: pnpk.mode,
  sentinel: pnpk.sentinel,
  decision: 'provisioning_plan_created',
  selected_runtime: selectedRuntime,
  reason,
  postman_target: pnpk.routes?.highway_postman || '/api/highway/postman',
  lambda_target: pnpk.provisioning_router?.runtime_targets?.lambda || null,
  web3_target: pnpk.provisioning_router?.runtime_targets?.web3 || null,
  input,
  gas_quote: gasQuote,
  auto_drill: autoDrillEnvelope,
  guardrails: router.guardrails || []
};

console.log(JSON.stringify(decision, null, 2));
