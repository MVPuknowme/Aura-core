const AURA_DID = 'did:aura:873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';
const DID_HEX = '873f8f0eba269fd750c591c1a38e50afbc6fa536b95806d306222911371f6a75';
const VERSION = '1.3.2-aura-did';

function isValidAuraDid(did) {
  return /^did:aura:[a-f0-9]{64}$/i.test(did);
}

export default function handler(req, res) {
  const valid = isValidAuraDid(AURA_DID);

  res.statusCode = valid ? 200 : 500;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-DID', AURA_DID);
  res.setHeader('X-Phoenix-Version', VERSION);

  res.end(JSON.stringify({
    ok: valid,
    status: valid ? 'resolved' : 'invalid',
    service: 'Aura-Core DID Resolver',
    version: VERSION,
    did: AURA_DID,
    method: 'aura',
    identifier: DID_HEX,
    powered_by: 'Aura-Core',
    runtime_primary: true,
    static_primary: false,
    generated_at: new Date().toISOString(),
    verification: {
      format: 'did:aura:<64-hex-identifier>',
      valid,
      empty_did_rejected: true,
      external_gateway_required: false
    },
    did_document: {
      '@context': [
        'https://www.w3.org/ns/did/v1'
      ],
      id: AURA_DID,
      controller: AURA_DID,
      alsoKnownAs: [
        'MVPuknowme',
        'Aura-Core',
        'SKYGRID'
      ],
      service: [
        {
          id: `${AURA_DID}#health`,
          type: 'AuraCoreHealthService',
          serviceEndpoint: '/api/health'
        },
        {
          id: `${AURA_DID}#device-status`,
          type: 'AuraCoreDeviceStatusService',
          serviceEndpoint: '/api/device-status'
        }
      ]
    },
    guardrails: [
      'This endpoint validates DID format only; it does not prove legal identity by itself.',
      'No private keys, wallet seed phrases, MAC addresses, IMEI values, or precise location data are collected.',
      'External DID gateway calls must reject empty did:aura: values before fetch.'
    ]
  }, null, 2));
}
