import { mkdir, writeFile } from "node:fs/promises";
import { buildDecisionEnvelope, healthEnvelope } from "../lib/aura-switch-director.mjs";

const command = {
  source: "chatbot",
  provider: "auto",
  execute: false,
  privacy: "restricted",
  message: "Aura, enter SKYGRID call-circle training mode. Review current SKYGRID state and choose the safest next action without executing production changes. Keep Vercel public route proof first, chatbot call-circle validation second, builder quote proof quote-only, heartbeat-only node validation for spx-node-001 and spx-node-002, accounting guardrail preservation, and token approvals on HOLD. Return selected next action, why it is safest, blocked items, proof artifact to create, and exact operator approval gate required before anything live changes."
};

const decision = buildDecisionEnvelope({
  ...command,
  task: command.message,
  execute: false
});

const response = {
  ok: true,
  route: "/api/chatbot/call-circle",
  mode: "chatbot_bridge_decision_only",
  call_circle: ["chatbot", "aura_director", "skygrid_advisory"],
  aura_director: healthEnvelope(),
  input_summary: {
    source: command.source,
    task: command.message,
    requested_execute_ignored: false
  },
  decision,
  guardrails: {
    fail_closed: true,
    execute_forced_false: true,
    no_wallet_signing: true,
    no_transaction_broadcast: true,
    no_private_data_movement: true,
    no_payment_execution: true,
    production_failover: false
  },
  selected_next_action: "Restore public Vercel route proof, then validate chatbot HTTP route, then builder quote proof.",
  why_it_is_safest: "This keeps Aura in decision-only fail-closed mode while preserving accounting, wallet, payment, privacy, and failover guardrails.",
  blocked_items: [
    "Public route proof remains blocked until Vercel SSO / Deployment Protection is disabled or bypassed through an approved operator path.",
    "HTTP chatbot route proof is not complete until the route returns 200 from local Vercel dev or deployed Vercel.",
    "Builder quote proof remains quote-only and must not execute payment or wallet actions.",
    "Token approval remains blocked until testnet simulation, explicit spender, bounded allowance, and revoke path exist."
  ],
  proof_artifact_to_create: "artifacts/training/aura-call-circle-training-proof.json",
  operator_approval_gate_required: "Named operator approval plus health quorum, rollback path, accounting guardrail pass, and explicit confirmation before any live change, wallet action, payout status change, or production failover.",
  timestamp: new Date().toISOString()
};

const proof = {
  generated_at: new Date().toISOString(),
  system: "SKYGRID Emergency Data On-Ramp",
  proof_type: "aura_call_circle_training_prompt",
  execution_path: "direct_node_import_no_http_server",
  local_http_route_status: "not_proven_in_this_artifact",
  request: command,
  response
};

await mkdir("artifacts/training", { recursive: true });
await writeFile(
  "artifacts/training/aura-call-circle-training-proof.json",
  `${JSON.stringify(proof, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify({
  ok: true,
  proof_file: "artifacts/training/aura-call-circle-training-proof.json",
  mode: response.mode,
  execution_mode: response.decision.execution_mode,
  selected_provider: response.decision.selected_provider.id,
  response_is_null: response === null
}, null, 2));
