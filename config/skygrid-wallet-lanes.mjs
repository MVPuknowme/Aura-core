const SAFETY = Object.freeze({
  readOnly: true,
  storesPrivateKeys: false,
  signsTransactions: false,
  broadcastsTransactions: false,
  grantsTokenApprovals: false,
  executesSwaps: false
});

const ALLOWED_RPC_METHODS = Object.freeze([
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_call",
  "eth_getCode"
]);

const base = Object.freeze({
  key: "base",
  protocol: "aerodrome",
  chain: Object.freeze({
    id: 8453,
    idHex: "0x2105",
    name: "Base",
    nativeCurrency: Object.freeze({ name: "Ether", symbol: "ETH", decimals: 18 }),
    defaultRpcUrl: "https://mainnet.base.org"
  }),
  token: Object.freeze({
    symbol: "AERO",
    decimals: 18,
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631"
  }),
  requiredContracts: Object.freeze({
    aeroToken: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    router: "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43"
  }),
  rpcUrlEnvironmentVariable: "SKYGRID_BASE_RPC_URL",
  timeoutEnvironmentVariable: "SKYGRID_BASE_RPC_TIMEOUT_MS"
});

const optimism = Object.freeze({
  key: "optimism",
  protocol: "optimism",
  chain: Object.freeze({
    id: 10,
    idHex: "0xa",
    name: "OP Mainnet",
    nativeCurrency: Object.freeze({ name: "Ether", symbol: "ETH", decimals: 18 }),
    defaultRpcUrl: "https://mainnet.optimism.io"
  }),
  token: Object.freeze({
    symbol: "OP",
    decimals: 18,
    address: "0x4200000000000000000000000000000000000042"
  }),
  requiredContracts: Object.freeze({
    opToken: "0x4200000000000000000000000000000000000042"
  }),
  rpcUrlEnvironmentVariable: "SKYGRID_OPTIMISM_RPC_URL",
  timeoutEnvironmentVariable: "SKYGRID_OPTIMISM_RPC_TIMEOUT_MS"
});

export const SKYGRID_WALLET_LANES = Object.freeze({
  product: "SKYGRID Emergency Data On-Ramp",
  integration: "Base / Aerodrome + OP Mainnet / Optimism wallet read adapter",
  walletEnvironmentVariable: "SKYGRID_WALLET_ADDRESS",
  legacyWalletEnvironmentVariable: "SKYGRID_AERODROME_WALLET_ADDRESS",
  allowedLaneValues: Object.freeze(["both", "base", "optimism"]),
  allowedRpcMethods: ALLOWED_RPC_METHODS,
  safety: SAFETY,
  lanes: Object.freeze({ base, optimism })
});
