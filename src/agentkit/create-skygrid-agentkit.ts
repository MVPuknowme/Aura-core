import { AgentKit, type WalletProvider } from "@coinbase/agentkit";
import { basePayActionProvider } from "../action-providers/basepay";

export async function createSkygridAgentKit(walletProvider: WalletProvider) {
  return await AgentKit.from({
    walletProvider,
    actionProviders: [
      basePayActionProvider(),
    ],
  });
}
