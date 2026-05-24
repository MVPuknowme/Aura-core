const DEFAULT_CHAIN_ID = Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID || 8453);
const BASE_USDC = process.env.NEXT_PUBLIC_BASE_USDC || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || '0xbAA5A03bC268546194550a427d3F1d5787c15403';

export default function handler(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.end(JSON.stringify({
    ok: true,
    service: 'SkyGrid Web3 Chain Health',
    mode: 'advisory_preflight',
    defaultChainId: DEFAULT_CHAIN_ID,
    chain: {
      id: 8453,
      name: 'Base',
      status: DEFAULT_CHAIN_ID === 8453 ? 'configured' : 'chain_id_mismatch',
      rpcValidated: false,
      note: 'Preview route only. Live RPC validation is intentionally not executed in this build.'
    },
    assets: {
      baseUsdc: BASE_USDC,
      treasuryWallet: TREASURY_WALLET
    },
    walletConnectConfigured: Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID),
    executionAllowed: false,
    custody: false,
    privateKeysAccepted: false,
    sentinel: 'fail_closed',
    timestamp: new Date().toISOString()
  }, null, 2));
}
