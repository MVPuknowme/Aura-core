import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const registryPath = 'nodes.json';
const outputDir = 'node-reports';
const publicDir = 'public';

if (!existsSync(registryPath)) {
  throw new Error('nodes.json not found. Register at least one SkyGrid pilot node first.');
}

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const nodes = Array.isArray(registry.nodes) ? registry.nodes : [];
const generatedAt = new Date().toISOString();

mkdirSync(outputDir, { recursive: true });
mkdirSync(publicDir, { recursive: true });

const summary = {
  schema: 'skygrid.node.ledger.summary.v0.1',
  generated_at: generatedAt,
  registry_mode: registry.mode || 'unknown',
  node_count: nodes.length,
  verified_revenue_usd: nodes.reduce((sum, node) => sum + Number(node.ledger?.verified_revenue_usd || 0), 0),
  estimated_daily_value_usd_low: nodes.reduce((sum, node) => sum + Number(node.ledger?.estimated_daily_value_usd_low || 0), 0),
  estimated_daily_value_usd_high: nodes.reduce((sum, node) => sum + Number(node.ledger?.estimated_daily_value_usd_high || 0), 0),
  nodes: nodes.map((node) => ({
    node_id: node.node_id,
    node_name: node.node_name,
    operator: node.operator,
    region: node.region,
    status: node.status,
    primary_url: node.primary_url,
    fallback_url: node.fallback_url,
    available_for: node.available_for || [],
    uptime_target: node.targets?.uptime_target ?? null,
    drill_cadence: node.targets?.drill_cadence ?? null,
    verified_revenue_usd: Number(node.ledger?.verified_revenue_usd || 0),
    estimated_daily_value_usd_low: Number(node.ledger?.estimated_daily_value_usd_low || 0),
    estimated_daily_value_usd_high: Number(node.ledger?.estimated_daily_value_usd_high || 0),
    payout_status: node.ledger?.payout_status || 'unknown'
  }))
};

const markdown = `# SkyGrid Node Ledger\n\nGenerated: ${generatedAt}\n\nMode: ${summary.registry_mode}\n\nRegistered nodes: ${summary.node_count}\n\nVerified revenue: $${summary.verified_revenue_usd.toFixed(2)}\n\nEstimated daily value range: $${summary.estimated_daily_value_usd_low.toFixed(2)} - $${summary.estimated_daily_value_usd_high.toFixed(2)}\n\n> Payouts are estimates only until verified workloads, customer demand, and revenue collection are active.\n\n${summary.nodes.map((node) => `## ${node.node_name}\n\n- Node ID: ${node.node_id}\n- Operator: ${node.operator}\n- Region: ${node.region}\n- Status: ${node.status}\n- Primary URL: ${node.primary_url}\n- Fallback URL: ${node.fallback_url}\n- Available for: ${node.available_for.join(', ')}\n- Uptime target: ${node.uptime_target ?? 'pending'}\n- Drill cadence: ${node.drill_cadence ?? 'pending'}\n- Verified revenue: $${node.verified_revenue_usd.toFixed(2)}\n- Estimated daily value: $${node.estimated_daily_value_usd_low.toFixed(2)} - $${node.estimated_daily_value_usd_high.toFixed(2)}\n- Payout status: ${node.payout_status}\n`).join('\n')}\n`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SkyGrid Node Ledger</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, Segoe UI, sans-serif; background: #0b1020; color: #eef3ff; padding: 24px; }
    main { max-width: 980px; margin: 0 auto; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); border-radius: 24px; padding: 28px; }
    h1 { margin-top: 0; font-size: clamp(32px, 6vw, 56px); }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .card { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1); border-radius: 16px; padding: 16px; }
    .muted { color: #aab6d3; }
    .ok { color: #42f58d; }
    code { overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main>
    <p class="ok">● SkyGrid pilot node ledger</p>
    <h1>One-node lease loop is registered.</h1>
    <p class="muted">Generated ${generatedAt}. Verified revenue remains $${summary.verified_revenue_usd.toFixed(2)} until real workloads and collected revenue are active.</p>
    <div class="cards">
      <div class="card"><strong>Nodes</strong><br>${summary.node_count}</div>
      <div class="card"><strong>Verified Revenue</strong><br>$${summary.verified_revenue_usd.toFixed(2)}</div>
      <div class="card"><strong>Estimated Daily Value</strong><br>$${summary.estimated_daily_value_usd_low.toFixed(2)} - $${summary.estimated_daily_value_usd_high.toFixed(2)}</div>
    </div>
    ${summary.nodes.map((node) => `<section class="card" style="margin-top:16px"><h2>${node.node_name}</h2><p class="muted">${node.region} · ${node.status}</p><p><strong>Primary:</strong> <code>${node.primary_url}</code></p><p><strong>Fallback:</strong> <code>${node.fallback_url}</code></p><p><strong>Available for:</strong> ${node.available_for.join(', ')}</p><p><strong>Payout status:</strong> ${node.payout_status}</p></section>`).join('')}
  </main>
</body>
</html>`;

writeFileSync(`${outputDir}/node-ledger.json`, JSON.stringify(summary, null, 2));
writeFileSync(`${outputDir}/node-ledger.md`, markdown);
writeFileSync(`${publicDir}/node-ledger.html`, html);

console.log(JSON.stringify({
  generated_at: generatedAt,
  node_count: summary.node_count,
  verified_revenue_usd: summary.verified_revenue_usd,
  estimated_daily_value_usd_low: summary.estimated_daily_value_usd_low,
  estimated_daily_value_usd_high: summary.estimated_daily_value_usd_high
}));
