const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-06-14-skygrid-protocol-sponsors";

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-SKYGRID-Product": PRODUCT,
      "X-SKYGRID-Runtime": VERSION
    }
  });
}

function sponsorUrl(env = {}) {
  const handle = env.GITHUB_SPONSORS_HANDLE || "MVPuknowme";
  return env.GITHUB_SPONSORS_URL || `https://github.com/sponsors/${handle}`;
}

function base(env = {}) {
  return {
    ok: true,
    status: "online",
    service: PRODUCT,
    runtime: "cloudflare-worker",
    version: VERSION,
    mode: "controlled_pilot",
    sentinel: "fail_closed",
    public_runtime: true,
    payment_execution: true,
    payment_provider: "github_sponsors",
    sponsor_url: sponsorUrl(env),
    checkout_route: "/api/sponsors/link",
    legacy_route: "/api/stripe/device-link",
    device_activation: false,
    production_failover: false,
    private_data_movement: false,
    generated_at: new Date().toISOString()
  };
}

function routes() {
  return [
    "/",
    "/health",
    "/health.json",
    "/api/skygrid/status",
    "/api/skygrid/intake",
    "/api/highway/status",
    "/api/sponsors/link",
    "/api/stripe/device-link"
  ];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const state = base(env);

    if (["/", "/health", "/health.json"].includes(url.pathname)) {
      return json({
        ...state,
        routes: routes()
      });
    }

    if (url.pathname === "/api/skygrid/status" || url.pathname === "/api/highway/status") {
      return json({
        ...state,
        route: url.pathname,
        skygrid_protocol: "ready",
        transport: ["https"],
        protected_routes: true,
        highway: "advisory",
        routing: "pilot_only"
      });
    }

    if (url.pathname === "/api/sponsors/link") {
      return json({
        ok: true,
        status: "online",
        service: PRODUCT,
        route: "/api/sponsors/link",
        mode: "controlled_pilot",
        sentinel: "fail_closed",
        support_provider: "github_sponsors",
        sponsor_url: sponsorUrl(env),
        generated_at: new Date().toISOString()
      });
    }

    if (url.pathname === "/api/stripe/device-link") {
      return json({
        ...state,
        route: "/api/stripe/device-link",
        note: "Legacy compatibility route. Active provider is GitHub Sponsors. Use /api/sponsors/link."
      });
    }

    if (url.pathname === "/api/skygrid/intake") {
      if (request.method !== "POST") {
        return json({ ok: false, error: "method_not_allowed", allowed: ["POST"] }, 405);
      }

      let payload = {};
      try {
        payload = await request.json();
      } catch {
        payload = {};
      }

      return json(
        {
          accepted: true,
          mode: "controlled_pilot",
          service: PRODUCT,
          runtime: "cloudflare-worker",
          message: "Pilot intake acknowledged. No production failover activated.",
          payload_received: Boolean(Object.keys(payload).length),
          generated_at: new Date().toISOString()
        },
        202
      );
    }

    return json(
      {
        ...state,
        ok: false,
        error: "route_not_found",
        path: url.pathname,
        routes: routes()
      },
      404
    );
  }
};
