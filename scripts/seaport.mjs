import { fileURLToPath } from "node:url";
import path from "node:path";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";

export const SEAPORT_CONFIG = Object.freeze({
  service: PRODUCT,
  mode: "controlled_pilot",
  sentinel: "fail_closed",
  purpose: "read_only_seaport_identity_and_order_preflight",
  network: Object.freeze({
    name: "arbitrum-one",
    chain_id: 42161,
    native_currency: "ETH"
  }),
  protocol: Object.freeze({
    name: "Seaport",
    version: "1.6",
    address: "0x0000000000000068F116a894984e2DB1123eB395",
    conduit: "0x1E0049783F008A0085193E00003D00cd54003c71",
    conduit_key: "0x0000007b02230091a7ed01230072f7006a004d60a8d4e71d599b8104250f0000"
  }),
  policy: Object.freeze({
    advisory_only: true,
    read_only: true,
    wallet_signing: false,
    token_approvals: false,
    order_submission: false,
    order_fulfillment: false,
    transaction_broadcast: false,
    asset_transfer: false,
    payment_execution: false
  })
});

export function getSeaportConfig() {
  return JSON.parse(JSON.stringify(SEAPORT_CONFIG));
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = fileURLToPath(import.meta.url);

if (invokedPath === modulePath) {
  process.stdout.write(`${JSON.stringify(SEAPORT_CONFIG, null, 2)}\n`);
}
