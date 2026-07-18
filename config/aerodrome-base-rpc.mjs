export const AERODROME_BASE_RPC = Object.freeze({
  product: "SKYGRID Emergency Data On-Ramp",
  integration: "Aerodrome wallet read adapter",
  chain: Object.freeze({
    id: 8453,
    idHex: "0x2105",
    name: "Base",
    nativeCurrency: Object.freeze({ name: "Ether", symbol: "ETH", decimals: 18 }),
    defaultRpcUrl: "https://mainnet.base.org"
  }),
  contracts: Object.freeze({
    aeroToken: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43",
    poolFactory: "0x420DD381b31aEf6683db6B902084cB0FFECe40Da",
    voter: "0x16613524e02ad97eDfeF371bC883F2F5d6C480A5",
    votingEscrow: "0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4"
  }),
  allowedRpcMethods: Object.freeze([
    "eth_chainId",
    "eth_blockNumber",
    "eth_getBalance",
    "eth_call",
    "eth_getCode"
  ]),
  safety: Object.freeze({
    readOnly: true,
    storesPrivateKeys: false,
    signsTransactions: false,
    broadcastsTransactions: false,
    grantsTokenApprovals: false,
    executesSwaps: false
  })
});
