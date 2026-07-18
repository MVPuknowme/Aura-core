import { after } from "next/server";
import { getBot } from "@/lib/bot";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  return getBot().webhooks.discord(request, {
    waitUntil: (task) => after(() => task),
  });
}
