#!/usr/bin/env node
import dns from 'node:dns/promises';
import https from 'node:https';
import { execFileSync } from 'node:child_process';

const expectedRegistry = 'https://registry.npmjs.org/';
const watchedPackages = ['@rainbow-me/rainbowkit', 'ethers', 'stripe', 'viem', 'wagmi'];
const warnings = [];
const failures = [];

function log(label, value) {
  console.log(`[skygrid-preflight] ${label}: ${value}`);
}

function warn(message) {
  warnings.push(message);
  console.warn(`::warning title=SkyGrid build preflight::${message}`);
}

function fail(message) {
  failures.push(message);
  console.error(`::error title=SkyGrid build preflight::${message}`);
}

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'skygrid-build-interference-preflight/1.0',
        Accept: 'application/json'
      }
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`${url} returned HTTP ${res.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error(`${url} returned non-JSON metadata: ${error.message}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error(`${url} timed out`)));
    req.on('error', reject);
  });
}

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    warn(`${command} ${args.join(' ')} failed: ${error.message}`);
    return '';
  }
}

log('node', process.version);
log('platform', `${process.platform}/${process.arch}`);
log('ci', process.env.CI || 'false');
log('vercel_region', process.env.VERCEL_REGION || process.env.NOW_REGION || 'unknown');
log('vercel_git_commit_sha', process.env.VERCEL_GIT_COMMIT_SHA || 'unknown');

if (!process.version.startsWith('v24.')) {
  fail(`Node 24 required for this deployment lane; found ${process.version}`);
}

for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'NPM_CONFIG_PROXY', 'npm_config_proxy']) {
  if (process.env[name]) {
    warn(`${name} is set. Verify this is expected; proxy variables can alter registry traffic.`);
  }
}

const registry = run('pnpm', ['config', 'get', 'registry']) || expectedRegistry;
log('pnpm_registry', registry);
if (registry !== expectedRegistry) {
  fail(`Unexpected pnpm registry: ${registry}. Expected ${expectedRegistry}`);
}

try {
  const addrs = await dns.lookup('registry.npmjs.org', { all: true });
  log('registry_dns', addrs.map(a => `${a.address}/${a.family}`).join(', '));
  if (addrs.length === 0) fail('registry.npmjs.org resolved to no addresses');
} catch (error) {
  fail(`DNS lookup failed for registry.npmjs.org: ${error.message}`);
}

for (const pkg of watchedPackages) {
  const encoded = encodeURIComponent(pkg).replace('%40', '@');
  try {
    const meta = await requestJson(`${expectedRegistry}${encoded}/latest`);
    log(`registry_latest_${pkg}`, meta.version || 'unknown');
    if (!meta.dist?.integrity) {
      warn(`${pkg}@latest metadata has no dist.integrity field`);
    }
  } catch (error) {
    fail(`Registry metadata fetch failed for ${pkg}: ${error.message}`);
  }
}

if (warnings.length > 0) {
  log('warnings', warnings.length);
}

if (failures.length > 0) {
  console.error('[skygrid-preflight] Build interference preflight failed. Review registry, proxy, DNS, and package-manager state.');
  process.exit(1);
}

console.log('[skygrid-preflight] Build interference preflight passed.');
