import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const MODE = "controlled_pilot";
const TOKEN_VERSION = 1;
const DEFAULT_TTL_SECONDS = 3600;
const SUPPORTED_PLATFORMS = [
  "windows-x64",
  "windows-arm64",
  "macos-arm64",
  "macos-x64",
  "linux-x64",
  "linux-arm64",
  "container"
];

function nowIso() {
  return new Date().toISOString();
}

function base64urlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getBrokerSecret() {
  const secret = process.env.SKYGRID_DEPLOYMENT_BROKER_SECRET || "";
  if (secret.length < 32) {
    throw new Error("deployment_broker_secret_not_configured");
  }
  return secret;
}

function sign(encodedPayload) {
  return createHmac("sha256", getBrokerSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createEnrollmentToken(input = {}, clock = Date.now) {
  const issuedAt = Math.floor(clock() / 1000);
  const ttlSeconds = Math.min(
    Math.max(Number(input.ttl_seconds || DEFAULT_TTL_SECONDS), 60),
    86400
  );
  const allowedPlatforms = Array.isArray(input.allowed_platforms)
    ? input.allowed_platforms.filter((platform) => SUPPORTED_PLATFORMS.includes(platform))
    : ["windows-x64"];

  if (allowedPlatforms.length === 0) {
    throw new Error("no_supported_platforms_requested");
  }

  const payload = {
    v: TOKEN_VERSION,
    jti: randomUUID(),
    organization_id: String(input.organization_id || "pilot"),
    engineer_email: input.engineer_email ? String(input.engineer_email) : null,
    deployment_profile: String(input.deployment_profile || "diagnostic"),
    allowed_platforms: allowedPlatforms,
    max_uses: 1,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds
  };

  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  return {
    token: `${encodedPayload}.${sign(encodedPayload)}`,
    payload
  };
}

export function verifyEnrollmentToken(token, clock = Date.now) {
  const [encodedPayload, suppliedSignature, extra] = String(token || "").split(".");
  if (!encodedPayload || !suppliedSignature || extra) {
    return { ok: false, reason: "invalid_token_format" };
  }

  let expectedSignature;
  try {
    expectedSignature = sign(encodedPayload);
  } catch (error) {
    return { ok: false, reason: error.message };
  }

  if (!constantTimeEqual(suppliedSignature, expectedSignature)) {
    return { ok: false, reason: "invalid_token_signature" };
  }

  let payload;
  try {
    payload = JSON.parse(base64urlDecode(encodedPayload));
  } catch {
    return { ok: false, reason: "invalid_token_payload" };
  }

  if (payload.v !== TOKEN_VERSION || !payload.jti || !Array.isArray(payload.allowed_platforms)) {
    return { ok: false, reason: "invalid_token_claims" };
  }

  if (Math.floor(clock() / 1000) >= Number(payload.exp || 0)) {
    return { ok: false, reason: "enrollment_link_expired", payload };
  }

  return { ok: true, payload };
}

export function detectPlatform(userAgent = "", requestedPlatform = "") {
  if (SUPPORTED_PLATFORMS.includes(requestedPlatform)) return requestedPlatform;

  const ua = String(userAgent).toLowerCase();
  const arm = /arm64|aarch64/.test(ua);
  if (/windows/.test(ua)) return arm ? "windows-arm64" : "windows-x64";
  if (/macintosh|mac os x/.test(ua)) return arm ? "macos-arm64" : "macos-x64";
  if (/linux/.test(ua)) return arm ? "linux-arm64" : "linux-x64";
  return null;
}

function artifactCatalog() {
  return {
    "windows-x64": artifact("SKYGRID_WINDOWS_X64_URL", "SKYGRID_WINDOWS_X64_SHA256", "msi"),
    "windows-arm64": artifact("SKYGRID_WINDOWS_ARM64_URL", "SKYGRID_WINDOWS_ARM64_SHA256", "msix"),
    "macos-arm64": artifact("SKYGRID_MACOS_ARM64_URL", "SKYGRID_MACOS_ARM64_SHA256", "pkg"),
    "macos-x64": artifact("SKYGRID_MACOS_X64_URL", "SKYGRID_MACOS_X64_SHA256", "pkg"),
    "linux-x64": artifact("SKYGRID_LINUX_X64_URL", "SKYGRID_LINUX_X64_SHA256", "deb"),
    "linux-arm64": artifact("SKYGRID_LINUX_ARM64_URL", "SKYGRID_LINUX_ARM64_SHA256", "deb"),
    container: artifact("SKYGRID_CONTAINER_IMAGE", "SKYGRID_CONTAINER_DIGEST", "oci")
  };
}

function artifact(urlVariable, digestVariable, format) {
  const url = process.env[urlVariable] || null;
  const sha256 = process.env[digestVariable] || null;
  return {
    configured: Boolean(url && sha256),
    url,
    sha256,
    format,
    signature_required: true
  };
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.end(JSON.stringify(payload, null, 2));
}

function html(res, status, title, body) {
  res.statusCode = status;
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>:root{color-scheme:dark}body{margin:0;font-family:system-ui;background:#07101f;color:#edf6ff}main{max-width:760px;margin:0 auto;padding:48px 20px}.card{border:1px solid #315a7d;border-radius:24px;padding:28px;background:#0e1e3a}code{overflow-wrap:anywhere}.notice{border-left:4px solid #f59e0b;padding:12px;background:#2b2115}.ok{border-left-color:#22d3ee;background:#102a35}</style></head><body><main><section class="card">${body}</section></main></body></html>`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function routeContext(req) {
  const host = req.headers.host || "deploy.skygrid-protocol.net";
  const url = new URL(req.url || "/", `https://${host}`);
  const enrollmentMatch = url.pathname.match(/^\/enroll\/([^/]+)$/);
  const redeemMatch = url.pathname.match(/^\/api\/enrollments\/([^/]+)\/redeem$/);
  return {
    url,
    action: url.searchParams.get("action"),
    token: url.searchParams.get("token") || enrollmentMatch?.[1] || redeemMatch?.[1] || null,
    isIssue: url.pathname === "/api/enrollments",
    isView: Boolean(enrollmentMatch) || url.searchParams.get("action") === "view",
    isRedeem: Boolean(redeemMatch) || url.searchParams.get("action") === "redeem"
  };
}

function adminAuthorized(req) {
  const configured = process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY || "";
  const supplied = req.headers["x-skygrid-admin-key"] || "";
  return configured.length >= 24 && constantTimeEqual(configured, supplied);
}

export default async function handler(req, res) {
  const route = routeContext(req);

  if (req.method === "GET" && route.url.pathname === "/api/deployment-broker/health") {
    return json(res, 200, {
      ok: true,
      product: PRODUCT,
      component: "deployment_broker",
      mode: MODE,
      sentinel: "fail_closed",
      durable_single_use_store: false,
      timestamp: nowIso()
    });
  }

  if (req.method === "POST" && route.isIssue) {
    if (!adminAuthorized(req)) {
      return json(res, 403, { ok: false, reason: "deployment_admin_authorization_required" });
    }

    const body = await readBody(req);
    try {
      const enrollment = createEnrollmentToken(body);
      const origin = process.env.SKYGRID_DEPLOYMENT_ORIGIN || "https://deploy.skygrid-protocol.net";
      return json(res, 201, {
        ok: true,
        product: PRODUCT,
        mode: MODE,
        enrollment_id: enrollment.payload.jti,
        enrollment_url: `${origin}/enroll/${enrollment.token}`,
        expires_at: new Date(enrollment.payload.exp * 1000).toISOString(),
        allowed_platforms: enrollment.payload.allowed_platforms,
        deployment_profile: enrollment.payload.deployment_profile,
        maximum_uses: 1,
        single_use_enforcement: "requires_persistent_store_before_production",
        no_installation_executed: true
      });
    } catch (error) {
      return json(res, 503, { ok: false, reason: error.message });
    }
  }

  if (req.method === "GET" && route.isView) {
    const verification = verifyEnrollmentToken(route.token);
    if (!verification.ok) {
      return html(res, 403, "Enrollment unavailable", `<h1>Enrollment unavailable</h1><p class="notice">${escapeHtml(verification.reason)}</p>`);
    }

    const requested = route.url.searchParams.get("platform") || "";
    const detected = detectPlatform(req.headers["user-agent"] || "", requested);
    const allowed = detected && verification.payload.allowed_platforms.includes(detected);
    const artifact = detected ? artifactCatalog()[detected] : null;

    return html(res, allowed ? 200 : 409, "SKYGRID node enrollment", `
      <p>SKYGRID Deployment Broker</p>
      <h1>Authorized node enrollment</h1>
      <p>Organization: <code>${escapeHtml(verification.payload.organization_id)}</code></p>
      <p>Profile: <code>${escapeHtml(verification.payload.deployment_profile)}</code></p>
      <p>Detected platform: <code>${escapeHtml(detected || "unknown")}</code></p>
      <p>Allowed platforms: <code>${escapeHtml(verification.payload.allowed_platforms.join(", "))}</code></p>
      <p class="notice ${allowed ? "ok" : ""}">${allowed ? (artifact?.configured ? "Approved package is configured. Redeem through the authenticated bootstrap client." : "Platform approved; signed package is not configured yet.") : "This device is not approved by the enrollment link."}</p>
      <p>No software is installed by opening this page.</p>
    `);
  }

  if (req.method === "POST" && route.isRedeem) {
    const verification = verifyEnrollmentToken(route.token);
    if (!verification.ok) return json(res, 403, verification);

    const body = await readBody(req);
    const platform = detectPlatform(req.headers["user-agent"] || "", body.platform || "");
    if (!platform || !verification.payload.allowed_platforms.includes(platform)) {
      return json(res, 403, { ok: false, reason: "platform_not_authorized", platform });
    }

    const artifact = artifactCatalog()[platform];
    if (!artifact?.configured) {
      return json(res, 503, {
        ok: false,
        reason: "signed_artifact_not_configured",
        platform,
        no_installation_executed: true
      });
    }

    return json(res, 202, {
      ok: true,
      product: PRODUCT,
      mode: MODE,
      event_type: "enrollment_redemption_approved",
      enrollment_id: verification.payload.jti,
      organization_id: verification.payload.organization_id,
      deployment_profile: verification.payload.deployment_profile,
      platform,
      artifact,
      receipt_id: `redeem_${randomUUID()}`,
      redeemed_at: nowIso(),
      single_use_enforcement: "requires_persistent_store_before_production",
      private_key_generated_on_device: true,
      no_wallet_signing: true,
      no_payment_execution: true,
      no_production_failover: true
    });
  }

  return json(res, 404, { ok: false, reason: "deployment_broker_route_not_found" });
}
