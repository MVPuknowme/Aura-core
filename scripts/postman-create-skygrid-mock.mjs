import fs from 'node:fs/promises';

const POSTMAN_API_BASE = 'https://api.getpostman.com';
const POSTMAN_API_KEY = process.env.POSTMAN_API_KEY;
const WORKSPACE_ID = process.env.POSTMAN_WORKSPACE_ID;
const MOCK_PRIVATE = process.env.POSTMAN_MOCK_PRIVATE !== 'false';
const WRITE_COLLECTION = process.env.POSTMAN_WRITE_COLLECTION === 'true';

if (!POSTMAN_API_KEY) {
  console.error('POSTMAN_API_KEY is required. Do not commit it to the repository.');
  process.exit(2);
}

function tests() {
  return [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          "pm.test('response is JSON', function () { pm.response.to.be.json; });",
          "pm.test('response time under 3000ms', function () { pm.expect(pm.response.responseTime).to.be.below(3000); });",
          'const json = pm.response.json();',
          "pm.test('response has status/accepted/proofId signal', function () {",
          '  pm.expect(json.accepted !== undefined || json.status !== undefined || json.proofId !== undefined || json.available !== undefined).to.eql(true);',
          '});',
          "if (json.proofId) { pm.environment.set('proof_id', json.proofId); }",
        ],
      },
    },
  ];
}

