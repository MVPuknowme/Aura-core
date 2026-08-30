import assert from 'node:assert/strict';
import fs from 'node:fs';

const collectionPath = 'postman/skygrid-web3-p2p-superhighway.postman_collection.json';
const raw = fs.readFileSync(collectionPath, 'utf8');
const collection = JSON.parse(raw);

const requiredPaths = new Set([
  '/api/health',
  '/api/web3/chains/health',
  '/api/p2p/nodes/heartbeat',
  '/api/p2p/kafka/events',
  '/api/web3/bridge/quote',
  '/api/web3/bridge/intents',
  '/api/web3/bridge/intents/{{intent_id}}/status',
  '/api/failover/signals',
  '/api/isp/route/status',
  '/api/billing/usage/web3-bridge',
  '/api/billing/usage/p2p-node',
  '/api/proofs/{{proof_id}}',
]);

const forbiddenTerms = [
  'privateKey',
  'private_key',
  'seedPhrase',
  'seed_phrase',
  'mnemonic',
];

function flattenItems(items, out = []) {
  for (const item of items || []) {
    if (item.request) out.push(item);
    if (item.item) flattenItems(item.item, out);
  }
  return out;
}

const requests = flattenItems(collection.item);

assert.equal(collection.info?.schema, 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
assert.ok(requests.length >= requiredPaths.size, 'collection should include all required API requests');

const observedPaths = new Set();

for (const item of requests) {
  const rawUrl = item.request?.url?.raw;
  assert.ok(rawUrl, `${item.name} must have a raw URL`);
  const path = rawUrl.replace('{{base_url}}', '');
  observedPaths.add(path);

  assert.ok(item.response?.length > 0, `${item.name} must include a saved response example for Postman mocks`);
  const example = item.response[0];
  assert.equal(example.code, 200, `${item.name} mock example should return 200`);
  assert.ok(example.body, `${item.name} mock example should include JSON body`);

  const parsedBody = JSON.parse(example.body);
  assert.ok(
    parsedBody.accepted !== undefined ||
      parsedBody.status !== undefined ||
      parsedBody.proofId !== undefined ||
      parsedBody.available !== undefined,
    `${item.name} response should expose accepted/status/proofId/available signal`,
  );

  const serialized = JSON.stringify(item);
  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `${item.name} must not contain forbidden term ${term}`);
  }
}

for (const requiredPath of requiredPaths) {
  assert.ok(observedPaths.has(requiredPath), `missing required path: ${requiredPath}`);
}

console.log(JSON.stringify({
  ok: true,
  collection: collection.info.name,
  requestCount: requests.length,
  requiredPathCount: requiredPaths.size,
}, null, 2));
