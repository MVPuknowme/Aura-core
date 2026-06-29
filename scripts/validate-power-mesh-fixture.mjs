import { readFileSync } from 'node:fs';

const fixturePath = new URL('../fixtures/skygrid-power-mesh/kfalls-node-001.telemetry.json', import.meta.url);
const payload = JSON.parse(readFileSync(fixturePath, 'utf8'));

const allowedModes = new Set([
  'grid_connected',
  'islanded',
  'battery_only',
  'ambient_trickle',
]);

const allowedComms = new Set([
  'wifi',
  'lte',
  'lora',
  'ethernet',
  'satellite',
  'ble',
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(/^skygrid-node-[a-z0-9-]+$/.test(payload.node_id), 'node_id must use skygrid-node-* format');
assert(allowedModes.has(payload.mode), 'mode must be an approved SKYGRID Power Mesh mode');
assert(typeof payload.battery_soc === 'number', 'battery_soc must be numeric');
assert(payload.battery_soc >= 0 && payload.battery_soc <= 100, 'battery_soc must be between 0 and 100');
assert(Number.isInteger(payload.critical_load_minutes_remaining), 'critical_load_minutes_remaining must be an integer');
assert(payload.critical_load_minutes_remaining >= 0, 'critical_load_minutes_remaining must be positive');
assert(typeof payload.solar_watts_now === 'number' && payload.solar_watts_now >= 0, 'solar_watts_now must be a non-negative number');
assert(typeof payload.ambient_harvest_mw === 'number' && payload.ambient_harvest_mw >= 0, 'ambient_harvest_mw must be a non-negative number');
assert(Array.isArray(payload.comms) && payload.comms.length > 0, 'comms must be a non-empty array');
for (const channel of payload.comms) {
  assert(allowedComms.has(channel), `unsupported comms channel: ${channel}`);
}
assert(typeof payload.emergency_ready === 'boolean', 'emergency_ready must be boolean');
assert(!Number.isNaN(Date.parse(payload.proof_timestamp)), 'proof_timestamp must be a valid date-time');

console.log(JSON.stringify({
  ok: true,
  checked: 'skygrid-power-mesh-telemetry',
  node_id: payload.node_id,
  mode: payload.mode,
  emergency_ready: payload.emergency_ready,
}, null, 2));
