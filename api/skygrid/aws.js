// SkyGrid AWS Link: Safe Advisory Preflight (Phase 1)
// Returns mock/advisory status only - no real AWS access/trusts

module.exports = async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }
  res.json({
    ok: true,
    service: 'SkyGrid AWS Link',
    mode: 'advisory_preflight',
    awsConfigured: true,
    connected: false,
    executionAllowed: false,
    roleAssumptionAllowed: false,
    sentinel: 'fail_closed'
  });
};
