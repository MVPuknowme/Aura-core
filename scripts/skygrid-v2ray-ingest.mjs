#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Recovery snapshot: tracking main contains malformed binary-like input.
// Refresh this revision and digest together after validating the complete feed.
export const PINNED_SOURCE_REVISION = '8a01d90f48a5432b174c714efbc3181903ecf578';
export const PINNED_SOURCE_SHA256 = 'abea0ee15ae8e6c7f94ecf6cbc98a02ec7f143a1b0be157ae215d169bcf60936';
export const DEFAULT_SOURCE = `https://raw.githubusercontent.com/barry-far/V2ray-Config/${PINNED_SOURCE_REVISION}/All_Configs_Sub.txt`;
export const DEFAULT_RECEIPT = 'artifacts/pnpk/v2ray/skygrid-v2ray-ingest-receipt.json';
export const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const ALLOWED_SCHEMES = Object.freeze([
  'vmess',
  'vless',
  'trojan',
  'ss',
  'ssr',
  'hy2',
  'hysteria2',
  'tuic',
  'warp',
  'socks'
]);

export function parseArgs(argv = []) {
  const args = {
    source: DEFAULT_SOURCE,
    file: null,
    receipt: DEFAULT_RECEIPT,
    writeReceipt: true,
    minConfigs: 1
  };

  for (const arg of argv) {
    if (arg.startsWith('--source=')) args.source = arg.slice('--source='.length);
    else if (arg.startsWith('--file=')) args.file = arg.slice('--file='.length);
    else if (arg.startsWith('--receipt=')) args.receipt = arg.slice('--receipt='.length);
    else if (arg.startsWith('--min-configs=')) args.minConfigs = Number(arg.slice('--min-configs='.length));
    else if (arg === '--no-receipt') args.writeReceipt = false;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(args.minConfigs) || args.minConfigs < 1) {
    throw new Error('--min-configs must be an integer >= 1');
  }

  return args;
}

function helpText() {
  return `SKYGRID V2Ray read-only ingest\n\nUsage:\n  node scripts/skygrid-v2ray-ingest.mjs\n  node scripts/skygrid-v2ray-ingest.mjs --file=All_Configs_Sub.txt\n\nThis command validates and receipts the upstream subscription feed. It does not activate a proxy, change routes, scan devices, sign transactions, or move private data.`;
}

export function assertAllowedSource(source) {
  const url = new URL(source);
  const allowedHost = url.protocol === 'https:' && url.hostname === 'raw.githubusercontent.com';
  const allowedPath = /^\/barry-far\/V2ray-Config\/(?:main|master)\/All_Configs_Sub\.txt$/i.test(url.pathname)
    || url.pathname.toLowerCase() === new URL(DEFAULT_SOURCE).pathname.toLowerCase();

  if (!allowedHost || !allowedPath || url.username || url.password || url.port || url.search || url.hash) {
    throw new Error('V2Ray ingest source is not allowlisted');
  }

  return url.toString();
}

export function validateFeedText(text, { minConfigs = 1 } = {}) {
  if (typeof text !== 'string') throw new Error('Feed must be UTF-8 text');
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes === 0) throw new Error('Feed is empty');
  if (bytes > MAX_SOURCE_BYTES) throw new Error(`Feed exceeds ${MAX_SOURCE_BYTES} bytes`);

  const counts = Object.fromEntries(ALLOWED_SCHEMES.map((scheme) => [scheme, 0]));
  const seen = new Set();
  const unsupported = new Map();
  let configCount = 0;
  let duplicateCount = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const marker = line.indexOf('://');
    const scheme = marker > 0 ? line.slice(0, marker).toLowerCase() : '<missing>';
    if (!ALLOWED_SCHEMES.includes(scheme)) {
      unsupported.set(scheme, (unsupported.get(scheme) || 0) + 1);
      continue;
    }

    configCount += 1;
    counts[scheme] += 1;
    if (seen.has(line)) duplicateCount += 1;
    else seen.add(line);
  }

  if (unsupported.size > 0) {
    const detail = [...unsupported.entries()].map(([scheme, count]) => `${scheme}:${count}`).join(', ');
    throw new Error(`Feed contains unsupported or malformed schemes: ${detail}`);
  }

  if (configCount < minConfigs) {
    throw new Error(`Feed contains ${configCount} configs; minimum is ${minConfigs}`);
  }

  return {
    bytes,
    config_count: configCount,
    unique_config_count: seen.size,
    duplicate_count: duplicateCount,
    protocols: Object.fromEntries(Object.entries(counts).filter(([, count]) => count > 0)),
    sha256: createHash('sha256').update(text, 'utf8').digest('hex')
  };
}

