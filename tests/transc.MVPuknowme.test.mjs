import assert from "node:assert/strict";
import test from "node:test";

async function loadSubject() {
  try {
    return await import("../scripts/transc.MVPuknowme.mjs");
  } catch {
    return null;
  }
}

function makeSdk({ allowance = false } = {}) {
  const calls = { allowance: [], approve: [], send: [], quote: [] };
  const sdk = {
    async chainDetailsMap() {
      return {
        ETH: { tokens: [{ symbol: "USDC", chainSymbol: "ETH", tokenAddress: "0xsource" }] },
        POL: { tokens: [{ symbol: "USDC", chainSymbol: "POL", tokenAddress: "0xdestination" }] }
      };
    },
    bridge: {
      async checkAllowance(params) {
        calls.allowance.push(params);
        return allowance;
      },
      rawTxBuilder: {
        async approve(params) {
          calls.approve.push(params);
          return { to: "0xbridge", data: "0xapprove", value: "0" };
        },
        async send(params) {
          calls.send.push(params);
          return { to: "0xbridge", data: "0xsend", value: "0" };
        }
      }
    },
    async getAmountToBeReceived(...args) {
      calls.quote.push(args);
      return "0.99";
    }
  };
  return { sdk, calls };
}

const VALID = {
  sourceChain: "ETH",
  sourceToken: "USDC",
  destinationChain: "POL",
  destinationToken: "USDC",
  amount: "1.00",
  fromAccountAddress: "0x1111111111111111111111111111111111111111",
  toAccountAddress: "0x2222222222222222222222222222222222222222",
  messenger: "allbridge"
};

test("exports a fail-closed Allbridge transaction preparer", async () => {
  const subject = await loadSubject();
  assert.equal(typeof subject?.prepareTranscMVPuknowme, "function");
});

test("rejects zero and negative amounts before touching the SDK", async () => {
  const subject = await loadSubject();
  assert.equal(typeof subject?.prepareTranscMVPuknowme, "function");
  const { sdk, calls } = makeSdk();

  await assert.rejects(
    subject.prepareTranscMVPuknowme({ ...VALID, amount: "0" }, { sdk }),
    /amount_must_be_positive/
  );
  await assert.rejects(
    subject.prepareTranscMVPuknowme({ ...VALID, amount: "-1" }, { sdk }),
    /amount_must_be_positive/
  );
  assert.equal(calls.send.length, 0);
});

test("builds approval and send transactions without signing or broadcasting", async () => {
  const subject = await loadSubject();
  assert.equal(typeof subject?.prepareTranscMVPuknowme, "function");
  const { sdk, calls } = makeSdk({ allowance: false });

  const result = await subject.prepareTranscMVPuknowme(VALID, {
    sdk,
    now: () => "2026-09-03T12:00:00.000Z"
  });

  assert.equal(calls.approve.length, 1);
  assert.equal(calls.send.length, 1);
  assert.equal(result.receipt.receipt_type, "skygrid_allbridge_transc_preflight");
  assert.equal(result.receipt.operator, "MVPuknowme");
  assert.equal(result.receipt.mode, "build_only");
  assert.equal(result.receipt.approval_required, true);
  assert.equal(result.receipt.quote.amount_to_receive, "0.99");
  assert.equal(result.receipt.policy.signing_allowed, false);
  assert.equal(result.receipt.policy.broadcast_allowed, false);
  assert.equal(result.unsigned_transactions.approve.data, "0xapprove");
  assert.equal(result.unsigned_transactions.send.data, "0xsend");
});

test("skips approval construction when allowance is already sufficient", async () => {
  const subject = await loadSubject();
  assert.equal(typeof subject?.prepareTranscMVPuknowme, "function");
  const { sdk, calls } = makeSdk({ allowance: true });

  const result = await subject.prepareTranscMVPuknowme(VALID, { sdk });

  assert.equal(calls.approve.length, 0);
  assert.equal(calls.send.length, 1);
  assert.equal(result.receipt.approval_required, false);
  assert.equal(result.unsigned_transactions.approve, null);
});

test("rejects unsupported chains and tokens before transaction construction", async () => {
  const subject = await loadSubject();
  assert.equal(typeof subject?.prepareTranscMVPuknowme, "function");
  const { sdk, calls } = makeSdk();

  await assert.rejects(
    subject.prepareTranscMVPuknowme({ ...VALID, sourceChain: "NOPE" }, { sdk }),
    /source_chain_unsupported/
  );
  await assert.rejects(
    subject.prepareTranscMVPuknowme({ ...VALID, sourceToken: "NOPE" }, { sdk }),
    /source_token_unsupported/
  );
  assert.equal(calls.send.length, 0);
});

test("parses operator CLI arguments without accepting secret-bearing flags", async () => {
  const subject = await loadSubject();
  assert.equal(typeof subject?.parseTranscArgs, "function");

  const parsed = subject.parseTranscArgs([
    "--source-chain=ETH",
    "--source-token=USDC",
    "--destination-chain=POL",
    "--destination-token=USDC",
    "--amount=1.25",
    "--from=0x1",
    "--to=0x2"
  ]);
  assert.equal(parsed.amount, "1.25");
  assert.equal(parsed.sourceChain, "ETH");

  assert.throws(
    () => subject.parseTranscArgs(["--private-key=secret"]),
    /secret_bearing_argument_rejected/
  );
});
