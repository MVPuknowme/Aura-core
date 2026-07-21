export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const required = [
    "OPENAI_API_KEY",
    "DISCORD_BOT_TOKEN",
    "DISCORD_PUBLIC_KEY",
    "DISCORD_APPLICATION_ID",
    "GITHUB_TOKEN",
    "DISCORD_OPERATOR_USER_IDS",
  ];

  const missing = required.filter((name) => !process.env[name]);

  return Response.json(
    {
      ok: missing.length === 0,
      service: "Aura Work Agent",
      product: "SKYGRID Emergency Data On-Ramp",
      runtime: "discord-openai-github",
      state: process.env.REDIS_URL ? "redis" : "memory",
      missing,
      timestamp: new Date().toISOString(),
    },
    { status: missing.length === 0 ? 200 : 503 },
  );
}
