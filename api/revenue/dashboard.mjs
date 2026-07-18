const PRODUCT = "SKYGRID Emergency Data On-Ramp";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-SKYGRID-Product", PRODUCT);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = 200;
  res.end(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Aura-Core Verified Revenue Ledger</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;background:#050816;color:#edf6ff}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#172554,#07101f 42%,#050816)}
main{max-width:1180px;margin:auto;padding:36px 18px 64px}.panel{background:rgba(12,25,48,.9);border:1px solid rgba(103,232,249,.25);border-radius:24px;padding:24px;box-shadow:0 24px 80px rgba(0,0,0,.34)}
h1{font-size:clamp(2rem,6vw,4.4rem);line-height:1;margin:.2rem 0 1rem;letter-spacing:-.045em}.badge{display:inline-block;border:1px solid #67e8f9;border-radius:999px;padding:.35rem .7rem;color:#a5f3fc}
p{color:#cbd5e1;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:20px 0}.metric{padding:16px;border:1px solid rgba(255,255,255,.13);border-radius:16px;background:rgba(255,255,255,.045)}.metric span{display:block;color:#94a3b8;font-size:.85rem}.metric strong{font-size:1.5rem}
textarea{width:100%;min-height:320px;background:#020617;color:#dbeafe;border:1px solid #334155;border-radius:14px;padding:14px;font:13px ui-monospace,SFMono-Regular,Consolas,monospace}button{margin-top:12px;padding:11px 16px;border-radius:999px;border:1px solid #67e8f9;background:#164e63;color:#ecfeff;font-weight:700;cursor:pointer}.notice{border-left:4px solid #f59e0b;padding:12px 14px;background:rgba(245,158,11,.11);border-radius:10px;margin:16px 0}pre{white-space:pre-wrap;background:#020617;border-radius:14px;padding:14px;overflow:auto;color:#bae6fd}a{color:#67e8f9}
</style>
</head>
<body><main><section class="panel">
<span class="badge">Controlled pilot · evidence-gated</span>
<h1>Aura-Core Verified Infrastructure Revenue Ledger</h1>
<p>Submit staking, infrastructure, protocol, treasury, and operating-cost records. Only <strong>verified</strong> or <strong>reconciled</strong> evidence is counted as verified net income.</p>
<div class="notice"><strong>Safety boundary:</strong> this dashboard does not sign wallets, broadcast transactions, execute payments, or treat estimates as earned income.</div>
<div class="grid">
<div class="metric"><span>Verified revenue</span><strong id="revenue">$0.00</strong></div>
<div class="metric"><span>Verified costs</span><strong id="cost">$0.00</strong></div>
<div class="metric"><span>Verified net income</span><strong id="net">$0.00</strong></div>
<div class="metric"><span>Excluded records</span><strong id="excluded">0</strong></div>
</div>
<label for="payload"><strong>Ledger request JSON</strong></label>
<textarea id="payload">{
  "records": [
    {
      "id": "eth_reward_demo",
      "kind": "revenue",
      "classification": "staking",
      "amount_usd": 42.15,
      "network": "ethereum",
      "role": "validator",
      "asset": "ETH",
      "quantity": 0.012,
      "evidence_state": "verified",
      "evidence": { "tx_hash": "0x...", "explorer_url": "https://..." }
    },
    {
      "id": "cloud_cost_demo",
      "kind": "cost",
      "classification": "cloud",
      "amount_usd": 12.00,
      "network": "skygrid",
      "role": "runtime",
      "evidence_state": "reconciled",
      "evidence": { "invoice_id": "invoice-demo" }
    }
  ]
}</textarea>
<button id="run">Calculate verified metrics</button>
<p><a href="/api/revenue/ledger">View API schema</a></p>
<pre id="output">No calculation run yet.</pre>
</section></main>
<script>
const money = new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'});
document.getElementById('run').addEventListener('click', async () => {
  const output = document.getElementById('output');
  try {
    const payload = JSON.parse(document.getElementById('payload').value);
    const response = await fetch('/api/revenue/ledger',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data = await response.json();
    output.textContent = JSON.stringify(data,null,2);
    if (!data.ok) return;
    document.getElementById('revenue').textContent = money.format(data.totals.verified_revenue_usd);
    document.getElementById('cost').textContent = money.format(data.totals.verified_cost_usd);
    document.getElementById('net').textContent = money.format(data.totals.verified_net_income_usd);
    document.getElementById('excluded').textContent = data.record_counts.excluded_from_verified_totals;
  } catch (error) {
    output.textContent = String(error);
  }
});
</script></body></html>`);
}
