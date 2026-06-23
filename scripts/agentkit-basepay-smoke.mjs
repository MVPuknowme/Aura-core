import process from "node:process";

const allowlist = (process.env.SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

const maxUsd = Number.parseFloat(process.env.SKYGRID_BASEPAY_MAX_USD ?? "25");

const testIntent = {
  recipient: allowlist[0] ?? "missing-allowlisted-recipient",
  amount: "1.00",
  asset: "USDC",
  chainId: 84532,
  memo: "SKYGRID BasePay smoke test: prepare only, no broadcast",
};

const failures = [];

if (allowlist.length === 0) {
  failures.push("SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST is empty");
}

if (!Number.isFinite(maxUsd) || maxUsd <= 0) {
  failures.push("SKYGRID_BASEPAY_MAX_USD must be a positive number");
}

if (Number.parseFloat(testIntent.amount) > maxUsd) {
  failures.push(`test amount exceeds SKYGRID_BASEPAY_MAX_USD cap of ${maxUsd}`);
}

if (testIntent.chainId !== 84532) {
  failures.push("smoke test must use Base Sepolia chainId 84532");
}

if (testIntent.asset !== "USDC") {
  failures.push("smoke test must use USDC");
}

if (failures.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    service: "SKYGRID Emergency Data On-Ramp",
    provider: "AgentKit BasePay",
    mode: "prepare_only",
    execution: false,
    failures,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  service: "SKYGRID Emergency Data On-Ramp",
  provider: "AgentKit BasePay",
  mode: "prepare_only",
  execution: false,
  broadcast: false,
  human_wallet_approval_required: true,
  intent: testIntent,
}, null, 2));
