export default async function handler(req, res) {
  const path = req.url.split("?")[0];
  const base = {
    skygrid: "SKYGRID Emergency Data On-Ramp",
    aura_core: "AI control layer for Allbridge routing",
    allbridge: "cross-network bridge and failover fabric",
    runtime: "vercel-aura-core",
    timestamp: new Date().toISOString()
  };

  if (path === "/" || path === "/api/runtime") {
    return res.status(200).json({ ...base, ok: true, page: "skygrid-home", status: "ready" });
  }

  if (path === "/status" || path === "/api/status") {
    return res.status(200).json({
      ...base,
      ok: true,
      page: "status",
      status: "operational",
      checks: {
        skygrid_public_surface: "ready",
        aura_core_ai_control: "ready",
        allbridge_control: "standby",
        aws_validation_backend: "protected",
        airtable_records: "external",
        linear_execution: "external"
      }
    });
  }

  if (path === "/api/health") {
    return res.status(200).json({ ...base, ok: true, component: "aura-core-ai-control-plane", status: "healthy" });
  }

  if (path === "/api/intake") {
    if (req.method !== "POST") {
      return res.status(405).json({ ...base, ok: false, error: "method_not_allowed", allowed: ["POST"] });
    }
    return res.status(202).json({ ...base, ok: true, route: "skygrid-intake", status: "accepted" });
  }

  if (path === "/api/route" || path === "/api/aura-core") {
    return res.status(200).json({ ...base, ok: true, route: "aura-core-ai-control", status: "ready" });
  }

  if (path === "/api/allbridge") {
    return res.status(200).json({ ...base, ok: true, route: "allbridge-control", status: "standby" });
  }

  if (path === "/dispatch") return res.status(200).json({ ...base, ok: true, page: "dispatch", status: "ready" });
  if (path === "/partners") return res.status(200).json({ ...base, ok: true, page: "partners", status: "ready" });
  if (path === "/investors") return res.status(200).json({ ...base, ok: true, page: "investors", status: "ready" });
  if (path === "/contact") return res.status(200).json({ ...base, ok: true, page: "contact", status: "ready" });

  return res.status(404).json({ ...base, ok: false, error: "route_not_found", path });
}
