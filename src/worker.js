export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const timestamp = new Date().toISOString();

    const health = {
      status: "ok",
      service: "SkyGrid External Edge",
      edge: "cloudflare",
      site: env.SKYGRID_SITE || "west01",
      environment: env.SKYGRID_ENV || "production",
      primary_region: env.SKYGRID_PRIMARY_REGION || "us-west-1",
      pipeline_region: env.SKYGRID_PIPELINE_REGION || "us-east-1",
      health_standard: env.SKYGRID_HEALTH_STANDARD || "skygrid-best-range-health-standard",
      aws_status: "external-upstream-functional-per-operator",
      timestamp
    };

    if (url.pathname === "/health" || url.pathname === "/api/health") {
      return json(health, 200);
    }

    if (url.pathname === "/route/state") {
      return json({
        status: "ok",
        route: "skygrid-external-edge",
        mode: "cloudflare-frontdoor",
        upstream: "aws-functional-not-proxied-by-default",
        timestamp
      }, 200);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(renderHome(health), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    return json({
      status: "not_found",
      message: "SkyGrid Worker active; route not configured.",
      path: url.pathname,
      available_routes: ["/", "/health", "/api/health", "/route/state"],
      timestamp
    }, 404);
  }
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*"
    }
  });
}

function renderHome(health) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SkyGrid External Edge</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at top, #1a1f3b, #0b1020 65%); color: #f8fafc; }
    main { width: min(920px, calc(100vw - 32px)); border: 1px solid rgba(125, 211, 252, .28); border-radius: 28px; padding: 32px; background: rgba(15, 23, 42, .72); box-shadow: 0 24px 80px rgba(0,0,0,.4); }
    .pill { display: inline-flex; gap: 8px; align-items: center; border: 1px solid rgba(34,211,238,.38); border-radius: 999px; padding: 8px 12px; color: #67e8f9; background: rgba(8,145,178,.12); }
    h1 { font-size: clamp(2.2rem, 7vw, 5rem); line-height: .95; margin: 22px 0; letter-spacing: -0.06em; }
    p { color: #cbd5e1; font-size: 1.1rem; line-height: 1.7; max-width: 68ch; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 18px; padding: 18px; background: rgba(2, 6, 23, .72); color: #bae6fd; border: 1px solid rgba(148, 163, 184, .22); }
    a { color: #67e8f9; }
  </style>
</head>
<body>
  <main>
    <span class="pill">🚀 SkyGrid Worker Active</span>
    <h1>SkyGrid External Edge</h1>
    <p>Cloudflare is now serving the SkyGrid external edge. AWS can remain the functional upstream while this Worker provides the public health, route-state, and front-door proof layer.</p>
    <p><a href="/health">Open /health</a> · <a href="/route/state">Open /route/state</a></p>
    <pre>${escapeHtml(JSON.stringify(health, null, 2))}</pre>
  </main>
</body>
</html>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[char]));
}
