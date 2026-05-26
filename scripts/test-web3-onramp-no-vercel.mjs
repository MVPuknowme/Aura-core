import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ||= '8453';
process.env.NEXT_PUBLIC_TREASURY_WALLET ||= '0xbAA5A03bC268546194550a427d3F1d5787c15403';
process.env.NEXT_PUBLIC_BASE_USDC ||= '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||= 'local-preview-only';

function mockReq({ method = 'GET', url = '/', query = {}, headers = {} } = {}) {
  return {
    method,
    url,
    query,
    headers: {
      host: 'localhost:7000',
      'user-agent': 'skygrid-no-vercel-test',
      ...headers
    },
    on(event, callback) {
      if (event === 'end') callback();
      return this;
    }
  };
}

function mockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: '',
    headers,
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
    },
    end(value = '') {
      this.body = String(value);
    }
  };
}

async function runHandler(label, modulePath, reqOptions, validate) {
  const mod = await import(modulePath);
  assert.equal(typeof mod.default, 'function', `${label} must export a default handler`);

  const req = mockReq(reqOptions);
  const res = mockRes();
  await mod.default(req, res);

  assert.equal(res.statusCode, 200, `${label} should return 200`);
  validate(res, label);
  console.log(`PASS ${label}`);
}

function expectJson(res, label) {
  const contentType = res.headers['content-type'] || '';
  assert.match(contentType, /application\/json/, `${label} must return JSON`);
  const parsed = JSON.parse(res.body);
  assert.equal(parsed.ok, true, `${label} JSON must set ok=true`);
  assert.notEqual(parsed.executionAllowed, true, `${label} must not allow execution`);
  return parsed;
}

function expectHtml(res, label) {
  const contentType = res.headers['content-type'] || '';
  assert.match(contentType, /text\/html/, `${label} must return HTML`);
  assert.match(res.body, /SkyGrid|SKYGRID|On-Ramp/i, `${label} must render SkyGrid on-ramp text`);
}

const demoId = 'demo-001';

await runHandler(
  'runtime home adapter',
  '../api/runtime.js',
  { url: '/' },
  (res) => expectHtml(res, 'runtime home adapter')
);

await runHandler(
  'web3 on-ramp page',
  '../api/web3/onramp-page.js',
  { url: '/web3/onramp' },
  (res) => expectHtml(res, 'web3 on-ramp page')
);

await runHandler(
  'web3 on-ramp detail page',
  '../api/web3/onramp/[onRampId]/page.js',
  { url: `/web3/onramp/${demoId}`, query: { onRampId: demoId } },
  (res) => expectHtml(res, 'web3 on-ramp detail page')
);

await runHandler(
  'web3 chain health',
  '../api/web3/chains/health.js',
  { url: '/api/web3/chains/health' },
  (res) => {
    const body = expectJson(res, 'web3 chain health');
    assert.equal(body.defaultChainId, 8453, 'default chain must be Base 8453');
    assert.equal(body.privateKeysAccepted, false, 'private keys must not be accepted');
  }
);

await runHandler(
  'web3 auto-drill selector',
  '../api/web3/onramp/auto-select.js',
  { url: '/api/web3/onramp/auto-select' },
  (res) => {
    const body = expectJson(res, 'web3 auto-drill selector');
    assert.equal(body.autoSelected, true, 'auto selector must mark autoSelected=true');
    assert.equal(body.selectedBy, 'auto_drill', 'on-ramp must be selected by Auto-Drill');
    assert.ok(body.selectedLane?.id, 'auto selector must choose a lane');
  }
);

await runHandler(
  'web3 on-ramp new',
  '../api/web3/onramp/new.js',
  { url: '/api/web3/onramp/new', method: 'GET' },
  (res) => {
    const body = expectJson(res, 'web3 on-ramp new');
    assert.equal(body.autoSelected, true, 'new on-ramp must be auto-selected');
    assert.equal(body.selectedBy, 'auto_drill', 'new on-ramp must be selected by Auto-Drill');
    assert.equal(body.custody, false, 'custody must be false');
    assert.equal(body.privateKeysAccepted, false, 'private keys must not be accepted');
  }
);

await runHandler(
  'web3 on-ramp detail',
  '../api/web3/onramp/[onRampId].js',
  { url: `/api/web3/onramp/${demoId}`, query: { onRampId: demoId } },
  (res) => {
    const body = expectJson(res, 'web3 on-ramp detail');
    assert.equal(body.onRampId, demoId, 'detail route must echo onRampId');
  }
);

await runHandler(
  'web3 on-ramp quote guard',
  '../api/web3/onramp/[onRampId]/quote.js',
  { url: `/api/web3/onramp/${demoId}/quote`, query: { onRampId: demoId } },
  (res) => {
    const body = expectJson(res, 'web3 on-ramp quote guard');
    assert.equal(body.quotePrepared, false, 'quote guard must not prepare executable quote');
  }
);

await runHandler(
  'web3 on-ramp tx guard',
  '../api/web3/onramp/[onRampId]/tx.js',
  { url: `/api/web3/onramp/${demoId}/tx`, query: { onRampId: demoId } },
  (res) => {
    const body = expectJson(res, 'web3 on-ramp tx guard');
    assert.equal(body.status, 'not_executable', 'tx route must be non-executable');
  }
);

await runHandler(
  'web3 on-ramp proof guard',
  '../api/web3/onramp/[onRampId]/proof.js',
  { url: `/api/web3/onramp/${demoId}/proof`, query: { onRampId: demoId } },
  (res) => {
    const body = expectJson(res, 'web3 on-ramp proof guard');
    assert.equal(body.proofWritten, false, 'proof route must not write live proof in local preview');
  }
);

console.log('SkyGrid Web3 On-Ramp no-Vercel validation complete');
