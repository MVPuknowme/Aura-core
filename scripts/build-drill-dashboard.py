#!/usr/bin/env python3
"""Build a static HTML dashboard from SkyGrid auto-drill JSON reports."""

from __future__ import annotations

import html
import json
from pathlib import Path
from statistics import mean

REPORT_DIR = Path("drill-reports")
PUBLIC_DIR = Path("public")
OUT_FILE = PUBLIC_DIR / "auto-drill.html"
LATEST_FILE = PUBLIC_DIR / "latest-auto-drill.json"


def load_reports() -> list[dict]:
    reports: list[dict] = []
    if not REPORT_DIR.exists():
        return reports

    for path in sorted(REPORT_DIR.glob("skygrid-auto-drill-*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            data["_source_file"] = path.name
            reports.append(data)
        except Exception as exc:  # noqa: BLE001
            reports.append({
                "drill_id": path.stem,
                "selected_route": "parse_error",
                "primary_status": "unknown",
                "fallback_status": "unknown",
                "started_at": "unknown",
                "ended_at": "unknown",
                "_source_file": path.name,
                "_error": str(exc),
            })

    reports.sort(key=lambda item: item.get("started_at", ""), reverse=True)
    return reports


def avg_latency(samples: list[dict]) -> str:
    values = []
    for sample in samples or []:
        try:
            values.append(float(sample.get("time_total_seconds", 0)))
        except (TypeError, ValueError):
            pass
    if not values:
        return "n/a"
    return f"{mean(values) * 1000:.0f} ms"


def badge(value: str) -> str:
    escaped = html.escape(str(value))
    safe_class = "ok" if value == "healthy" else "warn" if value in {"degraded", "fallback", "fallback_degraded", "primary_degraded_hold"} else "bad"
    return f'<span class="badge {safe_class}">{escaped}</span>'


def build_html(reports: list[dict]) -> str:
    latest = reports[0] if reports else {}
    rows = []
    for report in reports[:50]:
        rows.append(
            "<tr>"
            f"<td>{html.escape(str(report.get('started_at', 'unknown')))}</td>"
            f"<td>{html.escape(str(report.get('drill_id', 'unknown')))}</td>"
            f"<td>{badge(str(report.get('primary_status', 'unknown')))}</td>"
            f"<td>{badge(str(report.get('fallback_status', 'unknown')))}</td>"
            f"<td>{badge(str(report.get('selected_route', 'unknown')))}</td>"
            f"<td>{avg_latency(report.get('baseline_primary', []))}</td>"
            f"<td>{avg_latency(report.get('baseline_fallback', []))}</td>"
            f"<td>{html.escape(str(report.get('_source_file', '')))}</td>"
            "</tr>"
        )

    latest_summary = "No reports found yet. Run scripts/auto-drill.sh first."
    if latest:
        latest_summary = (
            f"Latest drill {html.escape(str(latest.get('drill_id', 'unknown')))} selected "
            f"{html.escape(str(latest.get('selected_route', 'unknown')))}."
        )

    table_rows = "\n".join(rows) if rows else "<tr><td colspan='8'>No drill reports available.</td></tr>"

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SkyGrid Auto Drill Dashboard</title>
  <style>
    :root {{ color-scheme: dark; --bg:#07111f; --panel:#101c2f; --text:#edf7ff; --muted:#9bb0c8; --line:#263955; }}
    body {{ margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at top left, #172b4d, var(--bg)); color:var(--text); }}
    main {{ max-width: 1180px; margin: 0 auto; padding: 32px 18px; }}
    .hero {{ border:1px solid var(--line); border-radius:24px; padding:24px; background:rgba(16,28,47,.86); box-shadow:0 20px 70px rgba(0,0,0,.35); }}
    h1 {{ margin:0 0 8px; font-size: clamp(2rem, 5vw, 4rem); letter-spacing:-.04em; }}
    p {{ color:var(--muted); line-height:1.55; }}
    .grid {{ display:grid; grid-template-columns: repeat(auto-fit, minmax(190px,1fr)); gap:14px; margin:18px 0; }}
    .card {{ border:1px solid var(--line); border-radius:18px; padding:16px; background:rgba(255,255,255,.045); }}
    .label {{ color:var(--muted); font-size:.82rem; text-transform:uppercase; letter-spacing:.08em; }}
    .value {{ font-size:1.35rem; margin-top:6px; font-weight:700; }}
    table {{ width:100%; border-collapse:collapse; overflow:hidden; border-radius:16px; background:rgba(16,28,47,.86); }}
    th, td {{ border-bottom:1px solid var(--line); padding:12px 10px; text-align:left; font-size:.92rem; }}
    th {{ color:#cce9ff; background:rgba(255,255,255,.06); }}
    .badge {{ display:inline-block; border-radius:999px; padding:4px 10px; font-size:.8rem; font-weight:700; }}
    .ok {{ background:rgba(40,199,111,.16); color:#86efac; }}
    .warn {{ background:rgba(255,193,7,.16); color:#fde68a; }}
    .bad {{ background:rgba(255,82,82,.16); color:#fca5a5; }}
    .footer {{ margin-top:18px; font-size:.9rem; color:var(--muted); }}
    a {{ color:#8bdcff; }}
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="label">Aura-Core / SkyGrid</div>
      <h1>Auto Drill Dashboard</h1>
      <p>{latest_summary}</p>
      <div class="grid">
        <div class="card"><div class="label">Reports</div><div class="value">{len(reports)}</div></div>
        <div class="card"><div class="label">Latest primary</div><div class="value">{html.escape(str(latest.get('primary_status', 'n/a')))}</div></div>
        <div class="card"><div class="label">Latest fallback</div><div class="value">{html.escape(str(latest.get('fallback_status', 'n/a')))}</div></div>
        <div class="card"><div class="label">Selected route</div><div class="value">{html.escape(str(latest.get('selected_route', 'n/a')))}</div></div>
      </div>
      <p>Advisory resilience telemetry only. Authorized endpoints, no secrets, no wallet signing, no third-party network manipulation.</p>
    </section>

    <h2>Recent drill telemetry</h2>
    <table>
      <thead>
        <tr><th>Started</th><th>Drill ID</th><th>Primary</th><th>Fallback</th><th>Route</th><th>Primary avg</th><th>Fallback avg</th><th>Source</th></tr>
      </thead>
      <tbody>{table_rows}</tbody>
    </table>
    <div class="footer">Latest JSON: <a href="latest-auto-drill.json">latest-auto-drill.json</a></div>
  </main>
</body>
</html>
"""


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    reports = load_reports()
    OUT_FILE.write_text(build_html(reports), encoding="utf-8")
    if reports:
        LATEST_FILE.write_text(json.dumps(reports[0], indent=2), encoding="utf-8")
    else:
        LATEST_FILE.write_text(json.dumps({"status": "no_reports"}, indent=2), encoding="utf-8")
    print(f"Built {OUT_FILE} from {len(reports)} report(s)")


if __name__ == "__main__":
    main()
