const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 8453);
const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '0xbAA5A03bC268546194550a427d3F1d5787c15403';
const BASE_USDC = process.env.NEXT_PUBLIC_BASE_USDC || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const LANES = [
  {
    id: 'base-usdc-reference',
    label: 'Base USDC reference lane',
    chainId: 8453,
    asset: 'USDC',
    status: 'available',
    priority: 1
  },
  {
    id: 'stripe-device-link-reference',
    label: 'Stripe device-link reference lane',
    chainId: null,
    asset: 'USD',
    status: 'preview_only',
    priority: 2
  },
  {
    id: 'manual-review-fallback',
    label: 'Manual review fallback lane',
    chainId: null,
    asset: 'N/A',
    status: 'fallback',
    priority: 99
  }
];

function selectLane() {
  if (DEFAULT_CHAIN_ID === 8453 && BASE_USDC && TREASURY_WALLET) {
    return LANES[0];
  }

  return LANES.find((lane) => lane.id === 'manual-review-fallback');
}

export default function handler(req, res) {
  const selectedLane = selectLane();
  const onRampId = `autodrill_onramp_${Date.now().toString(36)}`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Auto-Drill On-Ramp Selector',
    mode: 'advisory_preflight',
    onRampId,
    autoSelected: true,
    selectedBy: 'auto_drill',
    selectedLane,
    availableLanes: LANES,
    routes: {
      details: `/api/web3/onramp/${onRampId}`,
      quote: `/api/web3/onramp/${onRampId}/quote`,
      tx: `/api/web3/onramp/${onRampId}/tx`,
      proof: `/api/web3/onramp/${onRampId}/proof`,
      page: `/web3/onramp/${onRampId}`
    },
    guardrails: [
      'Auto-Drill selects the safest available on-ramp lane',
      'Selection is advisory until route validation and wallet approval pass',
      'No private keys or seed phrases accepted',
      'No custodial wallet logic',
      'No live transaction execution from preview route'
    ],
    executionAllowed: false,
    requiresWalletApproval: true,
    custody: false,
    privateKeysAccepted: false,
    seedPhrasesAccepted: false,
    sentinel: 'fail_closed',
    timestamp: new Date().toISOString()
  }, null, 2));
}
