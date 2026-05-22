function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('X-SkyGrid-Network', 'Aura-Core');
  res.setHeader('X-SkyGrid-Intake', 'runtime-contract');
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

function clean(value, fallback = '') {
  return String(value || fallback)
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 500);
}

function cleanEmail(value) {
  const email = clean(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function normalizeIntake(body) {
  return {
    fullName: clean(body.fullName || body.name || body.contactName),
    email: cleanEmail(body.email || body.contactEmail),
    organization: clean(body.organization || body.company || body.org),
    partnerType: clean(body.partnerType || body.type || 'unspecified'),
    networkInterest: clean(body.networkInterest || body.network || 'SkyGrid / Aura-Core'),
    locationRegion: clean(body.locationRegion || body.location || body.region),
    currentInfrastructure: clean(body.currentInfrastructure || body.infrastructure),
    desiredUseCase: clean(body.desiredUseCase || body.useCase || body.notes),
    proofPacketNeeded: clean(body.proofPacketNeeded || body.proofPacket || 'Unknown'),
    additionalNotes: clean(body.additionalNotes || body.notes)
  };
}

function classifyReceipt(intake) {
  const needsContact = !intake.fullName || !intake.email;
  const proofRequested = /yes|true|needed|request/i.test(intake.proofPacketNeeded);
  const partnerReview = /partner|validator|infrastructure|web3|base|stripe|payment|device/i.test(
    `${intake.partnerType} ${intake.networkInterest} ${intake.desiredUseCase}`
  );

  return {
    status: needsContact ? 'needs_contact_info' : 'received',
    proofPacketRequested: proofRequested,
    partnerReviewRequired: partnerReview,
    next: needsContact ? '/contact' : '/highway'
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
    return sendJson(res, 200, {
      ok: true,
      status: 'ready',
      service: 'SkyGrid Intake API',
      route: '/api/intake',
      method: 'POST',
      mode: 'advisory_preflight',
      requiredFields: ['fullName', 'email'],
      acceptedFields: [
        'fullName',
        'email',
        'organization',
        'partnerType',
        'networkInterest',
        'locationRegion',
        'currentInfrastructure',
        'desiredUseCase',
        'proofPacketNeeded',
        'additionalNotes'
      ],
      guardrails: [
        'Receives intake only',
        'Does not create contracts',
        'Does not move funds',
        'Does not activate devices',
        'Operator review required for partner actions'
      ]
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return sendJson(res, 405, {
      ok: false,
      status: 'method_not_allowed',
      message: 'Use POST JSON to submit a SkyGrid intake request.'
    });
  }

  const body = await readBody(req);
  const intake = normalizeIntake(body);
  const receipt = classifyReceipt(intake);
  const statusCode = receipt.status === 'received' ? 201 : 400;

  return sendJson(res, statusCode, {
    ok: receipt.status === 'received',
    status: receipt.status,
    service: 'SkyGrid Intake API',
    submissionId: `sg_${Date.now().toString(36)}`,
    intake,
    proofPacketRequested: receipt.proofPacketRequested,
    partnerReviewRequired: receipt.partnerReviewRequired,
    next: receipt.next,
    guardrails: [
      'Submission received for review only',
      'No financial activity initiated',
      'No production routing activated',
      'No device entitlement granted',
      'Human/operator approval required for next step'
    ],
    receivedAt: new Date().toISOString()
  });
}
