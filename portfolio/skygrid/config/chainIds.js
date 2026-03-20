const CHAIN_IDS = {
  ethereum: 1,
  base: 8453,
  optimism: 10,
  arbitrum: 42161,
  polygon: 137,
  scroll: 534352
};

function getChainId(network) {
  if (!CHAIN_IDS[network]) {
    throw new Error(`Unsupported chain: ${network}`);
  }
  return CHAIN_IDS[network];
}

module.exports = {
  CHAIN_IDS,
  getChainId,
};
