import { readFileSync, writeFileSync } from 'node:fs';
import { prepareFounderPayout, summarizeFounderPayout } from '../lib/founder-payout-preflight.mjs';

// The environment form supports owner-dispatched CI without accepting raw bank
// evidence as publicly visible workflow_dispatch inputs.
const flags = new Set(['--input', '--keys', '--partnerships', '--output']);
const args = process.argv.slice(2);
const paths = {};
try {
  for (let i = 0; i < args.length; i += 2) {
    if (!flags.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || paths[args[i]]) {
      throw new Error('invalid_arguments');
    }
    paths[args[i]] = args[i + 1];
  }
  const read = (flag, envName, fallback) => {
    const raw = paths[flag] ? readFileSync(paths[flag], 'utf8') : process.env[envName];
    if (!raw) return fallback;
    if (Buffer.byteLength(raw, 'utf8') > 1024 * 1024) throw new Error('input_too_large');
    return JSON.parse(raw);
  };
  const result = prepareFounderPayout(read('--input', 'SKYGRID_PAYOUT_EVIDENCE_JSON', null), {
    trustedKeys: read('--keys', 'PNPK_AUTODRILL_VERIFICATION_KEYS_JSON', {}),
    partnerships: read('--partnerships', 'PNPK_AUTODRILL_PARTNERSHIPS_JSON', {}),
  });
  const publicReport = summarizeFounderPayout(result);
  if (paths['--output']) {
    // Public disclosure does not require broad local file permissions. Refuse
    // overwrite and export the same allowlisted fields shown in the CI log.
    writeFileSync(paths['--output'], JSON.stringify(publicReport, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  console.log(JSON.stringify(publicReport, null, 2));
  process.exitCode = result.status === 'BLOCKED' ? 1 : 0;
} catch {
  // Parser, file-system and crypto errors can contain input data or paths.
  console.error(JSON.stringify({ status: 'BLOCKED', error: 'payout_preflight_input_or_output_invalid', funds_moved: false }));
  process.exitCode = 1;
}
