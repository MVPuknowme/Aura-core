// SKYGRID Dispatcher Public Demo canonical article route
// Vercel Node function. Public advisory / controlled-pilot page only.

const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const CANONICAL_PATH = "/articles/skygrid-dispatcher-public-demo";
const CANONICAL_URL = `https://aurcore.skygrid-protocol.net${CANONICAL_PATH}`;

function setCommonHeaders(res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Canonical-Route", CANONICAL_PATH);
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    res.setHeader("Allow", "GET, HEAD");
    res.end("Method Not Allowed");
    return;
  }

  setCommonHeaders(res);
  res.statusCode = 200;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>SKYGRID Dispatcher Public Demo | Emergency Data On-Ramp</title>
  <meta name="description" content="Public demo page for the SKYGRID Emergency Data On-Ramp dispatcher: route validation, status checks, and proof-of-intake for emergency and continuity data." />
  <link rel="canonical" href="${CANONICAL_URL}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="SKYGRID Dispatcher Public Demo | Emergency Data On-Ramp" />
  <meta property="og:description" content="SKYGRID is a phone-first emergency data on-ramp/off-ramp for validating network-health signals, advisory fallback decisions, and proof-of-intake records." />
  <meta property="og:url" content="${CANONICAL_URL}" />
  <meta name="twitter:card" content="summary" />
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: "SKYGRID Dispatcher Public Demo",
    description: "Public demo page for the SKYGRID Emergency Data On-Ramp dispatcher.",
    url: CANONICAL_URL,
    about: ["emergency data on-ramp", "network resilience", "route validation", "proof-of-intake"],
    author: { "@type": "Person", name: "Michael Vincent Patrick" },
    publisher: { "@type": "Organization", name: "SKYGRID" }
  })}</script>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#07101f; color:#edf6ff; }
    body { margin:0; min-height:100vh; background: radial-gradient(circle at top left, rgba(0,213,255,.22), transparent 34rem), linear-gradient(135deg,#07101f 0%,#0d1d35 52%,#17112b 100%); }
    main { max-width:980px; margin:0 auto; padding:56px 24px; }
    article { border:1px solid rgba(125,211,252,.3); border-radius:26px; padding:clamp(24px,4vw,42px); background:rgba(15,23,42,.72); box-shadow:0 24px 80px rgba(0,0,0,.35); }
    .badge { display:inline-flex; gap:8px; align-items:center; border:1px solid rgba(125,211,252,.42); border-radius:999px; padding:8px 12px; color:#bae6fd; background:rgba(8,47,73,.55); font-size:14px; }
    h1 { margin:24px 0 14px; font-size:clamp(38px,6vw,68px); line-height:.98; letter-spacing:-.05em; }
    h2 { margin-top:34px; color:#e0f2fe; }
    p, li { color:#dbeafe; line-height:1.68; font-size:17px; }
    strong { color:#fff; }
    a { color:#67e8f9; }
    nav { display:flex; flex-wrap:wrap; gap:10px; margin:24px 0 0; }
    nav a { border:1px solid rgba(255,255,255,.14); border-radius:999px; padding:9px 13px; text-decoration:none; background:rgba(255,255,255,.05); font-weight:700; }
    .notice { border-left:4px solid #f59e0b; padding:12px 14px; background:rgba(245,158,11,.11); border-radius:12px; margin-top:18px; }
    footer { margin-top:30px; color:#93c5fd; font-size:14px; }
  </style>
</head>
<body>
  <main>
    <article>
      <span class="badge">Canonical SKYGRID article · Not airport dispatch</span>
      <h1>SKYGRID Dispatcher Public Demo</h1>
      <p><strong>SKYGRID Dispatcher</strong> is a phone-first public demo for network resilience planning. It shows how the SKYGRID Emergency Data On-Ramp can monitor live network conditions, simulate outages, compare fallback paths, and preserve incident decisions in a way that is understandable in under one minute.</p>

      <div class="notice"><strong>Advisory / Simulation Mode.</strong> SKYGRID does not replace 911, FirstNet, GMDSS, VHF, AIS, EPIRB, certified dispatch systems, carrier infrastructure, or official emergency procedures. It is a controlled public demonstration of route validation and continuity-data proofing.</div>

      <h2>What the demo shows</h2>
      <p>A user opens the app on a phone, taps <strong>Arm Dispatcher</strong>, and sees browser-visible network-health signals. The dispatcher presents transport cards for WiFi, cellular, LoRa, Tor, and satellite-style paths. WiFi and cellular use real browser-visible signal behavior where available. LoRa, Tor, and satellite remain clearly labeled as simulated unless connected to a verified live feed.</p>
      <p>The user can inject a scenario such as an ISP outage, power loss, cellular degradation, DNS disruption, hurricane-style connectivity loss, off-grid LoRa/Satellite fallback, or marine dead-in-water advisory mode. The dispatcher ranks available fallback paths and presents a clear recommendation prompt with explicit user confirmation.</p>

      <h2>Why it matters</h2>
      <p>Connectivity failures are hard to explain until people can see them. SKYGRID Dispatcher turns network resilience into a simple visual workflow: measure the signal, simulate the failure, recommend a fallback, confirm the decision, and preserve the incident record.</p>

      <h2>Defined identity</h2>
      <p>This page defines <strong>SKYGRID</strong> as the <strong>SKYGRID Emergency Data On-Ramp</strong>: a secure entry point where emergency, outage, responder, system-health, and continuity data can be validated, logged, routed, proved, and surfaced to dashboards and partners.</p>

      <h2>Current product direction</h2>
      <p>The public demo is built to stay transparent, safe, and easy to understand. Simulated transports remain visibly labeled. Recommendation prompts require user confirmation. Incident logs preserve decision context. Future enhancements may include marine presets, local daemon integrations, real LoRa and satellite gateway feeds, expanded resilience analytics, on-device advisory agents, and shareable demo sessions.</p>

      <nav aria-label="SKYGRID routes">
        <a href="/">Home</a>
        <a href="/dispatch">Dispatcher</a>
        <a href="/api/highway/status">Highway Status</a>
        <a href="/api/highway/postman">Postman Proof</a>
        <a href="https://github.com/MVPuknowme/Aura-core" rel="noopener noreferrer">GitHub Proof</a>
      </nav>

      <footer>Service: SKYGRID Emergency Data On-Ramp · Canonical route: ${CANONICAL_PATH} · Operator: MVPuknowme</footer>
    </article>
  </main>
</body>
</html>`;

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  res.end(html);
}
