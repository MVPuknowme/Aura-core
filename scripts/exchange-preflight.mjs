import { writeFileSync } from 'node:fs';
import { evaluateExchangePreflight } from '../src/intelligence/market-exchange-preflight.mjs';

// Configuration is loaded by the evaluator from the repository policy. The
// environment supplies observations only, never an alternate trusted policy.
let report;
try {
  const raw = process.env.PNPK_EXCHANGE_PREFLIGHT_JSON;
  if (!raw || Buffer.byteLength(raw, 'utf8') > 1024 * 1024) throw new Error();
  report = evaluateExchangePreflight(JSON.parse(raw));
} catch {
  report = {
    schema: 'pnpk.exchange-preflight.v1',
    report_visibility: 'public',
    decision: 'FAIL_CLOSED',
    failures: ['exchange_observations_or_configuration_invalid'],
    execution: { wallet_signing_allowed: false, transaction_broadcast_allowed: false, auto_execution_allowed: false },
  };
}

try {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--output' || !args[1])) throw new Error();
  if (args.length) writeFileSync(args[1], JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.decision === 'ROUTE_APPROVED' ? 0 : 1;
} catch {
  console.error(JSON.stringify({ decision: 'FAIL_CLOSED', error: 'exchange_preflight_output_invalid' }));
  process.exitCode = 1;
}
