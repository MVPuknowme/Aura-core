import fs from 'node:fs/promises';

const REQUIRED_TRUE = [
  'eip712_enforced',
  'chain_id_validation',
  'dynamodb_nonce_replay_protection',
  'wallet_boundary_lock',
  'append_only_audit_stream'
];

async function readJson(path) {
  return JSON.parse(await fs.readFile(path, 'utf8'));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const state = await readJson('config/snapshots/production-state.json');

  assert(state.system === 'Aura-Core', 'Invalid system name');
  assert(state.environment === 'production', 'Invalid environment');
  assert(state.repository === 'MVPuknowme/Aura-core', 'Invalid repository binding');

  for (const key of REQUIRED_TRUE) {
    assert(state.controls?.[key] === true, `Required production control not enabled: ${key}`);
  }

  assert(state.controls?.reinvestment_enabled === false, 'Reinvestment must remain disabled for this production snapshot');
  assert(state.wallet_boundaries?.private_keys_allowed_in_repo === false, 'Private keys must not be allowed in repo');
  assert(state.wallet_boundaries?.seed_phrases_allowed_in_repo === false, 'Seed phrases must not be allowed in repo');
  assert(state.wallet_boundaries?.signing_requires_operator_wallet === true, 'Operator wallet signing boundary missing');

  console.log('Production state verification passed');
  console.log(JSON.stringify({
    system: state.system,
    environment: state.environment,
    timestamp: state.timestamp,
    repository: state.repository,
    controls: state.controls
  }, null, 2));
}

main().catch((error) => {
  console.error('Production state verification failed');
  console.error(error.message);
  process.exit(1);
});
