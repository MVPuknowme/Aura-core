import { writeFile } from "node:fs/promises";
import { inspectAttDiscovery } from "../lib/att-readonly-discovery.mjs";

// Live public discovery requires an explicit operator opt-in. No credential support.
const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== "--live") {
  console.error("usage: node scripts/att-readonly-discovery.mjs --live (public metadata GET only)");
  process.exitCode = 2;
} else {
  try {
    const receipt = await inspectAttDiscovery();
    const path = `att-public-discovery-${Date.now()}.json`;
    await writeFile(path, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ output: path, decision: receipt.decision, receipt_hash: receipt.receipt_hash }));
    if (receipt.decision !== "DISCOVERY_VERIFIED") process.exitCode = 2;
  } catch {
    console.error("AT&T public discovery failed closed; no carrier operations attempted");
    process.exitCode = 2;
  }
}
