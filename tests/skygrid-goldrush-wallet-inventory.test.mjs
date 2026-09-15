// Read-only GoldRush contract: test-first implementation gate.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const collectorPath = path.join(root, "scripts", "skygrid-goldrush-wallet-inventory.mjs");
const packagePath = path.join(root, "package.json");

test("GoldRush wallet inventory collector exists and is fail-closed", async () => {
  assert.equal(fs.existsSync(collectorPath), true, "GoldRush wallet inventory collector is missing");

  const mod = await import(pathToFileURL(collectorPath).href);
  const { GOLDRUSH_CONFIG } = mod;

  assert.equal(GOLDRUSH_CONFIG.chainName, "arbitrum-mainnet");
  assert.equal(GOLDRUSH_CONFIG.authEnv, "GOLDRUSH_API_KEY");
  assert.equal(GOLDRUSH_CONFIG.walletsEnv, "SKYGRID_WALLET_ADDRESSES");
  assert.equal(GOLDRUSH_CONFIG.readOnly, true);
  assert.equal(GOLDRUSH_CONFIG.walletSigningAllowed, false);
  assert.equal(GOLDRUSH_CONFIG.tokenApprovalsAllowed, false);
  assert.equal(GOLDRUSH_CONFIG.transactionBroadcastAllowed, false);
  assert.equal(GOLDRUSH_CONFIG.assetTransferAllowed, false);
  assert.equal(GOLDRUSH_CONFIG.paymentExecutionAllowed, false);
});

test("collector uses GET with bearer auth and never puts the API key in the URL", async () => {
  assert.equal(fs.existsSync(collectorPath), true, "GoldRush wallet inventory collector is missing");
  const { collectWalletBalances } = await import(pathToFileURL(collectorPath).href);

  const wallet = "0x1111111111111111111111111111111111111111";
  const apiKey = "test-secret-key";
  const calls = [];

  const result = await collectWalletBalances({
    apiKey,
    walletAddresses: [wallet],
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: {
              chain_name: "arbitrum-mainnet",
              address: wallet,
              items: [
                {
                  contract_ticker_symbol: "USDC",
                  contract_address: "0x2222222222222222222222222222222222222222",
                  balance: "2500000",
                  contract_decimals: 6,
                  quote_rate: 1,
                  quote: 2.5,
                },
              ],
            },
          };
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${apiKey}`);
  assert.equal(calls[0].url.includes(apiKey), false);
  assert.equal(calls[0].url.includes("arbitrum-mainnet"), true);
  assert.equal(calls[0].url.includes(wallet), true);
  assert.equal(result[0].walletAddress, wallet);
  assert.equal(result[0].items[0].ticker, "USDC");
  assert.equal(result[0].items[0].quote, 2.5);
});

test("collector rejects malformed wallet addresses before network access", async () => {
  assert.equal(fs.existsSync(collectorPath), true, "GoldRush wallet inventory collector is missing");
  const { collectWalletBalances } = await import(pathToFileURL(collectorPath).href);
  let called = false;

  await assert.rejects(
    collectWalletBalances({
      apiKey: "test-secret-key",
      walletAddresses: ["not-an-evm-address"],
      fetchImpl: async () => {
        called = true;
        throw new Error("network should not be called");
      },
    }),
    /invalid evm wallet address/i,
  );

  assert.equal(called, false);
});

test("package exposes explicit test and read-only Arbitrum inventory commands", () => {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  assert.equal(pkg.scripts["wallet:inventory:test"], "node --test tests/skygrid-goldrush-wallet-inventory.test.mjs");
  assert.equal(pkg.scripts["wallet:inventory:arbitrum"], "node scripts/skygrid-goldrush-wallet-inventory.mjs");
});
