import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  createEnrollmentToken,
  detectPlatform,
  verifyEnrollmentToken
} from "./deployment-broker.mjs";
import {
  createEnrollmentRecord,
  enrollmentLedgerStatus,
  getEnrollmentRecord,
  redeemEnrollmentRecord
} from "../lib/deployment-enrollment-ledger.mjs";

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const MODE = "controlled_pilot";

function nowIso() {
  return new Date().toISOString();
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
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
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { return {}; }
}

function routeContext(req) {
  const host = req.headers.host || "deploy.skygrid-protocol.net";
  const url = new URL(req.url || "/", `https://${host}`);
  const enrollmentMatch = url.pathname.match(/^\/enroll\/([^/]+)$/);
  const redeemMatch = url.pathname.match(/^\/api\/enrollments\/([^/]+)\/redeem$/);
  return {
    url,
    token: enrollmentMatch?.[1] || redeemMatch?.[1] || null,
    isIssue: url.pathname === "/api/enrollments",
    isView: Boolean(enrollmentMatch),
    isRedeem: Boolean(redeemMatch)
  };
}

function adminAuthorized(req) {
  const configured = process.env.SKYGRID_DEPLOYMENT_ADMIN_KEY || "";
  const supplied = req.headers["x-skygrid-admin-key"] || "";
  return configured.length >= 24 && constantTimeEqual(configured, supplied);
}

function artifact(platform) {
  const variables = {
    "windows-x64": ["SKYGRID_WINDOWS_X64_URL", "SKYGRID_WINDOWS_X64_SHA256", "msi"],
    "windows-arm64": ["SKYGRID_WINDOWS_ARM64_URL", "SKYGRID_WINDOWS_ARM64_SHA256", "msix"],
    "macos-arm64": ["SKYGRID_MACOS_ARM64_URL", "SKYGRID_MACOS_ARM64_SHA256", "pkg"],
    "macos-x64": ["SKYGRID_MACOS_X64_URL", "SKYGRID_MACOS_X64_SHA256", "pkg"],
    "linux-x64": ["SKYGRID_LINUX_X64_URL", "SKYGRID_LINUX_X64_SHA256", "deb"],
    "linux-arm64": ["SKYGRID_LINUX_ARM64_URL", "SKYGRID_LINUX_ARM64_SHA256", "deb"],
    container: ["SKYGRID_CONTAINER_IMAGE", "SKYGRID_CONTAINER_DIGEST", "oci"]
  };
  const entry = variables[platform];
  if (!entry) return null;
  const [urlName, digestName, format] = entry;
  const url = process.env[urlName] || null;
  const sha256 = process.env[digestName] || null;
  return { configured: Boolean(url && sha256), url, sha256, format, signature_required: true };
}

