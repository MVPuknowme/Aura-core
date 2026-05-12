import fs from 'node:fs/promises';

const CONFIG_PATH = 'config/integrations/postman-skygrid-control.json';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoSecretLikeValues(value, path = 'root') {
  if (typeof value === 'string') {
    const suspiciousPatterns = [
      /Bearer\\s+[A-Za-z0-9._\\-]+/i,
      /postman[-_]?api[-_]?key/i,
      /x-api-key/i,
      /secret/i,
      /seed phrase/i,
      /private key/i,
      /sk_live_/i,
      /pk_live_/i,
      /ghp_[A-Za-z0-9_]+/i
    ];

    for (const pattern of suspiciousPatterns) {
      assert(!pattern.test(value), `Potential secret-like value found at ${path}`);
    }
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoSecretLikeValues(item, `${path}[${index}]`));
  } else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      assertNoSecretLikeValues(nested, `${path}.${key}`);
    }
  }
}

async function main() {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);

  assert(config.name === 'Postman ASG Aura Sky Grid Control Layer', 'Unexpected integration name');
  assert(config.type === 'postman-request-reference', 'Unexpected integration type');
  assert(config.status === 'linked-reference-pending-review', 'Integration should remain pending review');

  assert(config.safeDefaults?.noSecretsInRepo === true, 'noSecretsInRepo must be true');
  assert(config.safeDefaults?.noPrivateKeys === true, 'noPrivateKeys must be true');
  assert(config.safeDefaults?.noSeedPhrases === true, 'noSeedPhrases must be true');
  assert(config.safeDefaults?.readOnlyFirst === true, 'readOnlyFirst must be true');

  assert(config.recommendedBindings?.siteHealth === '/api/health', 'siteHealth binding missing');
  assert(config.recommendedBindings?.revStatus === '/api/rev/status', 'revStatus binding missing');

  assert(Array.isArray(config.reviewChecklist), 'reviewChecklist must be an array');

  assertNoSecretLikeValues(config);

  console.log('Postman SkyGrid integration reference verified');
}

main().catch((error) => {
  console.error('Postman SkyGrid integration verification failed');
  console.error(error.message);
  process.exit(1);
});
