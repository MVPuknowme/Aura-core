import { handlePilotIntake } from "./pilot-intake.js";
import {
  acceptCapacityAgreement,
  createCapacityOffer,
  persistCapacityOffer,
  readCapacityLease
} from "./capacity-lease.js";
import { capacityLeasePage } from "./lease-page.js";
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

function html(content, status = 200) {
  return new Response(content, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "x-skygrid-edge": "cloudflare-worker"
    }
  });
}

async function readLeaseBody(request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > 32_768) {
    return { ok: false, status: 413, reason: "lease_payload_too_large" };
  }
  try {
    const body = JSON.parse(raw || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { ok: false, status: 400, reason: "lease_payload_must_be_object" };
    }
    return { ok: true, body };
  } catch {
    return { ok: false, status: 400, reason: "lease_payload_invalid_json" };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin =
      env.SKYGRID_ORIGIN || "https://aurcore.skygrid-protocol.net";

    if (url.pathname === "/lease") {
      return html(capacityLeasePage({ apiBase: "/edge/lease" }));
    }

    if (url.pathname === "/edge/lease/preflight") {
      if (request.method !== "POST") {
        return json({ ok: false, reason: "post_required" }, 405);
      }
      const parsed = await readLeaseBody(request);
      if (!parsed.ok) return json(parsed, parsed.status);

      try {
        const result = await createCapacityOffer(parsed.body);
        await persistCapacityOffer(env.MY_DB, result);
        return json({
          ok: true,
          system: "SKYGRID Emergency Data On-Ramp",
          persistence: "d1",
          offer: result.offer,
          agreement_token: result.agreementToken
        }, 201);
      } catch (error) {
        console.error("Capacity preflight failed", error);
        return json({
          ok: false,
          reason: "capacity_preflight_failed",
          sentinel: "fail_closed"
        }, 503);
      }
    }

    if (url.pathname === "/edge/lease/agreements") {
      if (request.method !== "POST") {
        return json({ ok: false, reason: "post_required" }, 405);
      }
      const parsed = await readLeaseBody(request);
      if (!parsed.ok) return json(parsed, parsed.status);

      try {
        const result = await acceptCapacityAgreement(env.MY_DB, parsed.body);
        return json(result, result.status);
      } catch (error) {
        console.error("Capacity agreement failed", error);
        return json({
          ok: false,
          reason: "capacity_agreement_persistence_failed",
          sentinel: "fail_closed"
        }, 503);
      }
    }

    if (url.pathname.startsWith("/edge/lease/status/")) {
      if (request.method !== "GET") {
        return json({ ok: false, reason: "get_required" }, 405);
      }
      const offerId = decodeURIComponent(url.pathname.split("/").pop() || "");
      const agreementToken = request.headers.get("x-skygrid-agreement-token") || "";
      try {
        const result = await readCapacityLease(env.MY_DB, offerId, agreementToken);
        return json(result, result.status);
      } catch (error) {
        console.error("Capacity lease lookup failed", error);
        return json({ ok: false, reason: "capacity_lease_lookup_failed" }, 503);
      }
    }

    if (url.pathname === "/edge/intake") {
      if (request.method !== "POST") {
        return json(
          {
            ok: false,
            system: "SKYGRID Emergency Data On-Ramp",
            message: "POST is required for /edge/intake."
          },
          405
        );
      }

      return handlePilotIntake(request, env, {
        origin
      });
    }
    if (url.pathname === "/edge/health") {
      return json({
        ok: true,
        system: "SKYGRID Emergency Data On-Ramp",
        edge: "cloudflare-worker",
        origin,
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === "/edge/d1/health") {
      if (!env.MY_DB) {
        return json(
          {
            ok: false,
            system: "SKYGRID Emergency Data On-Ramp",
            edge: "cloudflare-worker",
            database: {
              binding: "MY_DB",
              table: "SkygridOrders",
              tableExists: false,
            },
            message: "D1 binding MY_DB is unavailable.",
            timestamp: new Date().toISOString(),
          },
          503
        );
      }

      try {
        const result = await env.MY_DB
          .prepare("SELECT COUNT(*) AS orderCount FROM SkygridOrders")
          .first();

        return json({
          ok: true,
          system: "SKYGRID Emergency Data On-Ramp",
          edge: "cloudflare-worker",
          database: {
            binding: "MY_DB",
            table: "SkygridOrders",
            tableExists: true,
            orderCount: Number(result?.orderCount ?? 0),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("D1 health check failed", error);

        return json(
          {
            ok: false,
            system: "SKYGRID Emergency Data On-Ramp",
            edge: "cloudflare-worker",
            database: {
              binding: "MY_DB",
              table: "SkygridOrders",
              tableExists: false,
            },
            message: "D1 health check failed.",
            timestamp: new Date().toISOString(),
          },
          503
        );
      }
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
              accept:
                route === "/"
                  ? "text/html,application/json"
                  : "application/json",
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
        message:
          "Use /lease, /edge/lease/preflight, /edge/lease/agreements, /edge/intake, /edge/health, /edge/d1/health, or /edge/proof.",
      },
      404
    );
  },
};
