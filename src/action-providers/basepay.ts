import {
  ActionProvider,
  CreateAction,
  Network,
  WalletProvider,
} from "@coinbase/agentkit";
import { z } from "zod";

const BASE_MAINNET_CHAIN_ID = 8453;
const BASE_SEPOLIA_CHAIN_ID = 84532;

const BasePayIntentSchema = z.object({
  recipient: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,6})?$/, "amount must be a decimal string with up to 6 decimals"),
  asset: z.enum(["USDC"]),
  chainId: z.union([z.literal(BASE_MAINNET_CHAIN_ID), z.literal(BASE_SEPOLIA_CHAIN_ID)]),
  memo: z.string().max(280).optional(),
});

type BasePayIntent = z.infer<typeof BasePayIntentSchema>;

function getAllowlistedRecipients(): Set<string> {
  return new Set(
    (process.env.SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getMaxUsdAmount(): number {
  const raw = process.env.SKYGRID_BASEPAY_MAX_USD ?? "25";
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 25;
}

function assertBasePayPolicy(intent: BasePayIntent): void {
  const allowlist = getAllowlistedRecipients();
  const recipient = intent.recipient.toLowerCase();

  if (allowlist.size === 0) {
    throw new Error("SKYGRID_BASEPAY_RECIPIENT_ALLOWLIST is empty; BasePay intent rejected fail-closed.");
  }

  if (!allowlist.has(recipient)) {
    throw new Error("Recipient is not allowlisted for SKYGRID BasePay execution.");
  }

  const amount = Number.parseFloat(intent.amount);
  const maxUsd = getMaxUsdAmount();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("BasePay amount must be greater than zero.");
  }

  if (amount > maxUsd) {
    throw new Error(`BasePay amount exceeds SKYGRID_BASEPAY_MAX_USD policy cap of ${maxUsd}.`);
  }
}

class SkygridBasePayActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("skygrid-basepay", []);
  }

  @CreateAction({
    name: "prepare_basepay_intent",
    description:
      "Prepare a guarded Base USDC payment intent for SKYGRID. This does not broadcast a transaction; it validates amount, chain, asset, recipient allowlist, and requires external human/wallet approval.",
    schema: BasePayIntentSchema,
  })
  async prepareBasePayIntent(args: BasePayIntent): Promise<string> {
    const intent = BasePayIntentSchema.parse(args);
    assertBasePayPolicy(intent);

    return JSON.stringify(
      {
        ok: true,
        provider: "skygrid-basepay",
        status: "prepared",
        execution: "manual_wallet_approval_required",
        raw_calldata_allowed: false,
        policy: {
          recipient_allowlisted: true,
          max_usd: getMaxUsdAmount(),
          asset: intent.asset,
          chainId: intent.chainId,
        },
        intent,
      },
      null,
      2,
    );
  }

  supportsNetwork = (network: Network) => {
    const networkId = String(network.networkId ?? "").toLowerCase();
    const chainId = Number(network.chainId);

    return (
      chainId === BASE_MAINNET_CHAIN_ID ||
      chainId === BASE_SEPOLIA_CHAIN_ID ||
      networkId.includes("base")
    );
  };
}

export const basePayActionProvider = () => new SkygridBasePayActionProvider();
