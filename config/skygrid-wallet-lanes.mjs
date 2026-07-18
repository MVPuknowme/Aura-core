import { AERODROME_BASE_RPC } from "./aerodrome-base-rpc.mjs";

const OP_TOKEN_ADDRESS = "0x4200000000000000000000000000000000000042";

export const SKYGRID_WALLET_LANES = Object.freeze({
  product: "SKYGRID Emergency Data On-Ramp",
  integration: "Base/Aerodrome and OP Mainnet dual-lane wallet read adapter",
  walletEnvironmentVariable: "SKYGRID_WALLET_ADDRESS",
  legacyWalletEnvironmentVariable: "SKYGRID_AERODROME_WALLET_ADDRESS",
  allowedLaneValues: Object.freeze(["both", "base", "optimism"]),
  allowedRpcMethods: AERODROME_BASE_RPC.allowedRpcMethods,
  safety: AERODROME_BASE_RPC.safety,
  lanes: Object.freeze({
    base: Object.freeze({
      key: "base",
      protocol: "Aerodrome",
      chain: AERODROME_BASE_RPC.chain,
      rpcUrlEnvironmentVariable: "SKYGRID_BASE_RPC_URL",
      timeoutEnvironmentVariable: "SKYGRID_BASE_RPC_TIMEOUT_MS",
      token: Object.freeze({
        name: "Aerodrome",
        symbol: "AERO",
        decimals: 18,
        address: AERODROME_BASE_RPC.contracts.aeroToken
      }),
      requiredContracts: Object.freeze({
        aeroToken: AERODROME_BASE_RPC.contracts.aeroToken,
        router: AERODROME_BASE_RPC.contracts.router
      })
    }),
    optimism: Object.freeze({
      key: "optimism",
      protocol: "Optimism",
      chain: Object.freeze({
        id: 10,
        idHex: "0xa",
        name: "OP Mainnet",
        nativeCurrency: Object.freeze({ name: "Ether", symbol: "ETH", decimals: 18 }),
        defaultRpcUrl: "https://mainnet.optimism.io"
      }),
      rpcUrlEnvironmentVariable: "SKYGRID_OPTIMISM_RPC_URL",
      timeoutEnvironmentVariable: "SKYGRID_OPTIMISM_RPC_TIMEOUT_MS",
      token: Object.freeze({
        name: "Optimism",
        symbol: "OP",
        decimals: 18,
        address: OP_TOKEN_ADDRESS
      }),
      requiredContracts: Object.freeze({
        opToken: OP_TOKEN_ADDRESS
      })
    })
  })
});
