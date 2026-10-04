// Trusted transport adapters must enforce the configured private egress themselves.
// This boundary never creates a direct HTTP connection or retries through another route.
const SCHEMAS = new Set(["pnpk.private-export-preflight.v1", "pnpk_postbuild"]);
const DECISIONS = new Set(["export_preflight_verified", "postbuild_verified", "fail_closed"]);

export function minimizePrivateReceipt(receipt) {
  if (!SCHEMAS.has(receipt?.schema ?? receipt?.receipt_type)) {
    throw new Error("private_receipt_schema_invalid");
  }
  return Object.freeze({
    schema: "pnpk.private-delivery-receipt.v1",
    source_schema: receipt.schema ?? receipt.receipt_type,
    decision: DECISIONS.has(receipt.decision) ? receipt.decision : "fail_closed",
    monitoring_status: "unknown",
    network_identity: "withheld",
    content_capture: false,
    execution_authority: "none",
  });
}

export async function deliverPrivateReceipt(receipt, { relayUrl, transport } = {}) {
  try {
    if (typeof relayUrl !== "string") return false;
    const destination = new URL(relayUrl);
    if (destination.protocol !== "https:" || destination.username || destination.password ||
        destination.hash || destination.search) return false;
    if (typeof transport?.verifyEgress !== "function" || typeof transport?.deliver !== "function") return false;
    const minimized = minimizePrivateReceipt(receipt);
    // Adapter and relay configuration come from trusted operator code, never receipt data.
    const egress = await transport.verifyEgress(destination.href);
    if (egress?.verified !== true || egress.destination !== destination.href ||
        !["vpn", "outsourced_relay"].includes(egress.mode)) return false;
    return await transport.deliver(destination.href, minimized, egress) === true;
  } catch {
    return false;
  }
}