function requestItem({ name, method, path, body, example, description }) {
  const headers = [{ key: 'Authorization', value: 'Bearer {{api_key}}', type: 'text' }];

  if (method !== 'GET') {
    headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
  }

  const request = {
    method,
    header: headers,
    url: {
      raw: `{{base_url}}${path}`,
      host: ['{{base_url}}'],
      path: path.split('/').filter(Boolean),
    },
    description,
  };

  if (body) {
    request.body = {
      mode: 'raw',
      raw: JSON.stringify(body, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  return {
    name,
    request,
    event: tests(),
    response: [
      {
        name: '200 OK - Mock',
        originalRequest: request,
        status: 'OK',
        code: 200,
        _postman_previewlanguage: 'json',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: JSON.stringify(example, null, 2),
      },
    ],
  };
}

function buildCollection() {
  return {
    info: {
      name: 'SkyGrid Web3 P2P API Superhighway Mock',
      description:
        'Mock-first Postman collection for Aura-Core / SkyGrid API superhighway connecting Web3, L2/mainnet bridge status, P2P node heartbeats, failover signals, proof logs, and utility-billing riders.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{api_key}}', type: 'string' }],
    },
    variable: [
      { key: 'base_url', value: 'https://{{mock_url}}', type: 'string' },
      { key: 'api_key', value: 'postman-local-placeholder', type: 'string' },
      { key: 'mock_url', value: 'replace-with-created-mock-host.mock.pstmn.io', type: 'string' },
      { key: 'intent_id', value: 'bridge_intent_001', type: 'string' },
      { key: 'proof_id', value: 'proof_bridge_status_001', type: 'string' },
      { key: 'test_customer_ref', value: 'customer-demo-001', type: 'string' },
      { key: 'test_node_id', value: 'node-demo-001', type: 'string' },
    ],
    item: [
      {
        name: '1. Health and Discovery',
        item: [
          requestItem({
            name: 'GET API Health',
            method: 'GET',
            path: '/api/health',
            description: 'Basic service health for the SkyGrid API superhighway.',
            example: {
              status: 'ok',
              project: 'aura-core/skygrid',
              timestamp: '2026-08-20T00:00:00.000Z',
              version: 'v1',
              proofId: 'proof_health_001',
            },
          }),
          requestItem({
            name: 'GET Web3 Chain Health',
            method: 'GET',
            path: '/api/web3/chains/health',
            description: 'Ethereum and L2 RPC posture before bridge or settlement activity.',
            example: {
              status: 'ok',
              ethereum: { chainId: 1, rpcStatus: 'up', latestBlock: 21000000, latencyMs: 150, syncLag: 0 },
              l2: [
                { name: 'base', chainId: 8453, rpcStatus: 'up', latestBlock: 26000000, latencyMs: 90, syncLag: 0 },
                { name: 'scroll', chainId: 534352, rpcStatus: 'up', latestBlock: 12000000, latencyMs: 110, syncLag: 0 },
              ],
              proofId: 'proof_chain_health_001',
            },
          }),
        ],
      },
      {
        name: '2. P2P Node and Device Layer',
        item: [
          requestItem({
            name: 'POST P2P Node Heartbeat',
            method: 'POST',
            path: '/api/p2p/nodes/heartbeat',
            description: 'Opted-in local node/device heartbeat. Consent must be explicit.',
            body: {
              project: 'aura-core/skygrid',
              nodeId: '{{test_node_id}}',
              deviceClass: 'home-server',
              region: 'local-test',
              status: 'online',
              latencyMs: 42,
              storageAvailableGb: 100,
              relayReady: true,
              consentConfirmed: true,
            },
            example: { accepted: true, nodeStatus: 'online', proofId: 'proof_node_heartbeat_001' },
          }),
          requestItem({
            name: 'POST Kafka P2P Event',
            method: 'POST',
            path: '/api/p2p/kafka/events',
            description: 'Mock bridge event path for local P2P node signals into the event bus.',
            body: {
              project: 'aura-core/skygrid',
              eventType: 'node.route.status',
              nodeId: '{{test_node_id}}',
              topic: 'skygrid.node.status',
              payload: { relayReady: true, ispStatus: 'up', web3Route: 'base-to-ethereum' },
            },
            example: { accepted: true, eventId: 'evt_kafka_001', proofId: 'proof_kafka_001' },
          }),
        ],
      },
      {
        name: '3. Web3 Bridge and Mainnet Flow',
        item: [
          requestItem({
            name: 'POST Bridge Quote',
            method: 'POST',
            path: '/api/web3/bridge/quote',
            description: 'Quote-only route check. No asset movement.',
            body: {
              project: 'aura-core/skygrid',
              fromChain: 'base',
              toChain: 'ethereum',
              asset: 'ETH',
              amount: '0.01',
              routePreference: 'lowest-cost-safe',
              proofRequired: true,
            },
            example: {
              available: true,
              fromChain: 'base',
              toChain: 'ethereum',
              asset: 'ETH',
              estimatedFeeUsd: '0.42',
              estimatedTimeSeconds: 600,
              riskLevel: 'low',
              proofRequired: true,
              proofId: 'proof_bridge_quote_001',
            },
          }),
          requestItem({
            name: 'POST Bridge Intent',
            method: 'POST',
            path: '/api/web3/bridge/intents',
            description: 'Intent creation only. No private keys, seed phrases, or hidden asset movement.',
            body: {
              project: 'aura-core/skygrid',
              requestId: 'skygrid-intent-demo-001',
              fromChain: 'base',
              toChain: 'ethereum',
              asset: 'ETH',
              amount: '0.01',
              walletRef: 'user-approved-wallet-ref',
              purpose: 'web3-infrastructure-backup',
              billingRider: 'web3_infrastructure_backup_rider',
              requiresUserApproval: true,
            },
            example: {
              accepted: true,
              intentId: 'bridge_intent_001',
              status: 'awaiting_user_approval',
              proofId: 'proof_bridge_intent_001',
            },
          }),
          requestItem({
            name: 'GET Bridge Intent Status',
            method: 'GET',
            path: '/api/web3/bridge/intents/{{intent_id}}/status',
            description: 'Status lookup for bridge intent and proof trail.',
            example: {
              intentId: 'bridge_intent_001',
              status: 'pending',
              sourceChainStatus: 'observed',
              destinationChainStatus: 'not_settled',
              confirmations: 0,
              proofId: 'proof_bridge_status_001',
            },
          }),
        ],
      },
      {
        name: '4. Failover and Route Intelligence',
        item: [
          requestItem({
            name: 'POST Web3 Failover Signal',
            method: 'POST',
            path: '/api/failover/signals',
            description: 'Detect degraded chain, bridge, or RPC route and log safe recommendation.',
            body: {
              project: 'aura-core/skygrid',
              signalType: 'web3-route-degraded',
              affectedRoute: 'base-to-ethereum',
              source: 'rpc-monitor',
              severity: 'medium',
              recommendedAction: 'switch-rpc-or-delay-settlement',
              proofRequired: true,
            },
            example: {
              accepted: true,
              signalId: 'failover_signal_001',
              recommendedAction: 'switch-rpc-or-delay-settlement',
              proofId: 'proof_failover_001',
            },
          }),
          requestItem({
            name: 'POST ISP Route Status',
            method: 'POST',
            path: '/api/isp/route/status',
            description: 'Detect ISP up/down/degraded trend and prepare route billing candidate.',
            body: {
              project: 'aura-core/skygrid',
              region: 'local-test',
              ispStatus: 'degraded',
              latencyMs: 220,
              packetLossPercent: 3.5,
              failoverNeeded: true,
            },
            example: {
              accepted: true,
              routeStatus: 'degraded',
              billingRiderCandidate: 'isp_condition_rider',
              proofId: 'proof_isp_status_001',
            },
          }),
        ],
      },
      {
        name: '5. Billing and Usage Metering',
        item: [
          requestItem({
            name: 'POST Web3 Bridge Usage',
            method: 'POST',
            path: '/api/billing/usage/web3-bridge',
            description: 'Meter Web3 bridge rider only when tied to a proof-backed event.',
            body: {
              project: 'aura-core/skygrid',
              customerRef: '{{test_customer_ref}}',
              intentId: '{{intent_id}}',
              rider: 'web3_infrastructure_backup_rider',
              chainRef: 'ethereum',
              l2Ref: 'base',
              usageUnits: 1,
              ethReferenceRate: 'capture_at_runtime',
              proofId: '{{proof_id}}',
            },
            example: {
              accepted: true,
              usageEventId: 'usage_web3_bridge_001',
              invoiceStatus: 'pending_monthly_invoice',
              proofId: 'proof_usage_001',
            },
          }),
          requestItem({
            name: 'POST P2P Node Usage Credit',
            method: 'POST',
            path: '/api/billing/usage/p2p-node',
            description: 'Mock utility credit for verified host/node contribution.',
            body: {
              project: 'aura-core/skygrid',
              customerRef: '{{test_customer_ref}}',
              nodeId: '{{test_node_id}}',
              rider: 'node_host_credit',
              usageUnits: 1,
              basis: 'verified_heartbeat_and_relay_ready',
              proofId: 'proof_node_heartbeat_001',
            },
            example: {
              accepted: true,
              usageEventId: 'usage_p2p_node_001',
              creditStatus: 'pending_reconciliation',
              proofId: 'proof_usage_node_001',
            },
          }),
        ],
      },
      {
        name: '6. Proof and Audit Trail',
        item: [
          requestItem({
            name: 'GET Proof Lookup',
            method: 'GET',
            path: '/api/proofs/{{proof_id}}',
            description: 'Lookup proof event for reconciliation.',
            example: {
              proofId: 'proof_bridge_status_001',
              project: 'aura-core/skygrid',
              eventType: 'bridge_status',
              timestamp: '2026-08-20T00:00:00.000Z',
              source: 'skygrid-api',
              hash: 'demo_hash',
              reconciled: false,
              status: 'found',
            },
          }),
        ],
      },
    ],
  };
}

async function postman(path, body) {
  const url = new URL(`${POSTMAN_API_BASE}${path}`);
  if (WORKSPACE_ID) {
    url.searchParams.set('workspace', WORKSPACE_ID);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-Key': POSTMAN_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    console.error(JSON.stringify({ status: response.status, payload }, null, 2));
    process.exit(1);
  }

  return payload;
}

const collection = buildCollection();

if (WRITE_COLLECTION) {
  await fs.mkdir('postman', { recursive: true });
  await fs.writeFile(
    'postman/skygrid-web3-p2p-superhighway.generated.postman_collection.json',
    JSON.stringify(collection, null, 2),
  );
}

if (!WORKSPACE_ID) {
  console.warn('POSTMAN_WORKSPACE_ID not set. Postman may place resources in your oldest personal Internal workspace.');
}

console.error('Creating Postman collection...');
const createdCollection = await postman('/collections', { collection });
const collectionUid = createdCollection.collection?.uid || createdCollection.collection?.id;

if (!collectionUid) {
  console.error('Postman collection created, but no collection uid/id was returned.');
  console.error(JSON.stringify(createdCollection, null, 2));
  process.exit(1);
}

console.error(`Creating ${MOCK_PRIVATE ? 'private' : 'public'} mock server for collection ${collectionUid}...`);
const createdMock = await postman('/mocks', {
  mock: {
    name: 'SkyGrid Web3 P2P API Superhighway Mock',
    collection: collectionUid,
    private: MOCK_PRIVATE,
  },
});

const mockUrl = createdMock.mock?.mockUrl;

console.log(JSON.stringify({
  collectionUid,
  mockId: createdMock.mock?.id,
  mockUrl,
  private: MOCK_PRIVATE,
  smoke: mockUrl
    ? {
        powershell: MOCK_PRIVATE
          ? `Invoke-RestMethod -Headers @{ 'x-api-key' = $env:POSTMAN_API_KEY } -Uri '${mockUrl}/api/health'`
          : `Invoke-RestMethod -Uri '${mockUrl}/api/health'`,
        curl: MOCK_PRIVATE
          ? `curl -H "x-api-key: $POSTMAN_API_KEY" "${mockUrl}/api/health"`
          : `curl "${mockUrl}/api/health"`,
      }
    : null,
}, null, 2));