export default async function handler(req, res) {
  const route = routeContext(req);
  const ledger = enrollmentLedgerStatus();

  if (req.method === "GET" && route.url.pathname === "/api/deployment-broker/health") {
    return json(res, ledger.configured ? 200 : 503, {
      ok: ledger.configured,
      product: PRODUCT,
      component: "deployment_broker",
      mode: MODE,
      sentinel: "fail_closed",
      durable_single_use_store: ledger.durable_for_local_pilot,
      ledger: {
        adapter: ledger.adapter,
        configured: ledger.configured,
        production_ready: ledger.production_ready,
        hosted_serverless: ledger.hosted_serverless
      },
      timestamp: nowIso()
    });
  }

  if (req.method === "POST" && route.isIssue) {
    if (!adminAuthorized(req)) {
      return json(res, 403, { ok: false, reason: "deployment_admin_authorization_required" });
    }
    if (!ledger.configured) {
      return json(res, 503, { ok: false, reason: "enrollment_ledger_not_configured" });
    }

    const body = await readBody(req);
    try {
      const enrollment = createEnrollmentToken(body);
      await createEnrollmentRecord(enrollment.payload);
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
        lifecycle_state: "issued",
        maximum_uses: 1,
        single_use_enforcement: "atomic_filesystem_ledger",
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

    let record;
    try { record = await getEnrollmentRecord(verification.payload.jti); }
    catch (error) { return html(res, 503, "Enrollment unavailable", `<h1>Enrollment unavailable</h1><p class="notice">${escapeHtml(error.message)}</p>`); }
    if (!record) return html(res, 403, "Enrollment unavailable", `<h1>Enrollment unavailable</h1><p class="notice">enrollment_record_not_found</p>`);
    if (record.lifecycle_state === "redeemed") return html(res, 409, "Enrollment already used", `<h1>Enrollment already used</h1><p class="notice">This one-time link has already been redeemed.</p>`);

    const requested = route.url.searchParams.get("platform") || "";
    const detected = detectPlatform(req.headers["user-agent"] || "", requested);
    const allowed = detected && verification.payload.allowed_platforms.includes(detected);
    const selectedArtifact = detected ? artifact(detected) : null;
    return html(res, allowed ? 200 : 409, "SKYGRID node enrollment", `
      <p>SKYGRID Deployment Broker</p><h1>Authorized node enrollment</h1>
      <p>Enrollment: <code>${escapeHtml(record.enrollment_id)}</code></p>
      <p>Profile: <code>${escapeHtml(record.deployment_profile)}</code></p>
      <p>State: <code>${escapeHtml(record.lifecycle_state)}</code></p>
      <p>Detected platform: <code>${escapeHtml(detected || "unknown")}</code></p>
      <p class="notice ${allowed ? "ok" : ""}">${allowed ? (selectedArtifact?.configured ? "Approved signed package is configured." : "Platform approved; signed package is not configured yet.") : "This device is not approved by the enrollment link."}</p>
      <p>No software is installed by opening this page.</p>`);
  }

  if (req.method === "POST" && route.isRedeem) {
    const verification = verifyEnrollmentToken(route.token);
    if (!verification.ok) return json(res, 403, verification);

    const body = await readBody(req);
    const platform = detectPlatform(req.headers["user-agent"] || "", body.platform || "");
    if (!platform || !verification.payload.allowed_platforms.includes(platform)) {
      return json(res, 403, { ok: false, reason: "platform_not_authorized", platform });
    }

    const selectedArtifact = artifact(platform);
    if (!selectedArtifact?.configured) {
      return json(res, 503, { ok: false, reason: "signed_artifact_not_configured", platform, no_installation_executed: true });
    }

    const receiptId = `redeem_${randomUUID()}`;
    let redemption;
    try {
      redemption = await redeemEnrollmentRecord(verification.payload.jti, { platform, receipt_id: receiptId });
    } catch (error) {
      return json(res, 503, { ok: false, reason: error.message });
    }
    if (!redemption.ok) {
      const status = redemption.reason === "enrollment_link_already_redeemed" ? 409 : 403;
      return json(res, status, { ok: false, reason: redemption.reason, enrollment_id: verification.payload.jti, no_installation_executed: true });
    }

    return json(res, 202, {
      ok: true,
      product: PRODUCT,
      mode: MODE,
      event_type: "enrollment_redemption_approved",
      enrollment_id: verification.payload.jti,
      lifecycle_state: redemption.record.lifecycle_state,
      organization_id: verification.payload.organization_id,
      deployment_profile: verification.payload.deployment_profile,
      platform,
      artifact: selectedArtifact,
      receipt_id: receiptId,
      redeemed_at: redemption.record.redeemed_at,
      single_use_enforcement: "atomic_filesystem_ledger",
      private_key_generated_on_device: true,
      no_wallet_signing: true,
      no_payment_execution: true,
      no_production_failover: true
    });
  }

  return json(res, 404, { ok: false, reason: "deployment_broker_route_not_found" });
}
