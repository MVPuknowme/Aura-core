'use strict';

const https = require('https');

const DEFAULT_CONNECTORS = [
  { id: 'jupiter-price-api', provider: 'jupiter', url: 'https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112', type: 'market-data', chain: 'solana' },
  { id: 'jupiter-token-api', provider: 'jupiter', url: 'https://lite-api.jup.ag/tokens/v1/tagged/verified', type: 'token-registry', chain: 'solana' },
  { id: 'coinbase-exchange-time', provider: 'coinbase', url: 'https://api.exchange.coinbase.com/time', type: 'exchange-status', chain: 'multi' },
  { id: 'coinbase-btc-usd', provider: 'coinbase', url: 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', type: 'market-data', chain: 'bitcoin' },
  { id: 'ethereum-rpc-cloudflare', provider: 'cloudflare', url: 'https://cloudflare-eth.com', type: 'rpc', chain: 'ethereum', method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] } },
  { id: 'base-public-rpc', provider: 'base', url: 'https://mainnet.base.org', type: 'rpc', chain: 'base', method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] } },
  { id: 'solana-public-rpc', provider: 'solana', url: 'https://api.mainnet-beta.solana.com', type: 'rpc', chain: 'solana', method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] } },
  { id: 'rainbow-home', provider: 'rainbow', url: 'https://rainbow.me', type: 'wallet-web', chain: 'evm' },
];

function probeConnector(connector, timeoutMs = Number(process.env.SKYGRID_CONNECTOR_TIMEOUT_MS || 4500)) {
  return new Promise((resolve) => {
    const started = Date.now();
    const body = connector.body ? JSON.stringify(connector.body) : null;
    const url = new URL(connector.url);

    const req = https.request({
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: connector.method || 'GET',
      timeout: timeoutMs,
      headers: body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {},
    }, (res) => {
      let bytes = 0;
      res.on('data', (chunk) => { bytes += chunk.length; });
      res.on('end', () => {
        const latency = Date.now() - started;
        resolve({
          ...connector,
          status: res.statusCode >= 200 && res.statusCode < 500 ? 'ok' : 'degraded',
          status_code: res.statusCode,
          avg_latency_ms: latency,
          bytes,
          device_role: 'node',
          is_validator: false,
          last_seen_ms: Date.now(),
        });
      });
    });

    req.on('timeout', () => req.destroy(new Error('request_timeout')));
    req.on('error', (error) => {
      resolve({
        ...connector,
        status: 'degraded',
        status_code: null,
        avg_latency_ms: Date.now() - started,
        error: error.message,
        device_role: 'node',
        is_validator: false,
        last_seen_ms: Date.now(),
      });
    });

    if (body) req.write(body);
    req.end();
  });
}

async function probeAllConnectors(connectors = DEFAULT_CONNECTORS) {
  const results = await Promise.all(connectors.map((connector) => probeConnector(connector)));
  return Object.fromEntries(results.map((result) => [result.id, result]));
}

function connectorsToConnections(connectorResults = {}) {
  return Object.values(connectorResults).map((connector) => ({
    id: connector.id,
    region: connector.provider,
    status: connector.status,
    avg_latency_ms: connector.avg_latency_ms,
    jitter_ms: 0,
    packet_loss_pct: connector.status === 'ok' ? 0 : 10,
    device_role: 'node',
    is_validator: false,
    provider: connector.provider,
    chain: connector.chain,
    type: connector.type,
  }));
}

module.exports = {
  DEFAULT_CONNECTORS,
  probeConnector,
  probeAllConnectors,
  connectorsToConnections,
};
