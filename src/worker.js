export default {
  async fetch(request) {
    const url = new URL(request.url);

    const base = {
      ok: true,
      status: "online",
      service: "SKYGRID Emergency Data On-Ramp",
      mode: "controlled_pilot",
      sentinel: "fail_closed",
      public_runtime: true,
      payment_execution: false,
      device_activation: false,
      production_failover: false,
      private_data_movement: false,
      generated_at: new Date().toISOString()
    };

    if (url.pathname === "/" || url.pathname === "/health.json") {
      return Response.json({
        ...base,
        routes: [
          "/",
          "/health.json",
          "/api/highway/status",
          "/api/stripe/device-link"
        ]
      });
    }

    if (url.pathname === "/api/highway/status") {
      return Response.json({
        ...base,
        route: "/api/highway/status",
        highway: "advisory",
        routing: "pilot_only"
      });
    }

    if (url.pathname === "/api/stripe/device-link") {
      return Response.json({
        ...base,
        route: "/api/stripe/device-link",
        stripe_mode: "test_or_disabled",
        livemode: false,
        payment_execution: false,
        device_activation: false
      });
    }

    return Response.json(
      {
        ...base,
        ok: false,
        error: "not_found",
        path: url.pathname
      },
      { status: 404 }
    );
  }
};
