import { Chat } from "chat";
import {
  createDiscordAdapter,
  DiscordInteractionResponseFlag,
} from "@chat-adapter/discord";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createRedisState } from "@chat-adapter/state-redis";
import { runAuraAgent } from "@/lib/agent";

let botInstance: Chat | undefined;
let discordAdapterInstance: ReturnType<typeof createDiscordAdapter> | undefined;

type AuthorLike = {
  id?: string;
  userId?: string;
  fullName?: string;
  userName?: string;
};

function actor(author: AuthorLike | undefined): { id: string; name: string } {
  return {
    id: String(author?.id ?? author?.userId ?? "unknown"),
    name: String(author?.fullName ?? author?.userName ?? "Discord user"),
  };
}

function createState() {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return createRedisState({
      url: redisUrl,
      keyPrefix: "skygrid:aura-work-agent",
    });
  }
  return createMemoryState();
}

async function skygridStatus(): Promise<string> {
  const statusUrl = process.env.SKYGRID_STATUS_URL;
  if (!statusUrl) {
    return "SKYGRID_STATUS_URL is not configured.";
  }

  try {
    const response = await fetch(statusUrl, {
      headers: { "User-Agent": "skygrid-aura-work-agent" },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    const body = await response.text();
    return [
      `SKYGRID status: ${response.status} ${response.statusText}`,
      `Endpoint: ${statusUrl}`,
      body ? `Response: ${body.slice(0, 1_200)}` : "Response body: empty",
    ].join("\n");
  } catch (error) {
    return `SKYGRID status check failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function registerHandlers(bot: Chat): void {
  bot.onDirectMessage(async (thread, message) => {
    const sender = actor(message.author as AuthorLike);
    const response = await runAuraAgent({
      prompt: message.text,
      actorId: sender.id,
      actorName: sender.name,
    });
    await thread.post(response);
  });

  bot.onNewMention(async (thread, message) => {
    const sender = actor(message.author as AuthorLike);
    const response = await runAuraAgent({
      prompt: message.text,
      actorId: sender.id,
      actorName: sender.name,
    });
    await thread.post(response);
  });

  bot.onSlashCommand("/aura", async (event) => {
    const sender = actor(event.user as AuthorLike);
    const response = await runAuraAgent({
      prompt: event.text || "Explain what you can do.",
      actorId: sender.id,
      actorName: sender.name,
    });
    await event.channel.post(response);
  });

  bot.onSlashCommand("/github", async (event) => {
    const sender = actor(event.user as AuthorLike);
    const response = await runAuraAgent({
      prompt: event.text || "Summarize the allowlisted GitHub repository.",
      actorId: sender.id,
      actorName: sender.name,
    });
    await event.channel.post(response);
  });

  bot.onSlashCommand("/skygrid", async (event) => {
    await event.channel.post(await skygridStatus());
  });
}

export function getDiscordAdapter(): ReturnType<typeof createDiscordAdapter> {
  if (discordAdapterInstance) {
    return discordAdapterInstance;
  }

  discordAdapterInstance = createDiscordAdapter({
    botToken: process.env.DISCORD_BOT_TOKEN,
    publicKey: process.env.DISCORD_PUBLIC_KEY,
    applicationId: process.env.DISCORD_APPLICATION_ID,
    mentionRoleIds: (process.env.DISCORD_MENTION_ROLE_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    interactionFlags: ({ command }) =>
      command === "/github"
        ? DiscordInteractionResponseFlag.Ephemeral
        : undefined,
  });

  return discordAdapterInstance;
}

export function getBot(): Chat {
  if (botInstance) {
    return botInstance;
  }

  botInstance = new Chat({
    userName: "aura",
    adapters: { discord: getDiscordAdapter() },
    state: createState(),
    dedupeTtlMs: 30_000,
    streamingUpdateIntervalMs: 1_000,
    fallbackStreamingPlaceholderText: "Aura is evaluating…",
    logger: process.env.NODE_ENV === "production" ? "info" : "debug",
  });

  registerHandlers(botInstance);
  return botInstance;
}
