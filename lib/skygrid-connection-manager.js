'use strict';

const DEFAULT_LIMITS = {
  maxActive: Number(process.env.SKYGRID_MAX_ACTIVE_CONNECTIONS || 3),
  maxPhoneHeld: Number(process.env.SKYGRID_MAX_PHONE_HELD_CONNECTIONS || 2),
  scoreThreshold: Number(process.env.SKYGRID_CONNECTION_SCORE_THRESHOLD || 250),
  staleMs: Number(process.env.SKYGRID_CONNECTION_STALE_MS || 120000),
};

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function scoreConnection(conn) {
  const latency = normalizeNumber(conn.avg_latency_ms ?? conn.latency_ms, 999);
  const jitter = normalizeNumber(conn.jitter_ms, 0);
  const packetLoss = normalizeNumber(conn.packet_loss_pct, conn.packet_loss || 0);
  const batteryPenalty = conn.device_role === 'phone' ? 25 : 0;
  const validatorPenalty = conn.is_validator === true && conn.device_role === 'phone' ? 75 : 0;
  const stalePenalty = conn.last_seen_ms && Date.now() - Number(conn.last_seen_ms) > DEFAULT_LIMITS.staleMs ? 100 : 0;
  const healthPenalty = conn.status === 'ok' ? 0 : 500;

  return latency + jitter * 2 + packetLoss * 10 + batteryPenalty + validatorPenalty + stalePenalty + healthPenalty;
}

function buildConnectionPlan(connections, limits = DEFAULT_LIMITS) {
  const normalized = (connections || []).map((conn) => ({
    ...conn,
    id: conn.id || conn.region || conn.node_id || conn.name,
    score: scoreConnection(conn),
  })).filter((conn) => conn.id);

  const sorted = normalized.sort((a, b) => a.score - b.score);
  const healthy = sorted.filter((conn) => conn.status === 'ok' && conn.score <= limits.scoreThreshold);
  const keep = healthy.slice(0, limits.maxActive);
  const keepIds = new Set(keep.map((conn) => conn.id));
  const drop = sorted.filter((conn) => !keepIds.has(conn.id));

  const phoneHeld = keep.filter((conn) => conn.device_role === 'phone');
  if (phoneHeld.length > limits.maxPhoneHeld) {
    const overflow = phoneHeld.slice(limits.maxPhoneHeld);
    overflow.forEach((conn) => {
      keepIds.delete(conn.id);
    });
  }

  const finalKeep = sorted.filter((conn) => keepIds.has(conn.id));
  const finalDrop = sorted.filter((conn) => !keepIds.has(conn.id));

  return {
    mode: 'adaptive-soft-handler',
    policy: {
      max_active_connections: limits.maxActive,
      max_phone_held_connections: limits.maxPhoneHeld,
      score_threshold: limits.scoreThreshold,
      stale_ms: limits.staleMs,
    },
    active: finalKeep.map((conn) => ({ id: conn.id, score: conn.score, role: conn.device_role || 'node', action: 'keep' })),
    disconnect: finalDrop.map((conn) => ({ id: conn.id, score: conn.score, role: conn.device_role || 'node', action: 'drop_or_burst_only' })),
    burst_only: finalDrop.filter((conn) => conn.status === 'ok').map((conn) => conn.id),
    coordinator_note: 'Phone should coordinate route selection only; validator and relay load should stay on nodes/AWS/local mesh.',
  };
}

function regionsToConnections(regions = {}) {
  return Object.values(regions).map((region) => ({
    id: region.region,
    region: region.region,
    status: region.status,
    avg_latency_ms: region.avg_latency_ms,
    packet_loss_pct: region.packet_loss_pct || 0,
    jitter_ms: region.jitter_ms || 0,
    device_role: region.region && region.region.includes('local') ? 'phone' : 'node',
    is_validator: false,
  }));
}

module.exports = {
  DEFAULT_LIMITS,
  scoreConnection,
  buildConnectionPlan,
  regionsToConnections,
};
