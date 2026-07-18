import { after } from "next/server";
import { getBot } from "@/lib/bot";

export const runtime = "nodejs";
export const maxDuration = 800;

export async function GET(request: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const bot = getBot();
  await bot.initialize();

  const discord = bot.getAdapter("discord");
  const webhookUrl = new URL("/api/webhooks/discord", request.url).toString();

  return discord.startGatewayListener(
    { waitUntil: (task) => after(() => task) },
    600_000,
    undefined,
    webhookUrl,
  );
}
