function escapeAttribute(value) {
  return String(value).replace(/[&"<>]/g, (character) => ({
    "&": "&amp;",
    '"': "&quot;",
    "<": "&lt;",
    ">": "&gt;"
  })[character]);
}

export function capacityLeasePage({ apiBase = "/edge/lease" } = {}) {
  const safeApiBase = escapeAttribute(apiBase.replace(/\/$/, ""));
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>SKYGRID Capacity Lease Preflight</title>
  <style>
    :root{color-scheme:dark;--ink:#07101f;--panel:#0e1e3a;--cobalt:#2563eb;--cyan:#67e8f9;--violet:#c084fc;--text:#edf6ff;--muted:#b9d2e8;--good:#34d399;--warn:#fbbf24}
    *{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:radial-gradient(circle at 10% 0,#183b80 0,#07101f 42%,#040713 100%);color:var(--text);min-height:100vh}
    main{width:min(1160px,calc(100% - 28px));margin:0 auto;padding:34px 0 70px}.hero,.panel{border:1px solid rgba(103,232,249,.24);background:linear-gradient(145deg,rgba(14,30,58,.96),rgba(38,22,67,.82));box-shadow:0 26px 90px rgba(0,0,0,.38)}
    .hero{padding:clamp(24px,5vw,54px);border-radius:30px}.panel{padding:24px;border-radius:22px;margin-top:18px}.eyebrow{color:var(--cyan);letter-spacing:.12em;text-transform:uppercase;font-size:.75rem;font-weight:800}.badge{display:inline-flex;padding:7px 11px;border-radius:999px;border:1px solid rgba(192,132,252,.4);color:#ead5ff;background:rgba(192,132,252,.08);font-size:.78rem}
    h1{font-size:clamp(2.4rem,7vw,5.6rem);line-height:.92;letter-spacing:-.055em;margin:18px 0 20px;max-width:900px}h2{font-size:1.45rem;margin:0 0 10px}p{color:var(--muted);line-height:1.65;max-width:820px}.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:26px}.step{padding:15px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(255,255,255,.045)}.step strong{display:block;color:#fff;margin-bottom:5px}.step span{font-size:.88rem;color:var(--muted)}
    form{display:grid;gap:18px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.field{display:grid;gap:7px}.field label,.checks label{font-size:.9rem;color:#dceeff;font-weight:650}.field input,.field select{width:100%;padding:12px 13px;border-radius:12px;border:1px solid rgba(103,232,249,.22);background:rgba(3,11,28,.72);color:#fff;font:inherit}.field small{color:#8fb1ca}.checks{display:grid;gap:10px}.checks label{display:flex;gap:9px;align-items:flex-start;font-weight:500;color:var(--muted)}input[type=checkbox],input[type=radio]{accent-color:var(--cobalt);margin-top:3px}
    button,.button{border:1px solid rgba(103,232,249,.42);background:linear-gradient(135deg,#1d4ed8,#6d28d9);color:#fff;border-radius:999px;padding:12px 18px;font:700 .95rem inherit;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none}button.secondary{background:rgba(103,232,249,.08);color:var(--cyan)}button:disabled{opacity:.5;cursor:not-allowed}.actions{display:flex;gap:10px;flex-wrap:wrap}.status{padding:13px 14px;border-radius:13px;background:rgba(103,232,249,.07);border:1px solid rgba(103,232,249,.17);color:var(--muted);white-space:pre-wrap}.status.good{border-color:rgba(52,211,153,.36);color:#bbf7d0}.status.warn{border-color:rgba(251,191,36,.36);color:#fde68a}
    .options{display:grid;gap:10px}.option{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:14px;border:1px solid rgba(255,255,255,.13);border-radius:15px;background:rgba(255,255,255,.04)}.option strong{display:block}.option small{color:var(--muted)}.hidden{display:none}.receipt{overflow:auto;max-height:360px;padding:14px;border-radius:14px;background:#030917;border:1px solid rgba(255,255,255,.1);color:#b9f6ff;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre}
    .warning{border-left:4px solid var(--warn);padding:13px 15px;border-radius:12px;background:rgba(251,191,36,.09);color:#fde68a;margin-top:18px}.foot{font-size:.83rem;color:#87a7c1;margin-top:18px}
    @media(max-width:760px){.steps,.grid{grid-template-columns:1fr}main{width:min(100% - 18px,1160px);padding-top:16px}.hero,.panel{border-radius:20px;padding:20px}}
  </style>
</head>
<body>
<main>
  <section class="hero">
    <span class="badge">PNPK capacity lease pilot</span>
    <div class="eyebrow">SKYGRID Emergency Data On-Ramp</div>
    <h1>Turn available compute into a controlled capacity offer.</h1>
    <p>The preflight estimates storage, CPU, memory, and GPU capacity, presents lease options, and produces a signed-proof-ready PNPK agreement packet. No disk is partitioned and no compute is activated from this webpage.</p>
    <div class="steps">
      <div class="step"><strong>1. Evaluate</strong><span>Browser estimate or signed local-agent inventory.</span></div>
      <div class="step"><strong>2. Select</strong><span>Choose storage, compute, GPU, or proof-only capacity.</span></div>
      <div class="step"><strong>3. Approve</strong><span>Accept the pilot agreement; operator activation remains separate.</span></div>
    </div>
    <div class="warning"><strong>Fail-closed:</strong> system disks, partition deletion, volume shrinking, payment execution, and activation without a separate grant are prohibited.</div>
  </section>

  <section class="panel">
    <h2>Capacity preflight</h2>
    <p>Click once for a browser-level estimate, then correct any values using a local inventory report when available.</p>
    <form id="preflight-form">
      <div class="actions"><button type="button" id="detect">Evaluate this device</button><button type="button" class="secondary" id="clear">Clear</button></div>
      <div id="detect-status" class="status">Waiting to evaluate this device.</div>
      <div class="grid">
        <div class="field"><label for="cpu">CPU threads</label><input id="cpu" name="cpu_threads" type="number" min="0" max="4096" required></div>
        <div class="field"><label for="memory">Free memory (MB)</label><input id="memory" name="memory_free_mb" type="number" min="0" required><small>Browser detection may only provide an approximate total.</small></div>
        <div class="field"><label for="storage-total">Storage total (GB)</label><input id="storage-total" name="storage_total_gb" type="number" min="0" required></div>
        <div class="field"><label for="storage-free">Storage free or browser quota (GB)</label><input id="storage-free" name="storage_free_gb" type="number" min="0" required></div>
        <div class="field"><label for="unallocated">Verified unallocated disk space (GB)</label><input id="unallocated" name="storage_unallocated_gb" type="number" min="0" value="0"><small>Leave zero unless a signed local agent verified it.</small></div>
        <div class="field"><label for="gpu-count">GPU count</label><input id="gpu-count" name="gpu_count" type="number" min="0" max="256" value="0"></div>
        <div class="field"><label for="gpu-vram">Total GPU VRAM (MB)</label><input id="gpu-vram" name="gpu_vram_total_mb" type="number" min="0" value="0"></div>
        <div class="field"><label for="gpu-runtime">GPU runtime</label><select id="gpu-runtime" name="gpu_runtime"><option>unknown</option><option>cuda</option><option>rocm</option><option>directml</option><option>webgpu</option></select></div>
        <div class="field"><label for="hours">Requested lease hours</label><input id="hours" name="requested_lease_hours" type="number" min="1" max="8760" value="24" required></div>
        <div class="field"><label for="rate">Requested rate (USD/hour)</label><input id="rate" name="requested_rate_usd_per_hour" type="number" min="0" step="0.01" value="0"></div>
        <div class="field"><label for="region">Region</label><input id="region" name="region" maxlength="80" placeholder="Pacific Northwest"></div>
      </div>
      <div class="checks"><label><input id="owner-control" type="checkbox" required>I own or am explicitly authorized to offer this hardware.</label></div>
      <div class="actions"><button id="create-offer" type="submit">Generate capacity options</button></div>
    </form>
  </section>

  <section id="agreement-panel" class="panel hidden">
    <h2>Select and accept the pilot lease agreement</h2>
    <div id="offer-summary" class="status good"></div>
    <form id="agreement-form">
      <div id="options" class="options"></div>
      <div class="field"><label for="owner-reference">Owner reference</label><input id="owner-reference" maxlength="200" required placeholder="Email or account handle"><small>Stored only as a SHA-256 reference hash.</small></div>
      <div class="checks">
        <label><input name="owner_controls_hardware" type="checkbox" required>I control the hardware described in this offer.</label>
        <label><input name="inventory_is_accurate" type="checkbox" required>The submitted capacity information is accurate to the best of my knowledge.</label>
        <label><input name="system_disk_changes_prohibited" type="checkbox" required>I understand system/boot disks, partition deletion, and automatic volume shrinking are prohibited.</label>
        <label><input name="separate_activation_grant_required" type="checkbox" required>I understand this agreement does not activate, partition, or enroll the device; a separate signed activation grant is required.</label>
        <label><input name="pilot_terms_accepted" type="checkbox" required>I accept the controlled-pilot capacity reservation terms shown in this offer.</label>
      </div>
      <div class="actions"><button type="submit">Accept agreement and create PNPK receipt</button></div>
    </form>
  </section>

  <section id="receipt-panel" class="panel hidden">
    <h2>Agreement receipt</h2>
    <div id="receipt-status" class="status good"></div>
    <pre id="receipt" class="receipt"></pre>
    <div class="actions"><button type="button" id="download">Download .pnpk</button></div>
  </section>
  <p class="foot">This controlled-pilot workflow records intent and approval evidence. It is not legal advice, a payment rail, or permission to modify third-party equipment.</p>
</main>
<script>
(() => {
  const apiBase = "${safeApiBase}";
  const form = document.querySelector("#preflight-form");
  const agreementForm = document.querySelector("#agreement-form");
  const detectStatus = document.querySelector("#detect-status");
  let currentOffer = null;
  let agreementToken = null;
  let currentPnpk = null;

  const gb = (bytes) => Math.max(0, Math.round(Number(bytes || 0) / 1_073_741_824));
  const value = (id, next) => { const node = document.querySelector(id); if (next !== undefined) node.value = next; return node.value; };
  const checked = (selector) => document.querySelector(selector)?.checked === true;
  const deviceId = () => {
    let id = localStorage.getItem("skygrid-capacity-device-id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("skygrid-capacity-device-id", id); }
    return id;
  };

  async function hash(valueToHash) {
    const bytes = new TextEncoder().encode(String(valueToHash));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
  }

  document.querySelector("#detect").addEventListener("click", async () => {
    detectStatus.className = "status";
    detectStatus.textContent = "Evaluating browser-visible capacity…";
    value("#cpu", navigator.hardwareConcurrency || 0);
    const deviceMemoryGb = Number(navigator.deviceMemory || 0);
    value("#memory", Math.round(deviceMemoryGb * 1024 * 0.5));
    let storageMessage = "Storage estimate unavailable.";
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      value("#storage-total", gb(estimate.quota));
      value("#storage-free", gb(Math.max(0, Number(estimate.quota || 0) - Number(estimate.usage || 0))));
      storageMessage = "Browser storage quota detected; a signed local agent is required to verify physical disk space.";
    }
    let gpuMessage = "WebGPU not available.";
    if (navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          value("#gpu-count", 1);
          value("#gpu-runtime", "webgpu");
          gpuMessage = "A WebGPU adapter is available; model and VRAM still require local-agent verification.";
        }
      } catch { gpuMessage = "WebGPU access was not granted."; }
    }
    detectStatus.className = "status good";
    detectStatus.textContent = storageMessage + " " + gpuMessage;
  });

  document.querySelector("#clear").addEventListener("click", () => {
    form.reset(); value("#hours", 24); value("#rate", 0); value("#gpu-count", 0); value("#gpu-vram", 0); value("#unallocated", 0);
    detectStatus.className = "status"; detectStatus.textContent = "Waiting to evaluate this device.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = document.querySelector("#create-offer"); button.disabled = true;
    detectStatus.className = "status"; detectStatus.textContent = "Creating PNPK capacity offer…";
    try {
      const payload = {
        inventory: {
          device_id_hash: await hash(deviceId()),
          inventory_source: "browser_preflight",
          platform: navigator.platform || "browser",
          cpu_threads: Number(value("#cpu")),
          memory_total_mb: Number(value("#memory")) * 2,
          memory_free_mb: Number(value("#memory")),
          storage_total_gb: Number(value("#storage-total")),
          storage_free_gb: Number(value("#storage-free")),
          storage_unallocated_gb: Number(value("#unallocated")),
          storage_system_disk: true,
          gpu_count: Number(value("#gpu-count")),
          gpu_vram_total_mb: Number(value("#gpu-vram")),
          gpu_runtime: value("#gpu-runtime"),
          owner_control_confirmed: checked("#owner-control")
        },
        requested_lease_hours: Number(value("#hours")),
        requested_rate_usd_per_hour: Number(value("#rate")),
        region: value("#region")
      };
      const response = await fetch(apiBase + "/preflight", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.reason || result.error || "Preflight failed");
      currentOffer = result.offer; agreementToken = result.agreement_token;
      const options = document.querySelector("#options"); options.textContent = "";
      currentOffer.options.forEach((option, index) => {
        const label = document.createElement("label"); label.className = "option";
        const input = document.createElement("input"); input.type = "radio"; input.name = "selected_option"; input.value = option.option_id; input.required = true; input.checked = index === 0;
        const copy = document.createElement("span"); const title = document.createElement("strong"); title.textContent = option.label;
        const detail = document.createElement("small"); detail.textContent = [option.storage_gb ? option.storage_gb + " GB" : null, option.cpu_threads ? option.cpu_threads + " CPU threads" : null, option.memory_mb ? option.memory_mb + " MB RAM" : null, option.gpu_count ? option.gpu_count + " GPU" : null, option.partition_mode].filter(Boolean).join(" · ");
        copy.append(title, detail); label.append(input, copy); options.append(label);
      });
      document.querySelector("#offer-summary").textContent = "Offer " + currentOffer.offer_id + " · expires " + currentOffer.expires_at + " · execution authority: none";
      document.querySelector("#agreement-panel").classList.remove("hidden");
      document.querySelector("#agreement-panel").scrollIntoView({behavior:"smooth"});
      detectStatus.className = "status good"; detectStatus.textContent = "Capacity options generated. Review the agreement below.";
    } catch (error) {
      detectStatus.className = "status warn"; detectStatus.textContent = String(error.message || error);
    } finally { button.disabled = false; }
  });

  agreementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const selected = new FormData(agreementForm).get("selected_option");
    const payload = {
      offer_id: currentOffer.offer_id,
      offer: currentOffer,
      agreement_token: agreementToken,
      selected_option_id: selected,
      owner_reference: value("#owner-reference"),
      owner_controls_hardware: checked('[name="owner_controls_hardware"]'),
      inventory_is_accurate: checked('[name="inventory_is_accurate"]'),
      system_disk_changes_prohibited: checked('[name="system_disk_changes_prohibited"]'),
      separate_activation_grant_required: checked('[name="separate_activation_grant_required"]'),
      pilot_terms_accepted: checked('[name="pilot_terms_accepted"]')
    };
    try {
      const response = await fetch(apiBase + "/agreements", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.reason || result.error || "Agreement failed");
      currentPnpk = result.agreement;
      document.querySelector("#receipt-status").textContent = "Owner agreement recorded. SKYGRID operator review and a separate activation grant are still required.";
      document.querySelector("#receipt").textContent = JSON.stringify(result, null, 2);
      document.querySelector("#receipt-panel").classList.remove("hidden");
      document.querySelector("#receipt-panel").scrollIntoView({behavior:"smooth"});
    } catch (error) {
      document.querySelector("#offer-summary").className = "status warn";
      document.querySelector("#offer-summary").textContent = String(error.message || error);
    }
  });

  document.querySelector("#download").addEventListener("click", () => {
    if (!currentPnpk) return;
    const blob = new Blob([JSON.stringify(currentPnpk, null, 2) + "\n"], {type:"application/json"});
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = currentPnpk.offer_id + ".pnpk"; link.click(); URL.revokeObjectURL(link.href);
  });
})();
</script>
</body>
</html>`;
}
