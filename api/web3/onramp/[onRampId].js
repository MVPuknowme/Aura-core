export default function handler(req, res) {
  const onRampId = req.query?.onRampId || 'preview';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Web3 On-Ramp Preview',
    mode: 'advisory_preflight',
    onRampId,
    status: 'draft_ready',
    chainId: Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 8453),
    asset: 'USDC',
    treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET || '0xbAA5A03bC268546194550a427d3F1d5787c15403',
    routes: {
      page: `/web3/onramp/${onRampId}`,
      quote: `/api/web3/onramp/${onRampId}/quote`,
      tx: `/api/web3/onramp/${onRampId}/tx`,
      proof: `/api/web3/onramp/${onRampId}/proof`
    },
    executionAllowed: false,
    custody: false,
    privateKeysAccepted: false,
    sentinel: 'fail_closed',
    timestamp: new Date().toISOString()
  }, null, 2));
}
