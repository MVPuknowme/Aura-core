const NETWORK_MAP = {
  ethereum: {
    chainId: 1,
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
    api: 'https://api.etherscan.io/v2/api'
  },
  base: {
    chainId: 8453,
    rpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    api: 'https://api.etherscan.io/v2/api'
  },
  optimism: {
    chainId: 10,
    rpc: 'https://mainnet.optimism.io',
    explorer: 'https://optimistic.etherscan.io',
    api: 'https://api.etherscan.io/v2/api'
  },
  arbitrum: {
    chainId: 42161,
    rpc: 'https://arb1.arbitrum.io/rpc',
    explorer: 'https://arbiscan.io',
    api: 'https://api.etherscan.io/v2/api'
  },
  polygon: {
    chainId: 137,
    rpc: 'https://polygon-rpc.com',
    explorer: 'https://polygonscan.com',
    api: 'https://api.etherscan.io/v2/api'
  },
  scroll: {
    chainId: 534352,
    rpc: 'https://rpc.scroll.io',
    explorer: 'https://scrollscan.com',
    api: 'https://api.etherscan.io/v2/api'
  }
};

function getNetworkConfig(network) {
  const key = String(network || '').toLowerCase();
  const config = NETWORK_MAP[key];

  if (!config) {
    throw new Error(`Unsupported network: ${network}`);
  }

  return config;
}

function buildExplorerAddressUrl(network, address) {
  const { explorer } = getNetworkConfig(network);
  return `${explorer}/address/${address}`;
}

function buildApiUrl(network, params = {}) {
  const { api, chainId } = getNetworkConfig(network);
  const search = new URLSearchParams({
    chainid: String(chainId),
    ...Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null)
    )
  });

  return `${api}?${search.toString()}`;
}

module.exports = {
  NETWORK_MAP,
  getNetworkConfig,
  buildExplorerAddressUrl,
  buildApiUrl,
};
