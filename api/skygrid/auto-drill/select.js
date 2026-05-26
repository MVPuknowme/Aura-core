// SkyGrid Auto-Drill Sentinel Selector
// (c) MVPuknowme/Aura-core 2026
// API returns JSON only. No private keys, seeds, or covert identifiers. See docs/skygrid/auto-drill-sentinel-selector.md.

/**
 * Node profile input sample:
 *   See examples/skygrid/auto-drill-node-sample.json
 *
 * API output:
 *   {
 *     selectedRole, bestPrimaryRoute, bestFailoverRoute, canProvideNetwork, canProvideCompute,
 *     canServeAsValidator, leaseEligible, leaseReason, scoreBreakdown, sentinelStatus
 *   }
 */

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const profile = req.body;

  // Input validation (only check for reasonable types/range)
  const requireKeys = [
    'nodeId','rolePreference','connectionTypes','speedMbps','latencyMs','uptimePct','reliabilityScore',
    'hasSolarBackup','hasBatteryBackup','availableCpuPct','availableStorageGb','availableBandwidthMbps',
    'gpsServiceZone','neighborhoodPriority','accessibilityPriority','timeOfDayAvailability','maxLeaseHoursPerDay'
  ];
  for (const k of requireKeys) {
    if (!(k in profile)) {
      return res.status(400).json({ error: `Missing '${k}' in node profile` });
    }
  }

  // Scoring Constants
  const weights = {
    wifi_mesh: 20,
    coax: 12,
    dsl: 10,
    fiber: 16,
    satellite: 4,
    cellular: 6,
    web3_l2: 8
  };

  // Route Scoring
  const connScores = profile.connectionTypes.map(t => ({
    type: t, score: weights[t] || 0
  }));
  connScores.sort((a, b) => b.score - a.score);
  const bestPrimaryRoute = connScores[0]?.type || null;
  const bestFailoverRoute = (connScores.find(c => c.type === 'satellite') && bestPrimaryRoute !== 'satellite') ? 'satellite' : null;

  // Backup/Resilience
  let resilienceScore = 0;
  if (profile.hasSolarBackup) resilienceScore += 5;
  if (profile.hasBatteryBackup) resilienceScore += 5;

  // Role Boosts & Priority Zones
  let zonePriority = 0;
  if (profile.neighborhoodPriority && Number(profile.neighborhoodPriority) > 0) {
    zonePriority += profile.neighborhoodPriority;
  }
  if (profile.accessibilityPriority && Number(profile.accessibilityPriority) > 0) {
    zonePriority += 2 * profile.accessibilityPriority;
  }

  // Generic scoring
  const perfScore =   (Number(profile.speedMbps) / 10)
                    + (Number(profile.uptimePct) / 10)
                    + (100 - Math.min(Number(profile.latencyMs),100)) / 10
                    + (Number(profile.reliabilityScore) / 5)
                    + (profile.availableCpuPct / 8)
                    + (profile.availableBandwidthMbps / 20)
                    + resilienceScore
                    + zonePriority;

  // Role selection
  let selectedRole = 'consumer';
  let canProvideNetwork = false;
  let canProvideCompute = false;
  let canServeAsValidator = false;
  let leaseEligible = false;
  let leaseReason = '';
  let sentinelStatus = 'not_eligible';
  const breakdown = {
    perfScore: Number(perfScore.toFixed(1)),
    resilienceScore,
    zonePriority,
    bestPrimaryRoute,
    bestFailoverRoute,
    availableCpuPct: profile.availableCpuPct,
    availableStorageGb: profile.availableStorageGb,
    availableBandwidthMbps: profile.availableBandwidthMbps
  };

  // Consumer/Provider/Compute/Validator/autopilot logic
  if (profile.rolePreference === 'provider' ||
      (profile.rolePreference === 'auto' && perfScore > 40  && profile.availableBandwidthMbps > 50 && ['fiber','wifi_mesh','coax'].some(t => profile.connectionTypes.includes(t)) )) {
    selectedRole = 'provider';
    canProvideNetwork = true;
    if (profile.availableCpuPct > 30 && profile.availableStorageGb > 100) canProvideCompute = true;
    leaseEligible = perfScore > 40 && bestPrimaryRoute === 'fiber';
    leaseReason = leaseEligible ? 'High-performance fiber, stable uptime' : 'Not optimal for lease';
    sentinelStatus = leaseEligible ? 'advisory_ready' : 'fail_closed';
  } else if (profile.rolePreference === 'compute' ||
             (profile.rolePreference === 'auto' && profile.availableCpuPct > 50 && profile.availableStorageGb > 200)) {
    selectedRole = 'compute';
    canProvideCompute = true;
    leaseEligible = false;
    leaseReason = 'Compute node only';
    sentinelStatus = 'advisory_ready';
  } else if (profile.rolePreference === 'validator' ||
             (profile.rolePreference === 'auto' && profile.connectionTypes.includes('web3_l2') && profile.reliabilityScore > 80)) {
    selectedRole = 'validator';
    canServeAsValidator = true;
    leaseEligible = false;
    leaseReason = 'Validator candidate via Web3 L2';
    sentinelStatus = 'advisory_ready';
  } else if (profile.rolePreference === 'consumer' ||
             (profile.rolePreference === 'auto')) {
    selectedRole = 'consumer';
    leaseEligible = false;
    leaseReason = 'Insufficient performance/resource for upstream roles';
    sentinelStatus = perfScore > 35 ? 'advisory_ready' : 'fail_closed';
  }

  // Final eligibility/backstop
  if (profile.uptimePct < 80 || profile.reliabilityScore < 70) {
    sentinelStatus = 'fail_closed';
    leaseEligible = false;
    canProvideNetwork = false;
    canProvideCompute = false;
    canServeAsValidator = false;
    leaseReason = 'Low uptime/reliability';
  }

  res.json({
    selectedRole,
    bestPrimaryRoute,
    bestFailoverRoute,
    canProvideNetwork,
    canProvideCompute,
    canServeAsValidator,
    leaseEligible,
    leaseReason,
    scoreBreakdown: breakdown,
    sentinelStatus
  });
};
