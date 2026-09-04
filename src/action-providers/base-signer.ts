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
  chainId: z.union([z.literal(BASE_MAINNET_CHAIN_ID), z.literal(BASE_SEPOLIA_CHAIN_ID)]),
  humanApproval: z.literal(true),
  memo: z.string().max(280).optional(),
});

type BaseSignerRequest = z.infer<typeof BaseSignerRequestSchema>;

const CorridorAuthorizationSchema = z.object({
  authority: z.literal("Michael Vincent Patrick"),
  origin: z.literal("Taiwan"),
  destination: z.literal("New York"),
  routeSetHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  nonce: z.string().min(8).max(128),
  expiresAt: z.string().datetime(),
  humanApproval: z.literal(true),
});

type CorridorAuthorization = z.infer<typeof CorridorAuthorizationSchema>;

class SkygridBaseSignerActionProvider extends ActionProvider<WalletProvider> {
  constructor() {
    super("skygrid-base-signer", []);
  }

  @CreateAction({
    name: "prepare_base_signer_request",
    description: "Prepare and validate a guarded Base signing request for SKYGRID. This action never reads a raw private key and never broadcasts a transaction; an external wallet provider must perform the signature after explicit human approval.",
    schema: BaseSignerRequestSchema,
  })
  async prepareBaseSignerRequest(args: BaseSignerRequest): Promise<string> {
    const request = BaseSignerRequestSchema.parse(args);
    const policy = resolveBaseSignerPolicy(process.env, request);
    return JSON.stringify({
      ok: true,
      provider: "skygrid-base-signer",
      status: "prepared",
      execution: "wallet_provider_signature_required",
      raw_calldata_allowed: false,
      policy,
      request,
    }, null, 2);
  }

  @CreateAction({
    name: "prepare_corridor_authorization",
    description: "Prepare a proof-bound Michael Vincent Patrick authorization envelope for automatic selection among verified SKYGRID routes from Taiwan westbound to New York. Failed and unknown routes remain fail-closed. This action does not sign or broadcast transactions.",
    schema: CorridorAuthorizationSchema,
  })
  async prepareCorridorAuthorization(args: CorridorAuthorization): Promise<string> {
    const request = CorridorAuthorizationSchema.parse(args);
    const expiresAtMs = Date.parse(request.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      throw new Error("corridor_authorization_expired");
    }

    const signingPayload = {
      domain: "SKYGRID_AURA_CORRIDOR_AUTHORIZATION_V1",
      authority: request.authority,
      corridor: { origin: request.origin, direction: "westbound", destination: request.destination },
      route_set_hash: request.routeSetHash.toLowerCase(),
      nonce: request.nonce,
      expires_at: new Date(expiresAtMs).toISOString(),
      selection_policy: "verified_routes_only",
      unknown_route_policy: "hold_fail_closed",
      failed_route_policy: "quarantine_fail_closed",
      require_human_approval: true,
      human_approval_present: request.humanApproval,
      external_wallet_signature_required: true,
      auto_broadcast: false,
    };

    return JSON.stringify({
      ok: true,
      provider: "skygrid-base-signer",
      status: "authorization_prepared",
      execution: "external_wallet_signature_required",
      signing_payload: signingPayload,
    }, null, 2);
  }

  supportsNetwork = (network: Network) => {
    const networkId = String(network.networkId ?? "").toLowerCase();
    const chainId = Number(network.chainId);
    return chainId === BASE_MAINNET_CHAIN_ID || chainId === BASE_SEPOLIA_CHAIN_ID || networkId.includes("base");
  };
}

export const baseSignerActionProvider = () => new SkygridBaseSignerActionProvider();
