export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      system: "SKYGRID Emergency Data On-Ramp",
      status: "method_not_allowed",
      allowed: ["POST"]
    });
  }

  const body = req.body || {};
  const required = ["eventId", "source", "patientRef", "incidentType", "severity"];
  const missing = required.filter((key) => !body[key]);

  if (missing.length > 0) {
    return res.status(400).json({
      ok: false,
      system: "SKYGRID Emergency Data On-Ramp",
      status: "invalid_payload",
      route: "/api/pacific-heart/ingest",
      missing,
      timestamp: new Date().toISOString()
    });
  }

  const severity = String(body.severity || "normal").toLowerCase();
  const urgent = ["critical", "high", "sev1", "p1"].includes(severity);

  return res.status(202).json({
    ok: true,
    system: "SKYGRID Emergency Data On-Ramp",
    status: "accepted",
    route: "/api/pacific-heart/ingest",
    mode: "controlled_pilot_sandbox",
    noDispatch: true,
    noDiagnosis: true,
    eventId: body.eventId,
    handoff: {
      humanReviewRequired: true,
      priority: urgent ? "urgent_review" : "standard_review"
    },
    timestamp: new Date().toISOString()
  });
}
