import fs from "node:fs";

const file = "api/runtime.mjs";
let s = fs.readFileSync(file, "utf8");
let changed = false;

const oldStatus = `  if (req.method === "GET" && ["/health.json", "/api/skygrid/status", "/api/highway/status"].includes(path)) return json(res, 200, healthPayload(path));`;

const newStatus = `  if (req.method === "GET" && ["/health.json", "/api/health", "/api/status", "/api/skygrid/status", "/api/highway/status"].includes(path)) {
    return json(res, 200, healthPayload(path));
  }`;

if (!s.includes('"/api/status"')) {
  if (!s.includes(oldStatus)) {
    console.error("Could not find the status route line to patch.");
    process.exit(1);
  }
  s = s.replace(oldStatus, newStatus);
  changed = true;
}

const intakeMarker = `  if (req.method === "POST" && ["/api/skygrid/intake", "/intake", "/api/aura-core/decide", "/api/agent/signals"].includes(path)) {`;

const pacificHeart = `  if (req.method === "POST" && path === "/api/pacific-heart/ingest") {
    const body = await readBody(req);
    const required = ["eventId", "source", "patientRef", "incidentType", "severity"];
    const missing = required.filter((key) => !body[key]);

    if (missing.length > 0) {
      return json(res, 400, {
        ok: false,
        status: "invalid_payload",
        product: PRODUCT,
        route: path,
        missing,
        timestamp: now()
      });
    }

    const severity = String(body.severity || "normal").toLowerCase();
    const urgent = ["critical", "high", "sev1", "p1"].includes(severity);

    return json(res, 202, {
      ok: true,
      status: "accepted",
      product: PRODUCT,
      route: path,
      mode: "controlled_pilot_sandbox",
      noDispatch: true,
      noDiagnosis: true,
      eventId: body.eventId,
      handoff: {
        humanReviewRequired: true,
        priority: urgent ? "urgent_review" : "standard_review"
      },
      timestamp: now()
    });
  }

`;

if (!s.includes('"/api/pacific-heart/ingest"')) {
  if (!s.includes(intakeMarker)) {
    console.error("Could not find the generic intake handler marker.");
    process.exit(1);
  }
  s = s.replace(intakeMarker, pacificHeart + intakeMarker);
  changed = true;
}

fs.writeFileSync(file, s);

console.log(changed ? "Patched api/runtime.mjs" : "No changes needed; aliases already present.");
