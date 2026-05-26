const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '0xbAA5A03bC268546194550a427d3F1d5787c15403';
const BASE_USDC = process.env.NEXT_PUBLIC_BASE_USDC || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 8453);

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
    id: 'manual-review-fallback',
    label: 'Manual review fallback lane',
    chainId: null,
    asset: 'N/A',
    status: 'fallback',
    priority: 99
  }
];

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

function selectAutoDrillLane() {
  if (DEFAULT_CHAIN_ID === 8453 && BASE_USDC && TREASURY_WALLET) {
    return LANES[0];
  }

  return LANES[1];
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }, null, 2));
  }

  const body = req.method === 'POST' ? await readBody(req) : {};
  const amountUsd = body.amountUsd || '25.00';
  const selectedLane = selectAutoDrillLane();
  const onRampId = `autodrill_onramp_${Date.now().toString(36)}`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Web3 On-Ramp Preview',
    mode: 'advisory_preflight',
    onRampId,
    status: 'draft_created',
    amountUsd,
    autoSelected: true,
    selectedBy: 'auto_drill',
    selectedLane,
    availableLanes: LANES,
    chainId: selectedLane.chainId || DEFAULT_CHAIN_ID,
    asset: selectedLane.asset,
    assetAddress: BASE_USDC,
    treasuryWallet: TREASURY_WALLET,
    walletConnectConfigured: Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
    nextRoutes: {
      autoSelect: '/api/web3/onramp/auto-select',
      details: `/api/web3/onramp/${onRampId}`,
      quote: `/api/web3/onramp/${onRampId}/quote`,
      tx: `/api/web3/onramp/${onRampId}/tx`,
      proof: `/api/web3/onramp/${onRampId}/proof`,
      page: `/web3/onramp/${onRampId}`
    },
    guardrails: [
      'On-ramp requests are selected by Auto-Drill, not manually routed',
      'Selection is advisory until proof gates and wallet approval pass',
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
