function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-Aura-Core-AI', 'preflight');
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return Object.fromEntries(new URLSearchParams(req.body)); }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return Object.fromEntries(new URLSearchParams(raw)); }
}

function sanitize(value, fallback) {
  const clean = String(value || fallback || '')
    .trim()
    .replace(/[^a-zA-Z0-9._:/?#=& -]/g, '')
    .slice(0, 180);
  return clean || fallback;
}

function classifyBaseRate() {
  const baseGasGwei = Number(process.env.BASE_GAS_GWEI || 1);
  const l1SecurityFeeUsd = Number(process.env.BASE_L1_SECURITY_FEE_USD || 0.02);
  const blobFeeTrendPct = Number(process.env.BASE_BLOB_FEE_TREND_PCT || 0);
  const sevenDayGasTrendPct = Number(process.env.BASE_7D_GAS_TREND_PCT || 0);
  const pressureScore = Math.round(
    baseGasGwei * 1.5 +
      l1SecurityFeeUsd * 10 +
      blobFeeTrendPct * 0.6 +
      sevenDayGasTrendPct * 0.8
  );

  if (pressureScore >= 35) return { band: 'red', pressureScore, utilizationMarkupPct: '7.5%' };
  if (pressureScore >= 12) return { band: 'yellow', pressureScore, utilizationMarkupPct: '5.0%' };
  return { band: 'green', pressureScore, utilizationMarkupPct: '3.5%' };
}

function classifyPreflight(input) {
  const type = sanitize(input.type || input.assetType, 'website').toLowerCase();
  const amountUsd = Number(input.amountUsd || input.amount || 0);
  const base = classifyBaseRate();
  const notes = sanitize(input.notes, '');
  const hasAsset = Boolean(input.asset || input.endpoint || input.domain || input.deviceId || input.wallet);

  let readiness = 'ready';
  let riskLevel = base.band;
  let recommendedAction = 'Proceed with advisory preflight validation and record proof before activation.';

  if (!hasAsset) {
    readiness = 'needs_attention';
    riskLevel = riskLevel === 'red' ? 'red' : 'yellow';
    recommendedAction = 'Provide an asset, endpoint, deviceId, domain, route, or wallet reference before partner review.';
  }

  if (['payment', 'device', 'wallet'].includes(type)) {
    readiness = 'advisory_only';
    recommendedAction = 'Use quote/device-link staging only. Do not activate payment, wallet, or device entitlement until backend verification is complete.';
  }

  if (amountUsd > 10000) {
    readiness = 'partner_review_required';
    riskLevel = 'yellow';
    recommendedAction = 'Large settlement planning requires partner review and verified approval before live routing or payment work.';
  }

  if (base.band === 'red') {
    readiness = readiness === 'ready' ? 'needs_attention' : readiness;
    riskLevel = 'red';
    recommendedAction = 'Base/network pressure is elevated. Batch, delay, or keep the workflow advisory until rates normalize.';
  }

  if (/live|production|activate|entitlement/i.test(notes)) {
    readiness = readiness === 'ready' ? 'partner_review_required' : readiness;
    recommendedAction = 'Production activation language detected. Require operator approval, compliance review, and verified backend records.';
  }

  return { readiness, riskLevel, recommendedAction, base };
}

function buildPreflight(req, input) {
  const url = new URL(req.url, `https://${req.headers.host || 'aura-core.local'}`);
  const merged = Object.fromEntries(url.searchParams.entries());
  Object.assign(merged, input || {});

  const asset = sanitize(merged.asset || merged.endpoint || merged.domain || merged.deviceId || merged.wallet, 'unsubmitted-asset');
  const type = sanitize(merged.type || merged.assetType, 'website').toLowerCase();
  const amountUsd = merged.amountUsd || merged.amount || null;
  const decision = classifyPreflight({ ...merged, asset, type, amountUsd });

  return {
    ok: true,
    status: 'preflight_ready',
    service: 'Aura-Core AI Preflight Engine',
    mode: 'advisory_preflight',
    asset,
    type,
    amountUsd: amountUsd === null ? null : Number(amountUsd).toFixed(2),
    readiness: decision.readiness,
    riskLevel: decision.riskLevel,
    recommendedAction: decision.recommendedAction,
    rateBand: decision.base.band,
    pressureScore: decision.base.pressureScore,
    utilizationMarkupPct: decision.base.utilizationMarkupPct,
    sunPayReady: true,
    stripeDeviceLinkReady: 'staged',
    liveRoutingEnabled: false,
    moneyMovementEnabled: false,
    deviceEntitlementEnabled: false,
    nextRoutes: [
      '/health.json',
      '/api/highway/status',
      '/api/pay/quote?amount=25',
      '/api/stripe/device-link',
      '/api/intake'
    ],
    guardrails: [
      'Advisory decision only',
      'No money moved',
      'No transaction signing',
      'No automatic network routing',
      'No device entitlement activation without verified backend confirmation'
    ],
    generatedAt: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === 'GET') {
    return sendJson(res, 200, buildPreflight(req, {}));
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return sendJson(res, 405, {
      ok: false,
      status: 'method_not_allowed',
      message: 'Use GET for a sample preflight decision or POST JSON for an asset-specific decision.'
    });
  }

  const body = await readBody(req);
  return sendJson(res, 200, buildPreflight(req, body));
}
