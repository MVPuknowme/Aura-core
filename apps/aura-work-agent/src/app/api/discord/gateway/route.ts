import { after } from "next/server";
import { getBot, getDiscordAdapter } from "@/lib/bot";

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

  await getBot().initialize();

  const webhookUrl = new URL("/api/webhooks/discord", request.url).toString();

  return getDiscordAdapter().startGatewayListener(
    { waitUntil: (task: Promise<unknown>) => after(() => task) },
    600_000,
    undefined,
    webhookUrl,
  );
}
