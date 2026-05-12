import fs from 'node:fs/promises';

const CSV_PATH = process.env.KLAMATH_VALIDATOR_CSV || 'validator_exchange_run_week.csv';

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(',').map((h) => h.trim());
  return lines.map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function toNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Invalid numeric value for ${label}: ${value}`);
  }
  return number;
}

async function main() {
  const raw = await fs.readFile(CSV_PATH, 'utf8');
  const rows = parseCsv(raw);

  let weeklyUsdc = 0;
  let weeklyEth = 0;
  let completedRows = 0;

  for (const row of rows) {
    if (row.Status !== 'COMPLETED') continue;
    completedRows += 1;
    const token = row['Target Token'];
    const amount = toNumber(row['Target Amount'], `Target Amount for ${token}`);

    if (token === 'USDC') weeklyUsdc += amount;
    if (token === 'ETH') weeklyEth += amount;
  }

  const monthlyMultiplier = 52 / 12;
  const result = {
    source: CSV_PATH,
    completedRows,
    weekly: {
      usdc: Number(weeklyUsdc.toFixed(2)),
      eth: Number(weeklyEth.toFixed(6))
    },
    projected: {
      monthlyUsdc: Number((weeklyUsdc * monthlyMultiplier).toFixed(2)),
      twoMonthUsdc: Number((weeklyUsdc * monthlyMultiplier * 2).toFixed(2)),
      threeMonthUsdc: Number((weeklyUsdc * monthlyMultiplier * 3).toFixed(2)),
      annualUsdc: Number((weeklyUsdc * 52).toFixed(2)),
      monthlyEth: Number((weeklyEth * monthlyMultiplier).toFixed(6)),
      twoMonthEth: Number((weeklyEth * monthlyMultiplier * 2).toFixed(6)),
      threeMonthEth: Number((weeklyEth * monthlyMultiplier * 3).toFixed(6)),
      annualEth: Number((weeklyEth * 52).toFixed(6))
    },
    accountingStatus: 'gross-output-only-net-profit-pending-expense-reconciliation'
  };

  if (completedRows !== 28) throw new Error(`Expected 28 completed rows, found ${completedRows}`);
  if (result.weekly.usdc !== 945) throw new Error(`Expected weekly USDC 945, found ${result.weekly.usdc}`);
  if (result.weekly.eth !== 0.31794) throw new Error(`Expected weekly ETH 0.31794, found ${result.weekly.eth}`);

  console.log('Klamath validator gross output verified');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error('Klamath validator profit verification failed');
  console.error(error.message);
  process.exit(1);
});
