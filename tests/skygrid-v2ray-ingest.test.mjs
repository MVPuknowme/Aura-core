import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  assertAllowedSource,
  run,
  validateFeedText
} from '../scripts/skygrid-v2ray-ingest.mjs';

test('accepts the exact allowlisted Barry-far raw subscription source', () => {
  assert.equal(
    assertAllowedSource('https://raw.githubusercontent.com/barry-far/V2ray-Config/main/All_Configs_Sub.txt'),
    'https://raw.githubusercontent.com/barry-far/V2ray-Config/main/All_Configs_Sub.txt'
  );
});

test('accepts the reviewed immutable snapshot but rejects arbitrary revisions and URL variants', () => {
  const pinned = 'https://raw.githubusercontent.com/barry-far/V2ray-Config/8a01d90f48a5432b174c714efbc3181903ecf578/All_Configs_Sub.txt';
  assert.equal(assertAllowedSource(pinned), pinned);
  for (const source of [
    pinned.replace('8a01d90f48a5432b174c714efbc3181903ecf578', '0'.repeat(40)),
    `${pinned}?raw=1`, `${pinned}#fragment`,
    pinned.replace('raw.githubusercontent.com/', 'raw.githubusercontent.com:444/'),
    pinned.replace('barry-far/', 'other-owner/')
  ]) assert.throws(() => assertAllowedSource(source), /not allowlisted/);
});

test('default fetch rejects changed snapshot bytes without writing a success receipt', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'v2ray-pin-'));
  try {
    await assert.rejects(
      run([`--receipt=${path.join(directory, 'receipt.json')}`], {
        fetchImpl: async () => new Response('vless://id@example.test:443\n'),
        logger: { log() {} }
      }),
      /Pinned V2Ray snapshot SHA-256 mismatch/
    );
    assert.deepEqual(await readdir(directory), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('case variants of the pinned URL cannot bypass its digest check', async () => {
  const source = 'https://raw.githubusercontent.com/Barry-Far/V2ray-Config/8a01d90f48a5432b174c714efbc3181903ecf578/All_Configs_Sub.txt';
  await assert.rejects(run([`--source=${source}`, '--no-receipt'], {
    fetchImpl: async () => new Response('vless://id@example.test:443\n'),
    logger: { log() {} }
  }), /Pinned V2Ray snapshot SHA-256 mismatch/);
});

test('explicit tracking branch is labeled separately from a pinned snapshot', async () => {
  const result = await run(['--source=https://raw.githubusercontent.com/barry-far/V2ray-Config/main/All_Configs_Sub.txt', '--no-receipt'], {
    fetchImpl: async () => new Response('vless://id@example.test:443\n'),
    logger: { log() {} }
  });
  assert.equal(result.receipt.source.selection, 'tracking_branch');
  assert.equal(result.receipt.source.revision, null);
  assert.equal(result.receipt.authority.proxy_activation_allowed, false);
});

test('binary-like upstream contamination still rejects the whole feed', () => {
  assert.throws(() => validateFeedText('#profile-title: test\n\u00d1\u00f2\t\u0005\u0088\nvless://id@example.test:443\n'), /unsupported or malformed schemes/);
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
