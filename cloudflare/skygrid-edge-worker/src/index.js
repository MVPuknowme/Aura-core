const REQUIRED_ROUTES = [
  "/",
  "/health.json",
  "/api/highway/status",
  "/api/highway/postman",
  "/api/pay/quote?amount=25",
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-skygrid-edge": "cloudflare-worker",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = env.SKYGRID_ORIGIN || "https://aurcore.skygrid-protocol.net";

    if (url.pathname === "/edge/health") {
      return json({
        ok: true,
        system: "SKYGRID Emergency Data On-Ramp",
        edge: "cloudflare-worker",
        origin,
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/edge/proof") {
      const checks = [];

      for (const route of REQUIRED_ROUTES) {
        const target = new URL(route, origin);
        const started = Date.now();

        try {
          const response = await fetch(target.toString(), {
            method: "GET",
            headers: {
              "accept": route === "/" ? "text/html,application/json" : "application/json",
              "user-agent": "SKYGRID-Cloudflare-Edge-Proof/1.0",
            },
          });

          checks.push({
            route,
            url: target.toString(),
            ok: response.ok,
            status: response.status,
            contentType: response.headers.get("content-type"),
            elapsedMs: Date.now() - started,
          });
        } catch (error) {
          checks.push({
            route,
            url: target.toString(),
            ok: false,
            error: String(error),
            elapsedMs: Date.now() - started,
          });
        }
      }

      return json({
        ok: checks.every((check) => check.ok),
        system: "SKYGRID Emergency Data On-Ramp",
        edge: "cloudflare-worker",
        origin,
        checks,
        timestamp: new Date().toISOString(),
      });
    }

    return json(
      {
        ok: false,
        system: "SKYGRID Emergency Data On-Ramp",
        message: "Use /edge/health or /edge/proof for Cloudflare edge validation.",
      },
      404
    );
  },
};
