import {
  ActionProvider,
  CreateAction,
  Network,
  WalletProvider,
} from "@coinbase/agentkit";
import { z } from "zod";
import {
  BASE_MAINNET_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  resolveBaseSignerPolicy,
} from "../../config/skygrid-base-signer.mjs";

const BaseSignerRequestSchema = z.object({
  recipient: z.string().min(1),
  amountUsd: z.number().positive(),
  chainId: z.union([
    z.literal(BASE_MAINNET_CHAIN_ID),
    z.literal(BASE_SEPOLIA_CHAIN_ID),
  ]),
  humanApproval: z.literal(true),
  memo: z.string().max(280).optional(),
});

type BaseSignerRequest = z.infer<typeof BaseSignerRequestSchema>;

class SkygridBaseSignerActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("skygrid-base-signer", []);
  }

  @CreateAction({
    name: "prepare_base_signer_request",
    description:
      "Prepare and validate a guarded Base signing request for SKYGRID. This action never reads a raw private key and never broadcasts a transaction; an external wallet provider must perform the signature after explicit human approval.",
    schema: BaseSignerRequestSchema,
  })
  async prepareBaseSignerRequest(args: BaseSignerRequest): Promise<string> {
    const request = BaseSignerRequestSchema.parse(args);
    const policy = resolveBaseSignerPolicy(process.env, request);

    return JSON.stringify(
      {
        ok: true,
        provider: "skygrid-base-signer",
        status: "prepared",
        execution: "wallet_provider_signature_required",
        raw_calldata_allowed: false,
        policy,
        request,
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

export const baseSignerActionProvider = () => new SkygridBaseSignerActionProvider();
