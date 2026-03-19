const p2pLayer2 = {
  layer: "layer2",
  transport: "tcp",
  network: "skygrid-main",
  discovery: {
    enabled: true,
    intervalMs: 5000,
    retryMs: 3000,
    maxPeers: 16
  },
  handshake: {
    protocol: "skygrid-hello",
    version: "1.0",
    requireAck: true
  },
  heartbeat: {
    enabled: true,
    intervalMs: 4000,
    timeoutMs: 12000
  },
  mesh: {
    mode: "peer",
    gossip: true,
    rebroadcast: false
  },
  security: {
    allowPrivateRanges: true,
    requireSignature: false,
    trustMode: "local-dev"
  },
  logging: {
    level: "info",
    trace: false
  }
};

module.exports = { p2pLayer2 };
