#!/usr/bin/env node

import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const RECEIPT_TYPE = "skygrid_allbridge_transc_preflight";
const RECEIPT_VERSION = "1.0.0";
const OPERATOR = "MVPuknowme";
const SECRET_ARG_PATTERN = /(?:private[-_]?key|seed|mnemonic|secret)/i;

function fail(reason, details) {
  const error = new Error(details ? `${reason}:${details}` : reason);
  error.code = reason;
  throw error;
}

function requireText(value, reason) {
  if (typeof value !== "string" || value.trim() === "") fail(reason);
  return value.trim();
}

function normalizeChain(value, reason) {
  return requireText(value, reason).toUpperCase();
}

function normalizeToken(value, reason) {
  return requireText(value, reason).toUpperCase();
}

function normalizePositiveAmount(value) {
  const amount = requireText(value, "amount_required");
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount) || !/[1-9]/.test(amount)) {
    fail("amount_must_be_positive");
  }
  return amount;
}

function jsonReplacer(_key, value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("hex");
  return value;
}

function fingerprint(value) {
  if (value == null) return null;
  const encoded = JSON.stringify(value, jsonReplacer);
  return createHash("sha256").update(encoded).digest("hex");
}

function tokenFor(chain, symbol, reason) {
  const tokens = Array.isArray(chain?.tokens) ? chain.tokens : [];
  const token = tokens.find((item) => String(item?.symbol ?? "").toUpperCase() === symbol);
  if (!token) fail(reason, symbol);
  return token;
}

function validateSdk(sdk) {
  if (
    !sdk ||
    typeof sdk.chainDetailsMap !== "function" ||
    typeof sdk.bridge?.checkAllowance !== "function" ||
    typeof sdk.bridge?.rawTxBuilder?.approve !== "function" ||
    typeof sdk.bridge?.rawTxBuilder?.send !== "function"
  ) {
    fail("allbridge_sdk_shape_invalid");
  }
}

export function parseTranscArgs(argv) {
  const values = {};
  const aliases = new Map([
    ["source-chain", "sourceChain"],
    ["source-token", "sourceToken"],
    ["destination-chain", "destinationChain"],
    ["destination-token", "destinationToken"],
    ["amount", "amount"],
    ["from", "fromAccountAddress"],
    ["to", "toAccountAddress"],
    ["messenger", "messenger"]
  ]);

  for (const arg of argv) {
    if (SECRET_ARG_PATTERN.test(arg)) fail("secret_bearing_argument_rejected");
    if (!arg.startsWith("--") || !arg.includes("=")) fail("argument_format_invalid", arg);
    const [rawKey, ...rest] = arg.slice(2).split("=");
    const key = aliases.get(rawKey);
    if (!key) fail("argument_not_supported", rawKey);
    values[key] = rest.join("=");
  }

  return {
    ...values,
    messenger: values.messenger || "ALLBRIDGE"
  };
}

export async function prepareTranscMVPuknowme(input, { sdk, now = () => new Date().toISOString() } = {}) {
  validateSdk(sdk);

  const sourceChainSymbol = normalizeChain(input?.sourceChain, "source_chain_required");
  const sourceTokenSymbol = normalizeToken(input?.sourceToken, "source_token_required");
  const destinationChainSymbol = normalizeChain(input?.destinationChain, "destination_chain_required");
  const destinationTokenSymbol = normalizeToken(input?.destinationToken, "destination_token_required");
  const amount = normalizePositiveAmount(input?.amount);
  const fromAccountAddress = requireText(input?.fromAccountAddress, "from_account_required");
  const toAccountAddress = requireText(input?.toAccountAddress, "to_account_required");
  const messenger = input?.messenger;
  if (messenger == null || messenger === "") fail("messenger_required");

  const chains = await sdk.chainDetailsMap();
  const sourceChain = chains?.[sourceChainSymbol];
  if (!sourceChain) fail("source_chain_unsupported", sourceChainSymbol);
  const destinationChain = chains?.[destinationChainSymbol];
  if (!destinationChain) fail("destination_chain_unsupported", destinationChainSymbol);

  const sourceToken = tokenFor(sourceChain, sourceTokenSymbol, "source_token_unsupported");
  const destinationToken = tokenFor(destinationChain, destinationTokenSymbol, "destination_token_unsupported");

  const hasAllowance = await sdk.bridge.checkAllowance({
    token: sourceToken,
    owner: fromAccountAddress,
    amount,
    messenger
  });

  const approve = hasAllowance
    ? null
    : await sdk.bridge.rawTxBuilder.approve({
        token: sourceToken,
        owner: fromAccountAddress,
        messenger
      });

  const send = await sdk.bridge.rawTxBuilder.send({
    amount,
    fromAccountAddress,
    toAccountAddress,
    sourceToken,
    destinationToken,
    messenger
  });

  const amountToReceive = typeof sdk.getAmountToBeReceived === "function"
    ? await sdk.getAmountToBeReceived(amount, sourceToken, destinationToken, messenger)
    : null;

  return {
    receipt: {
      receipt_type: RECEIPT_TYPE,
      receipt_version: RECEIPT_VERSION,
      operator: OPERATOR,
      created_at: now(),
      mode: "build_only",
      route: {
        source_chain: sourceChainSymbol,
        source_token: sourceTokenSymbol,
        destination_chain: destinationChainSymbol,
        destination_token: destinationTokenSymbol,
        from_account: fromAccountAddress,
        to_account: toAccountAddress
      },
      amount,
      quote: {
        amount_to_receive: amountToReceive == null ? null : String(amountToReceive)
      },
      approval_required: !hasAllowance,
      unsigned_transaction_sha256: {
        approve: fingerprint(approve),
        send: fingerprint(send)
      },
      policy: {
        signing_allowed: false,
        broadcast_allowed: false,
        secret_inputs_allowed: false
      }
    },
    unsigned_transactions: { approve, send }
  };
}

export async function runTranscMVPuknowme(argv, { sdkFactory, output = console.log } = {}) {
  const parsed = parseTranscArgs(argv);
  if (typeof sdkFactory !== "function") fail("sdk_factory_required");
  const { sdk, messenger } = await sdkFactory(parsed.messenger);
  const result = await prepareTranscMVPuknowme({ ...parsed, messenger }, { sdk });
  output(JSON.stringify(result, jsonReplacer, 2));
  return result;
}

async function defaultSdkFactory(messengerName) {
  const { AllbridgeCoreSdk, Messenger, nodeRpcUrlsDefault } = await import("@allbridge/bridge-core-sdk");
  const messenger = Messenger?.[String(messengerName).toUpperCase()];
  if (messenger == null) fail("messenger_unsupported", messengerName);
  return {
    sdk: new AllbridgeCoreSdk(nodeRpcUrlsDefault),
    messenger
  };
}

const isCli = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  runTranscMVPuknowme(process.argv.slice(2), { sdkFactory: defaultSdkFactory }).catch((error) => {
    console.error(JSON.stringify({
      receipt_type: RECEIPT_TYPE,
      operator: OPERATOR,
      status: "failed_closed",
      reason: error?.code || "transc_preflight_failed",
      message: String(error?.message || error)
    }));
    process.exitCode = 1;
  });
}
