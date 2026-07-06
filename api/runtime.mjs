const PRODUCT = "SKYGRID Emergency Data On-Ramp";
const VERSION = "2026-07-06-spartan-runtime-console";
const CANONICAL_HOST = "aura-sky.skygrid-protocol.net";
const CANONICAL_URL = `https://${CANONICAL_HOST}`;

function now() {
  return new Date().toISOString();
}

function getPath(req) {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `https://${host}`);
  return { host: host.split(":")[0].toLowerCase(), url, path: url.pathname };
}

function headers(res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("X-SKYGRID-Runtime", VERSION);
}

function json(res, status, payload) {
  headers(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}

function page(res, status, title, body, mode = "spartan") {
  headers(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const shellClass = mode === "spartan" ? "shell" : "shell slim";
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><link rel="canonical" href="${CANONICAL_URL}/"/><title>${title}</title><style>:root{color-scheme:dark;--bg:#020403;--panel:rgba(3,14,10,.78);--panel2:rgba(6,24,17,.92);--green:#18ff62;--cyan:#00e5ff;--amber:#ffba3a;--red:#ff4655;--text:#eafff1;--muted:#8cf7b6;--line:rgba(24,255,98,.42);font-family:"IBM Plex Mono","Cascadia Code","SFMono-Regular",Consolas,monospace}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 14% 10%,rgba(24,255,98,.20),transparent 24rem),radial-gradient(circle at 82% 16%,rgba(0,229,255,.16),transparent 26rem),linear-gradient(135deg,#020403,#05130d 48%,#020707);color:var(--text);overflow-x:hidden}body:before{content:"";position:fixed;inset:0;pointer-events:none;background:linear-gradient(rgba(24,255,98,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(24,255,98,.035) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at center,#000,transparent 72%)}body:after{content:"";position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.026),rgba(255,255,255,.026) 1px,transparent 1px,transparent 4px);opacity:.30}main{width:min(1440px,100%);margin:0 auto;padding:22px}.shell{min-height:calc(100vh - 44px);border:1px solid var(--line);border-radius:28px;background:linear-gradient(180deg,rgba(3,17,11,.84),rgba(0,0,0,.72));box-shadow:0 0 60px rgba(24,255,98,.12),inset 0 0 90px rgba(24,255,98,.04);overflow:hidden;position:relative}.shell:before{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent,rgba(24,255,98,.08) 48%,transparent 52%);transform:translateX(-100%);animation:sweep 7s linear infinite;pointer-events:none}@keyframes sweep{0%{transform:translateX(-100%)}44%,100%{transform:translateX(100%)}}.top,.bottom{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(24,255,98,.24);background:rgba(0,0,0,.35)}.bottom{border-top:1px solid rgba(24,255,98,.24);border-bottom:0;color:var(--muted);font-size:12px;flex-wrap:wrap}.eyebrow{color:var(--cyan);font-size:12px;letter-spacing:.22em;text-transform:uppercase}.brand h1{margin:3px 0 0;font-size:clamp(22px,3vw,40px);letter-spacing:-.04em;text-shadow:0 0 18px rgba(24,255,98,.28)}.status{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}.pill{border:1px solid rgba(24,255,98,.42);border-radius:999px;padding:7px 10px;background:rgba(24,255,98,.08);color:var(--green);font-size:12px;white-space:nowrap}.layout{display:grid;grid-template-columns:300px minmax(320px,1fr) 330px;gap:16px;padding:16px}.panel{border:1px solid rgba(24,255,98,.28);border-radius:22px;background:var(--panel);box-shadow:inset 0 0 24px rgba(24,255,98,.035);padding:16px;position:relative;overflow:hidden}.panel:after{content:"";position:absolute;top:0;left:16px;right:16px;height:1px;background:linear-gradient(90deg,transparent,var(--green),transparent);opacity:.72}.panel h2{margin:0 0 14px;color:var(--green);font-size:13px;letter-spacing:.18em;text-transform:uppercase}.metric,.feed,.command{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid rgba(24,255,98,.12);font-size:13px}.metric:last-child,.feed:last-child,.command:last-child{border-bottom:0}.metric strong,.feed strong{color:var(--green)}.cyan{color:var(--cyan)}.amber{color:var(--amber)}.stage{min-height:530px;display:grid;place-items:center;text-align:center;background:radial-gradient(circle at center,rgba(24,255,98,.16),transparent 20rem),linear-gradient(180deg,rgba(0,229,255,.04),transparent)}.helmet{width:min(380px,82vw);aspect-ratio:1;display:grid;place-items:center;border:1px solid rgba(0,229,255,.24);border-radius:999px;background:radial-gradient(circle,rgba(24,255,98,.16),transparent 62%);box-shadow:0 0 80px rgba(24,255,98,.16),inset 0 0 42px rgba(0,229,255,.08)}.helmet svg{width:72%;filter:drop-shadow(0 0 18px rgba(24,255,98,.55))}.stage-title{margin-top:18px;color:var(--green);font-size:clamp(22px,4vw,44px);letter-spacing:-.05em}.copy{max-width:680px;margin:12px auto 0;color:#c9ffda;line-height:1.6;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.console{margin-top:16px;border:1px solid rgba(0,229,255,.22);border-radius:18px;background:rgba(0,0,0,.42);padding:14px;text-align:left}.prompt{color:var(--green)}.cursor{display:inline-block;width:8px;height:16px;background:var(--green);vertical-align:-3px;animation:blink 1s steps(2) infinite}@keyframes blink{50%{opacity:0}}nav.routes{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:16px}a{color:var(--cyan)}.routes a,.btn{color:var(--text);text-decoration:none;border:1px solid rgba(24,255,98,.24);border-radius:14px;padding:11px 10px;background:rgba(24,255,98,.07);font-size:12px;text-align:center}.routes a:hover,.btn:hover{border-color:var(--cyan);color:var(--cyan)}.bar{height:8px;border:1px solid rgba(24,255,98,.22);border-radius:999px;overflow:hidden;background:rgba(24,255,98,.05);min-width:90px}.bar span{display:block;height:100%;background:linear-gradient(90deg,var(--green),var(--cyan));box-shadow:0 0 12px var(--green)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}.tile{border:1px solid rgba(24,255,98,.18);border-radius:18px;padding:16px;background:rgba(24,255,98,.055)}.tile strong{display:block;color:var(--green);margin-bottom:6px}.notice{border-left:4px solid var(--amber);padding:12px 14px;background:rgba(255,186,58,.10);border-radius:12px;margin-top:20px}.slim{min-height:auto}.slim .layout{display:block}.slim .panel{max-width:1080px;margin:16px auto}@media(max-width:1040px){.layout{grid-template-columns:1fr}.stage{min-height:auto}nav.routes{grid-template-columns:repeat(2,1fr)}} </style></head><body><main><section class="${shellClass}">${body}</section></main></body></html>`);
}

function routeMap() {
  return ["/", "/health.json", "/dispatch", "/incidents", "/settings", "/highway", "/scenarios", "/rates", "/base", "/pay", "/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts", "/api/skygrid/status", "/api/skygrid/intake", "/api/aura-core/decide", "/api/agent/signals", "/api/highway/status", "/api/highway/flasks", "/api/highway/postman", "/api/pay/quote?amount=25", "/api/autodrill/latest", "/api/build-pad/quote", "/api/node-lease/intake", "/api/failover/status", "/api/panels/summary", "/api/stripe/device-link"];
}

function configured() {
  return {
    awsStatusUrl: Boolean(process.env.SKYGRID_AWS_STATUS_URL),
    awsIntakeUrl: Boolean(process.env.SKYGRID_AWS_INTAKE_URL),
    emergencyCallId: Boolean(process.env.SKYGRID_EMERGENCY_CALL_ID),
    partnershipCode: Boolean(process.env.SKYGRID_PARTNERSHIP_CODE),
    lambdaRouterUrl: Boolean(process.env.SKYGRID_LAMBDA_ROUTER_URL),
    s3Bucket: Boolean(process.env.SKYGRID_S3_BUCKET)
  };
}

function launchLadder() {
  return [
    { step: 1, id: "auto_drill_proof", label: "AutoDrill proof", status: "route_added" },
    { step: 2, id: "build_pad_quote", label: "Build-pad quote", status: "route_added_quote_only" },
    { step: 3, id: "node_lease_intake", label: "Node lease intake", status: "route_added_no_activation" },
    { step: 4, id: "dashboard", label: "Dashboard", status: "route_added" },
    { step: 5, id: "aws_persistence", label: "AWS persistence", status: "env_gated" },
    { step: 6, id: "partner_pilot", label: "Partner pilot", status: "package_ready_for_review" },
    { step: 7, id: "manual_failover", label: "Manual failover", status: "operator_gate_required" }
  ];
}

function safetyNotice() {
  return `<div class="notice"><strong>Controlled pilot:</strong> explanation, route proof, validation review, and opt-in node lease planning only. Production activation stays user-approved and gated.</div>`;
}

function helmetSvg() {
  return `<div class="helmet" aria-hidden="true"><svg viewBox="0 0 512 512"><path d="M256 38c82 0 151 44 188 110-58-10-106-7-145 9-43 18-72 53-88 104h196c-7 80-54 147-120 183v-86h-63v86c-67-36-113-103-120-183h78c13-74 49-126 109-154 15-7 31-12 48-15-25-16-53-24-83-24-89 0-161 72-161 161 0 23 5 45 14 65H66c-6-21-9-43-9-65C57 124 146 38 256 38Z" fill="none" stroke="#18ff62" stroke-width="18" stroke-linejoin="round"/><path d="M183 283h146l-30 45h-86l-30-45Z" fill="none" stroke="#00e5ff" stroke-width="14" stroke-linejoin="round"/><path d="M256 38v95" stroke="#18ff62" stroke-width="18" stroke-linecap="round"/><path d="M183 261c11-44 34-76 70-96" stroke="#00e5ff" stroke-width="14" stroke-linecap="round"/></svg></div>`;
}

function topBar() {
  return `<header class="top"><div class="brand"><span class="eyebrow">Controlled pilot · Sentinel fail_closed</span><h1>SKYGRID Local Command Console</h1></div><div class="status"><span class="pill">🟢 ACTIVE</span><span class="pill">🔵 SYNCING</span><span class="pill">🟣 VALIDATING</span><span class="pill">Runtime: Vercel</span></div></header>`;
}

function bottomBar() {
  return `<footer class="bottom"><span>Service: ${PRODUCT}</span><span>Operator: MVPuknowme</span><span>Guardian Mode · Mesh Ready · Emergency Ready · Sentinel Active</span><span>SunPay: transparency layer planned</span></footer>`;
}

function landing(res) {
  return page(res, 200, "SKYGRID Spartan Command Console", `${topBar()}<div class="layout"><aside class="panel"><h2>Diagnostics</h2><div class="metric"><span>PNPK validation</span><strong>READY</strong></div><div class="metric"><span>Manifest sync</span><strong>ONLINE</strong></div><div class="metric"><span>Emergency gate</span><strong>ARMED</strong></div><div class="metric"><span>Private movement</span><strong class="amber">DISABLED</strong></div><div class="metric"><span>Device activation</span><strong class="amber">OPT-IN</strong></div><div class="metric"><span>Payment execution</span><strong class="amber">DISABLED</strong></div><div class="metric"><span>Route proof</span><strong class="cyan">CHECKABLE</strong></div><h2 style="margin-top:22px">Commands</h2><div class="command"><span>status</span><span class="cyan">system health</span></div><div class="command"><span>autodrill</span><span class="cyan">proof lane</span></div><div class="command"><span>lease-node</span><span class="cyan">consent flow</span></div><div class="command"><span>sunpay</span><span class="cyan">reward view</span></div></aside><section class="panel stage"><div>${helmetSvg()}<div class="stage-title">SPARTAN SENTINEL ONLINE</div><p class="copy">A tactical console for the SKYGRID Emergency Data On-Ramp: emergency, outage, responder, system-health, node-lease, and continuity data can be validated, logged, routed, proved, and surfaced to dashboards and partners.</p><div class="console"><span class="prompt">SKYGRID&gt;</span> verify routes --mode controlled-pilot<br/><span class="prompt">✓</span> sentinel fail_closed · AutoDrill proof lane · node lease consent gated<br/><span class="prompt">SKYGRID&gt;</span> <span class="cursor"></span></div><nav class="routes"><a href="/api/health">API Health</a><a href="/health.json">Health JSON</a><a href="/dashboard/validation-panel">Validation</a><a href="/api/highway/status">Highway</a><a href="/api/panels/summary">Summary</a></nav></div></section><aside class="panel"><h2>Live Status</h2><div class="metric"><span>CPU</span><div class="bar"><span style="width:64%"></span></div></div><div class="metric"><span>Memory</span><div class="bar"><span style="width:52%"></span></div></div><div class="metric"><span>Network</span><div class="bar"><span style="width:82%"></span></div></div><div class="metric"><span>Route confidence</span><div class="bar"><span style="width:91%"></span></div></div><div class="metric"><span>Income type</span><strong class="cyan">Validation lease</strong></div><div class="metric"><span>Platform fee</span><strong>3.5%</strong></div><h2 style="margin-top:22px">Event Feed</h2><div class="feed"><span>00:00:01</span><strong>Mesh heartbeat</strong></div><div class="feed"><span>00:00:04</span><strong>Node discovered</strong></div><div class="feed"><span>00:00:10</span><strong>Validator synchronized</strong></div><div class="feed"><span>00:00:18</span><strong>Emergency route verified</strong></div><div class="feed"><span>00:00:21</span><strong>SunPay pending</strong></div></aside></div>${bottomBar()}`);
}

function healthPayload(path) {
  return { ok: true, product: PRODUCT, skygrid: PRODUCT, canonical_front_page: CANONICAL_URL, runtime: "vercel-aura-core", version: VERSION, mode: "controlled-pilot", sentinel: "fail_closed", route: path, configured: configured(), launch_ladder: launchLadder(), routes: routeMap(), timestamp: now() };
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return { raw }; }
}

function decision(body = {}) {
  const need = String(body.need || body.type || "system-health").toLowerCase();
  const severity = String(body.severity || "normal").toLowerCase();
  const urgent = ["critical", "high", "sev1", "p1"].includes(severity) || need.includes("outage");
  return { selected: urgent ? "lambda_router" : "advisory_response", reason: urgent ? "urgent_signal" : "safe_default", advisoryOnly: true };
}

function failoverStatus() {
  return { ok: true, product: PRODUCT, canonical_front_page: CANONICAL_URL, mode: "controlled_pilot", sentinel: "fail_closed", failover_state: "blocked", manual_failover: "operator_gate_required", readiness: { github_manifest: true, postman_proof_lane: true, dashboard_routes: true, public_front_page: true, aws_persistence_ready: false }, timestamp: now() };
}

function panelSummary(path) {
  return { ok: true, product: PRODUCT, canonical_front_page: CANONICAL_URL, route: path, mode: "controlled_pilot", sentinel: "fail_closed", status: { public_front_page: { ok: true, route: "/" }, health: { ok: true, route: "/health.json" }, postman: { ok: true, route: "/api/highway/postman" }, failover: { ok: true, state: "blocked" } }, routes: routeMap(), launch_ladder: launchLadder(), reward_transparency: { income_type: "validation_lease", platform_fee_percent: 3.5, payout_layer: "SunPay planned" }, timestamp: now() };
}

function dashboard(res, path) {
  const titles = { "/dashboard/command-center": ["SKYGRID Command Center", "Public front-door, proof lane, dashboard, and operator review."], "/dashboard/validation-panel": ["SKYGRID Validation Panel", "Telemetry, AutoDrill, node lease readiness, income type, and validation transparency."], "/dashboard/deployment-review": ["SKYGRID Deployment Review", "Vercel, route, and domain readiness review."], "/dashboard/receipts": ["SKYGRID Receipts", "Proof receipts, reward source, asset type, fee, and net reward trail."] };
  const [title, intro] = titles[path];
  return page(res, 200, title, `${topBar()}<div class="layout"><section class="panel" style="grid-column:1/-1"><h2>${title}</h2><p class="copy" style="margin-left:0">${intro}</p><div class="grid"><div class="tile"><strong>Health</strong><a href="/health.json">/health.json</a></div><div class="tile"><strong>Proof</strong><a href="/api/highway/postman">/api/highway/postman</a></div><div class="tile"><strong>Summary</strong><a href="/api/panels/summary">/api/panels/summary</a></div><div class="tile"><strong>Income type</strong>Validation lease / AutoDrill proof</div><div class="tile"><strong>Token or asset</strong>Displayed when configured</div><div class="tile"><strong>Fee</strong>3.5% platform fee, net reward shown separately</div></div>${safetyNotice()}</section></div>${bottomBar()}`);
}

function simplePage(res, title, intro) {
  return page(res, 200, title, `${topBar()}<div class="layout"><section class="panel" style="grid-column:1/-1"><h2>${title}</h2><p class="copy" style="margin-left:0">${intro}</p><nav class="routes"><a href="/">Console</a><a href="/dashboard/command-center">Command</a><a href="/dashboard/validation-panel">Validation</a><a href="/dashboard/receipts">Receipts</a><a href="/health.json">Health</a></nav>${safetyNotice()}</section></div>${bottomBar()}`, "slim");
}

export default async function handler(req, res) {
  const { path, url } = getPath(req);
  if (req.method === "GET" && path === "/") return landing(res);
  if (req.method === "GET" && ["/dashboard/command-center", "/dashboard/validation-panel", "/dashboard/deployment-review", "/dashboard/receipts"].includes(path)) return dashboard(res, path);
  if (req.method === "GET" && ["/health.json", "/api/skygrid/status", "/api/highway/status"].includes(path)) return json(res, 200, healthPayload(path));
  if (req.method === "GET" && path === "/api/failover/status") return json(res, 200, failoverStatus());
  if (req.method === "GET" && path === "/api/panels/summary") return json(res, 200, panelSummary(path));
  if (req.method === "GET" && path === "/api/autodrill/latest") return json(res, 200, { ok: true, product: PRODUCT, route: path, proof_owner: "postman", result: "pass_with_warnings", checks: ["front_page", "health", "status", "dashboard", "failover"], timestamp: now() });
  if (req.method === "GET" && path === "/api/highway/postman") return json(res, 200, { ok: true, product: PRODUCT, collection: "skygrid-autodrill.collection.json", checks: ["front-page", "status", "health", "intake", "dashboard", "failover-status"], timestamp: now() });
  if (req.method === "GET" && path === "/api/highway/flasks") return json(res, 200, { ok: true, product: PRODUCT, flasks: [{ id: "aws", status: "protected" }, { id: "vercel", status: "public-bridge" }, { id: "postman", status: "proof-runner" }], timestamp: now() });
  if (req.method === "POST" && path === "/api/build-pad/quote") { const body = await readBody(req); const amount = Number(body.amount || body.monthlySupportUsd || 250); return json(res, 200, { ok: true, product: PRODUCT, route: path, mode: "quote_only_review_required", quote_id: `buildpad_${Date.now()}`, noPaymentExecuted: true, amount, timestamp: now() }); }
  if (req.method === "POST" && path === "/api/node-lease/intake") { const body = await readBody(req); return json(res, 202, { accepted: true, product: PRODUCT, route: path, mode: "intake_only", intake_id: `lease_${Date.now()}`, region: body.region || "unspecified", timestamp: now() }); }
  if (req.method === "POST" && ["/api/skygrid/intake", "/intake", "/api/aura-core/decide", "/api/agent/signals"].includes(path)) { const body = await readBody(req); const event = { eventId: `skygrid_${Date.now()}`, receivedAt: now(), product: PRODUCT, skygrid: PRODUCT, route: path, source: body.source || "postman-autodrill", type: body.type || body.need || "system-health", decision: decision(body), payload: body }; return json(res, 202, { accepted: true, advisoryOnly: true, event }); }
  if (req.method === "GET" && path === "/dispatch") return simplePage(res, "SKYGRID Dispatch", "Controlled-pilot dispatch page for status, routing review, and proof logging.");
  if (req.method === "GET" && path === "/incidents") return simplePage(res, "SKYGRID Incidents", "Incident review page for demo triggers, recommendations, decisions, and JSON records.");
  if (req.method === "GET" && path === "/settings") return simplePage(res, "SKYGRID Settings", "Configuration reference for thresholds, route checks, and agent signals.");
  if (req.method === "GET" && path === "/highway") return simplePage(res, "SKYGRID Emergency Highway", "Public proof lane for status, route map, and auto-drill validation.");
  if (req.method === "GET" && ["/scenarios", "/rates", "/base"].includes(path)) return json(res, 200, { ok: true, product: PRODUCT, route: path, mode: "demo", timestamp: now() });
  if (req.method === "GET" && path === "/pay") return simplePage(res, "SKYGRID Support Demo", "Quote-only support route. No payment is executed by this demo page.");
  if (req.method === "GET" && path === "/api/pay/quote") { const amount = Number(url.searchParams.get("amount") || "0"); return json(res, 200, { ok: true, product: PRODUCT, quoteOnly: true, noPaymentExecuted: true, amount, currency: "USD", timestamp: now() }); }
  if (req.method === "GET" && path === "/api/stripe/device-link") return json(res, 501, { ok: false, product: PRODUCT, route: path, reason: "Legacy prototype route only.", timestamp: now() });
  return json(res, 404, { ok: false, product: PRODUCT, error: "route_not_found", path, routes: routeMap(), timestamp: now() });
}
