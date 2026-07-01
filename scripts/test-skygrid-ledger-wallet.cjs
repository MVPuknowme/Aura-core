const SkygridLedgerWallet = require("../lib/skygrid-ledger-wallet.cjs");

const wallet = new SkygridLedgerWallet({
  address: "skygrid-trace-wallet-001",
  balance: 10,
  network: "skygrid-main",
});

console.log("initial", wallet.snapshot());

wallet.credit(5);
console.log("after credit", wallet.snapshot());

wallet.debit(3);
console.log("after debit", wallet.snapshot());

try {
  wallet.debit(100);
  process.exitCode = 1;
  console.error("expected insufficient funds error did not fire");
} catch (error) {
  console.log("guard ok:", error.message);
}

try {
  wallet.credit(-1);
  process.exitCode = 1;
  console.error("expected invalid amount error did not fire");
} catch (error) {
  console.log("amount guard ok:", error.message);
}

console.log("SKYGRID trace wallet smoke test complete");
