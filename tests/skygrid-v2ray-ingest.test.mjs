import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertAllowedSource,
  validateFeedText
} from '../scripts/skygrid-v2ray-ingest.mjs';

test('accepts the exact allowlisted Barry-far raw subscription source', () => {
  assert.equal(
    assertAllowedSource('https://raw.githubusercontent.com/barry-far/V2ray-Config/main/All_Configs_Sub.txt'),
    'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/All_Configs_Sub.txt'
  );
});

test('rejects a non-allowlisted upstream', () => {
  assert.throws(
    () => assertAllowedSource('https://example.com/All_Configs_Sub.txt'),
    /not allowlisted/
  );
});

test('validates supported protocols without exposing endpoint content in the result', () => {
  const text = [
    '#profile-title: test',
    'vless://id@example.test:443#one',
    'vmess://ZmFrZQ==',
    'hysteria2://token@example.test:443#two',
    'ss://ZmFrZQ==@example.test:443#three',
    'vless://id@example.test:443#one'
  ].join('\n');

  const result = validateFeedText(text, { minConfigs: 4 });
  assert.equal(result.config_count, 5);
  assert.equal(result.unique_config_count, 4);
  assert.equal(result.duplicate_count, 1);
  assert.deepEqual(result.protocols, { vmess: 1, vless: 2, ss: 1, hysteria2: 1 });
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(result).includes('example.test'), false);
});

test('fails closed on malformed or unsupported schemes', () => {
  assert.throws(
    () => validateFeedText('vless://ok\nhttp://not-a-proxy-config\n'),
    /unsupported or malformed schemes: http:1/
  );
});


test('reports line numbers for missing schemes while remaining fail closed', () => {
  const text = [
    '#profile-title: test',
    'vless://ok',
    'metadata-without-scheme'
  ].join('\n');

  assert.throws(
    () => validateFeedText(text),
    /unsupported or malformed schemes: <missing>:1 \(line 3\)/
  );
});
