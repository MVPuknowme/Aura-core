const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '0xbAA5A03bC268546194550a427d3F1d5787c15403';
const BASE_USDC = process.env.NEXT_PUBLIC_BASE_USDC || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 8453);

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

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, POST');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }, null, 2));
  }

  const body = req.method === 'POST' ? await readBody(req) : {};
  const amountUsd = body.amountUsd || '25.00';
  const onRampId = `skygrid_onramp_${Date.now().toString(36)}`;

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
    chainId: DEFAULT_CHAIN_ID,
    asset: 'USDC',
    assetAddress: BASE_USDC,
    treasuryWallet: TREASURY_WALLET,
    walletConnectConfigured: Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
    nextRoutes: {
      details: `/api/web3/onramp/${onRampId}`,
      quote: `/api/web3/onramp/${onRampId}/quote`,
      tx: `/api/web3/onramp/${onRampId}/tx`,
      proof: `/api/web3/onramp/${onRampId}/proof`,
      page: `/web3/onramp/${onRampId}`
    },
    executionAllowed: false,
    requiresWalletApproval: true,
    custody: false,
    privateKeysAccepted: false,
    sentinel: 'fail_closed',
    timestamp: new Date().toISOString()
  }, null, 2));
}
