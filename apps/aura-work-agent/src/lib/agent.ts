import { Agent, run } from "@openai/agents";
import {
  AURA_CORE_IDENTITY,
  DEFAULT_AURA_LOCAL_PREFERENCES,
  buildAuraPreferenceContext,
  type AuraLocalPreferences,
} from "@/lib/aura-profile";
import {
  githubCommentOnIssue,
  githubCreateIssue,
  githubListOpenIssues,
  githubRepositoryOverview,
  type AuraAgentContext,
} from "@/lib/github-tools";

const WRITE_APPROVAL_PREFIX = /^\s*APPROVE WRITE:\s*/i;

const auraAgent = new Agent<AuraAgentContext>({
  name: "Aura Work Agent",
  model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
  instructions: `
${AURA_CORE_IDENTITY}

GitHub policy:
- You may read only repositories exposed by the provided GitHub tools.
- Before recommending work, inspect repository metadata or current issues when relevant.
- Never claim a GitHub write occurred unless a write tool returned success.
- GitHub writes require both an allowlisted operator and a request beginning exactly with "APPROVE WRITE:".
- When write approval is absent, explain the proposed write without attempting to bypass the gate.
- Do not request or reveal tokens, API keys, secrets, private keys, or credentials.
- Do not merge pull requests, modify workflow permissions, alter repository settings, or delete content.

Keep Discord responses under 1,800 characters unless the user explicitly requests a longer artifact.
  `.trim(),
  tools: [
    githubRepositoryOverview,
    githubListOpenIssues,
    githubCreateIssue,
    githubCommentOnIssue,
  ],
});

function operatorUserIds(): Set<string> {
  return new Set(
    (process.env.DISCORD_OPERATOR_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function compactDiscordOutput(value: unknown): string {
  const text = String(value ?? "No response generated.").trim();
  if (text.length <= 1_800) {
    return text;
  }
  return `${text.slice(0, 1_760)}\n\n…response truncated`;
}

export async function runAuraAgent(input: {
  prompt: string;
  actorId: string;
  actorName: string;
  preferences?: AuraLocalPreferences;
  feedbackCount?: number;
  outputMode?: "discord" | "local";
}): Promise<string> {
  const explicitWriteApproval = WRITE_APPROVAL_PREFIX.test(input.prompt);
  const operatorAuthorized = operatorUserIds().has(input.actorId);
  const preferences = input.preferences ?? DEFAULT_AURA_LOCAL_PREFERENCES;
  const feedbackCount = input.feedbackCount ?? 0;

  const context: AuraAgentContext = {
    actorId: input.actorId,
    actorName: input.actorName,
    explicitWriteApproval,
    operatorAuthorized,
  };

  const prompt = [
    `Actor: ${input.actorName} (${input.actorId})`,
    `Interface: ${input.outputMode ?? "discord"}`,
    `Operator authorized: ${operatorAuthorized ? "yes" : "no"}`,
    `Explicit write approval prefix: ${explicitWriteApproval ? "present" : "absent"}`,
    "",
    "Current explicit presentation preferences:",
    buildAuraPreferenceContext(preferences, feedbackCount),
    "",
    input.prompt,
  ].join("\n");

  let result = await run(auraAgent, prompt, { context });
  let approvalPasses = 0;

  while (result.interruptions?.length && approvalPasses < 3) {
    approvalPasses += 1;

    for (const interruption of result.interruptions) {
      if (operatorAuthorized && explicitWriteApproval) {
        result.state.approve(interruption);
      } else {
        result.state.reject(interruption, {
          message:
            "Write action rejected. The authenticated Discord user must be allowlisted and the request must begin with APPROVE WRITE:.",
        });
      }
    }

    result = await run(auraAgent, result.state);
  }

  if (result.interruptions?.length) {
    return "The agent stopped because a write action still requires approval.";
  }

  const output = String(result.finalOutput ?? "No response generated.").trim();
  return input.outputMode === "local" ? output : compactDiscordOutput(output);
}
