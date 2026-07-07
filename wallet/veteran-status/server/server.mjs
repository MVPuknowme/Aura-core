import 'dotenv/config';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { nanoid } from 'nanoid';
import { PKPass } from 'passkit-generator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT || 8787);
const PRODUCT = 'SKYGRID Veteran Status Wallet Pass';

const MODEL_PATH = path.join(__dirname, 'pass-models', 'VeteranStatus.pass');

// 1x1 PNG placeholders keep this repo text-only through GitHub's contents API.
// Replace these with authorized, production-quality Wallet pass art before release.
const PLACEHOLDER_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l9Qj6wAAAABJRU5ErkJggg==';

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function publicBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
}

function safeDemoProfile() {
  return {
    displayName: process.env.DEMO_DISPLAY_NAME || 'Demo Veteran',
    serviceSummary: process.env.DEMO_SERVICE_SUMMARY || 'United States Uniformed Services',
  };
}

function assertNoSensitiveProfileFields(profile) {
  const serialized = JSON.stringify(profile).toLowerCase();
  const blockedSignals = [
    'dod id',
    'disability rating',
    'ssn',
    'social security',
    'dd-214',
    'claim',
    'medical',
    'date of birth',
    'birthdate',
  ];

  for (const signal of blockedSignals) {
    if (serialized.includes(signal)) {
      throw new Error(`Blocked sensitive Wallet payload signal: ${signal}`);
    }
  }
}

async function ensurePlaceholderAssets() {
  const buffer = Buffer.from(PLACEHOLDER_PNG_BASE64, 'base64');
  const assetNames = ['icon.png', 'icon@2x.png', 'logo.png', 'logo@2x.png'];

  await fs.mkdir(MODEL_PATH, { recursive: true });
  await Promise.all(assetNames.map(async (assetName) => {
    const assetPath = path.join(MODEL_PATH, assetName);
    try {
      await fs.access(assetPath);
    } catch {
      await fs.writeFile(assetPath, buffer);
    }
  }));
}

async function readCertificateBundle() {
  const passCertPath = path.resolve(__dirname, requiredEnv('PASS_CERT_PATH'));
  const passKeyPath = path.resolve(__dirname, requiredEnv('PASS_KEY_PATH'));
  const wwdrCertPath = path.resolve(__dirname, requiredEnv('WWDR_CERT_PATH'));

  const [signerCert, signerKey, wwdr] = await Promise.all([
    fs.readFile(passCertPath),
    fs.readFile(passKeyPath),
    fs.readFile(wwdrCertPath),
  ]);

  return {
    signerCert,
    signerKey,
    wwdr,
    signerKeyPassphrase: process.env.PASS_KEY_PASSPHRASE || undefined,
  };
}

function passOverrides({ serialNumber, authToken }) {
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt);
  expiresAt.setUTCMonth(expiresAt.getUTCMonth() + 6);

  return {
    passTypeIdentifier: requiredEnv('PASS_TYPE_IDENTIFIER'),
    teamIdentifier: requiredEnv('TEAM_IDENTIFIER'),
    organizationName: process.env.ORGANIZATION_NAME || 'SKYGRID Veteran Wallet Pilot',
    description: 'Veteran Status verification pass',
    serialNumber,
    authenticationToken: authToken,
    webServiceURL: `${publicBaseUrl()}/api/wallet/passkit`,
    relevantDate: issuedAt.toISOString(),
    expirationDate: expiresAt.toISOString(),
  };
}

function addSafeFields(pass, { displayName, serviceSummary, serialNumber }) {
  const verifyUrl = `${publicBaseUrl()}/verify/veteran-status/${encodeURIComponent(serialNumber)}`;

  pass.primaryFields.push({ key: 'status', label: 'STATUS', value: 'Verified Veteran' });
  pass.secondaryFields.push({ key: 'name', label: 'NAME', value: displayName });
  pass.auxiliaryFields.push({ key: 'service', label: 'SERVICE', value: serviceSummary });
  pass.auxiliaryFields.push({ key: 'issuer', label: 'ISSUER', value: 'SKYGRID / Aura pilot' });

  pass.backFields.push({
    key: 'boundary',
    label: 'Credential boundary',
    value: 'This pass is a privacy-preserving veteran-status pilot card. It is not an official VA, DoD, or government identity credential unless issued through an authorized government program.',
  });

  pass.backFields.push({
    key: 'privacy',
    label: 'Privacy profile',
    value: 'Wallet stores only minimal status display fields and an opaque verification token. Sensitive identifiers and benefit/medical data must remain out of the pass and QR payload.',
  });

  pass.setBarcodes({
    message: verifyUrl,
    format: 'PKBarcodeFormatQR',
    messageEncoding: 'iso-8859-1',
    altText: 'Verify status',
  });
}

async function buildVeteranStatusPass(profile) {
  assertNoSensitiveProfileFields(profile);
  await ensurePlaceholderAssets();

  const serialNumber = `vsc-${nanoid(18)}`;
  const authToken = nanoid(48);
  const certificates = await readCertificateBundle();

  const pass = await PKPass.from(
    {
      model: MODEL_PATH,
      certificates,
    },
    passOverrides({ serialNumber, authToken })
  );

  addSafeFields(pass, { ...profile, serialNumber });
  return pass.getAsBuffer();
}

app.disable('x-powered-by');

app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    product: PRODUCT,
    mode: 'passkit_pilot',
    endpoint: '/api/wallet/veteran-pass',
    sensitive_data_policy: 'minimal_status_only',
    timestamp: new Date().toISOString(),
  });
});

app.get(['/api/wallet/veteran-pass', '/wallet/veteran-status/demo.pkpass'], async (_req, res) => {
  try {
    const profile = safeDemoProfile();
    const pkpass = await buildVeteranStatusPass(profile);

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', 'attachment; filename="veteran-status.pkpass"');
    res.send(Buffer.from(pkpass));
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({
      ok: false,
      product: PRODUCT,
      error: 'pass_generation_failed',
      detail: error.message,
      required_certificate_lane: 'Apple Wallet Pass Type ID certificate, not ALD',
    });
  }
});

app.get('/verify/veteran-status/:token', (req, res) => {
  // Production should verify the opaque token against server-side issuance records.
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    valid: true,
    status: 'verified_veteran',
    issuer: 'SKYGRID / Aura pilot',
    token_reference: String(req.params.token).slice(0, 12),
    sensitive_profile_fields_returned: false,
    timestamp: new Date().toISOString(),
  });
});

app.listen(port, () => {
  console.log(`${PRODUCT} listening on http://localhost:${port}`);
});