async function readRemote(source, fetchImpl = fetch) {
  const allowlistedSource = assertAllowedSource(source);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetchImpl(allowlistedSource, {
      method: 'GET',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'accept': 'text/plain',
        'user-agent': 'SKYGRID-PNPK-V2Ray-Ingest/1.0'
      }
    });

    if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
    const declaredLength = Number(response.headers.get('content-length') || 0);
    if (declaredLength > MAX_SOURCE_BYTES) throw new Error(`Upstream declares ${declaredLength} bytes; limit is ${MAX_SOURCE_BYTES}`);

    const text = await response.text();
    return {
      text,
      source: allowlistedSource,
      etag: response.headers.get('etag'),
      last_modified: response.headers.get('last-modified')
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readInput(args, fetchImpl = fetch) {
  if (args.file) {
    const text = await readFile(path.resolve(args.file), 'utf8');
    return { text, source: `file:${path.resolve(args.file)}`, etag: null, last_modified: null };
  }
  return readRemote(args.source, fetchImpl);
}

function buildReceipt(input, validation) {
  const pinned = input.source.toLowerCase() === DEFAULT_SOURCE.toLowerCase();
  return {
    ok: true,
    profile: 'skygrid.v2ray.read_only_ingest',
    schema_version: '1.0.0',
    timestamp: new Date().toISOString(),
    mode: 'production_read_only_ingest',
    sentinel: 'fail_closed',
    source: {
      location: input.source,
      selection: pinned ? 'pinned_snapshot' : input.source.startsWith('file:') ? 'local_file' : 'tracking_branch',
      revision: pinned ? PINNED_SOURCE_REVISION : null,
      snapshot_committed_at: pinned ? '2026-09-20T15:30:12Z' : null,
      etag: input.etag || null,
      last_modified: input.last_modified || null,
      bytes: validation.bytes,
      sha256: validation.sha256
    },
    validation: {
      config_count: validation.config_count,
      unique_config_count: validation.unique_config_count,
      duplicate_count: validation.duplicate_count,
      protocols: validation.protocols
    },
    authority: {
      proxy_activation_allowed: false,
      os_route_change_allowed: false,
      dns_change_allowed: false,
      device_discovery_allowed: false,
      wifi_probe_allowed: false,
      bluetooth_probe_allowed: false,
      wallet_signing_allowed: false,
      transaction_broadcast_allowed: false,
      private_data_movement_allowed: false
    },
    boundary: 'This receipt validates an allowlisted public V2Ray subscription feed only. It does not connect to listed proxy nodes or grant them trust or execution authority.'
  };
}

async function writeReceipt(receiptPath, receipt) {
  const absolute = path.resolve(receiptPath);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  return absolute;
}

export async function run(argv = process.argv.slice(2), { fetchImpl = fetch, logger = console } = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    logger.log(helpText());
    return { ok: true, help: true };
  }

  const input = await readInput(args, fetchImpl);
  const validation = validateFeedText(input.text, { minConfigs: args.minConfigs });
  if (input.source.toLowerCase() === DEFAULT_SOURCE.toLowerCase() && validation.sha256 !== PINNED_SOURCE_SHA256) {
    throw new Error('Pinned V2Ray snapshot SHA-256 mismatch');
  }
  const receipt = buildReceipt(input, validation);

  let receiptPath = null;
  if (args.writeReceipt) receiptPath = await writeReceipt(args.receipt, receipt);

  logger.log(`V2Ray ingest verified: ${validation.config_count} configs (${validation.unique_config_count} unique)`);
  logger.log(`Protocols: ${JSON.stringify(validation.protocols)}`);
  logger.log(`SHA-256: ${validation.sha256}`);
  logger.log(`Source selection: ${receipt.source.selection}${receipt.source.revision ? ` (${receipt.source.revision})` : ''}`);
  logger.log('Authority: read-only ingest; proxy activation and route mutation are blocked.');
  if (receiptPath) logger.log(`Receipt: ${receiptPath}`);

  return { ok: true, validation, receipt, receipt_path: receiptPath };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  run().catch((error) => {
    console.error(error?.message || error);
    process.exit(1);
  });
}
