import { z } from "zod";
import { runAuraAgent } from "@/lib/agent";
import { DEFAULT_AURA_LOCAL_PREFERENCES } from "@/lib/aura-profile";

export const runtime = "nodejs";
export const maxDuration = 120;

const preferencesSchema = z.object({
  preferredName: z.string().trim().min(1).max(40),
  tone: z.enum(["warm-precise", "direct-operational", "encouraging-playful"]),
  responseLength: z.enum(["short", "balanced", "detailed"]),
  emojiLevel: z.enum(["none", "light", "expressive"]),
  familyFriendly: z.boolean(),
});

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(8_000),
  preferences: preferencesSchema.default(DEFAULT_AURA_LOCAL_PREFERENCES),
  feedbackCount: z.number().int().min(0).max(10_000).default(0),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        error: "Invalid local Aura request.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const response = await runAuraAgent({
      prompt: parsed.data.prompt,
      actorId: "local-browser",
      actorName: parsed.data.preferences.preferredName,
      preferences: parsed.data.preferences,
      feedbackCount: parsed.data.feedbackCount,
      outputMode: "local",
    });

    return Response.json({ ok: true, response });
  } catch (error) {
    console.error("Local Aura request failed", error);
    return Response.json(
      {
        ok: false,
        error: "Aura could not complete this local request.",
      },
      { status: 500 },
    );
  }
}
