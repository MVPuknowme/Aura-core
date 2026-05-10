import fs from 'node:fs/promises';

const CONFIG_PATH = './config/validators.contracts.json';

const DEFAULT_RPCS = {
  Scroll: 'https://rpc.scroll.io',
  Base: 'https://mainnet.base.org',
  'Arbitrum One': 'https://arb1.arbitrum.io/rpc',
  Optimism: 'https://mainnet.optimism.io'
};

async function rpcCall(url, method, params = []) {
  const started = performance.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params
    })
  });

  const elapsed = Math.round(performance.now() - started);
  const json = await response.json();

  return {
    elapsed,
    json
  };
}

async function main() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);

  const validator = config.contracts.validatorContract;
  const rpc = DEFAULT_RPCS[validator.assumedNetwork];

  console.log('\nSKYGRID VALIDATOR HEALTH CHECK\n');

  console.log(`network=${validator.assumedNetwork}`);
  console.log(`contract=${validator.address}`);
  console.log(`rpc=${rpc}\n`);

  const chain = await rpcCall(rpc, 'eth_chainId');
  console.log(`chainId=${chain.json.result} latency=${chain.elapsed}ms`);

  const block = await rpcCall(rpc, 'eth_blockNumber');
  console.log(`block=${parseInt(block.json.result, 16)} latency=${block.elapsed}ms`);

  const code = await rpcCall(rpc, 'eth_getCode', [validator.address, 'latest']);

  const hasCode = code.json.result && code.json.result !== '0x';

  console.log(`contractCode=${hasCode ? 'present' : 'missing'} latency=${code.elapsed}ms`);

  const report = {
    timestamp: new Date().toISOString(),
    network: validator.assumedNetwork,
    contract: validator.address,
    chainId: chain.json.result,
    latestBlock: parseInt(block.json.result, 16),
    contractCodePresent: hasCode,
    latencyMs: {
      chainId: chain.elapsed,
      block: block.elapsed,
      contractCode: code.elapsed
    },
    explorer: `${config.networkFocus.explorer}/address/${validator.address}`,
    mode: 'read-only-verification'
  };

  await fs.mkdir('./reports', { recursive: true });
  await fs.writeFile('./reports/validator-health.json', JSON.stringify(report, null, 2));

  console.log('\nreport=./reports/validator-health.json\n');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
