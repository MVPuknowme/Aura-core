# SKYGRID Controlled-Pilot Evidence Re-score — 2026-08-20

## Result

**10.0/10 controlled-pilot evidence on Linux and 10.0/10 on Windows.**

This report re-scores the preserved artifacts from GitHub Actions run `29459954329` (`SKYGRID Controlled Pilot Verification`, run 19), which completed successfully on both Ubuntu and Windows for head SHA `0fafefc1881ee13ca1ac17fa93e51d4ab1dbcb4a`.

This is a **2026-08-20 re-score of a successful 2026-07-15 CI execution**. It is not represented as a fresh production, WAN, partner, or field execution.

## Verified source integrity

| Platform | Artifact ID | GitHub artifact SHA-256 | Locally verified SHA-256 |
| --- | ---: | --- | --- |
| Linux | `8360769924` | `0c94155c46dc0806304a34eaa82f7f278971ab0f2cf9443b06605d0451780e6f` | Match |
| Windows | `8360787393` | `95d8efc29c87e612b077ad7d4c4b498077d08ae22faad22b214c612742666fe7` | Match |

The downloaded receipt archives matched the digests reported by GitHub Actions.

## Cross-platform measurements

| Metric | Linux | Windows |
| --- | ---: | ---: |
| Controlled-pilot score | **10.0/10** | **10.0/10** |
| Scenarios passed | **16/16** | **16/16** |
| Missing event IDs | **0** | **0** |
| Primary/local/queue route probes | **3/3** | **3/3** |
| p50 latency | **4 ms** | **9 ms** |
| p95 latency | **49 ms** | **57 ms** |
| p99 latency | **49 ms** | **57 ms** |
| CI performance budget | <= 1500 ms p95 | <= 1500 ms p95 |

The p95 figures are local-runtime CI measurements and are used only as regression evidence.

## 10-point rubric result

All ten dimensions passed on both platforms:

1. Intake acceptance.
2. Event identity.
3. Route discipline.
4. Approval discipline.
5. Prohibited-action rejection.
6. Exact rejection reasons.
7. Safety guard.
8. Receipt quality.
9. Operator gate.
10. Controlled-pilot p95 latency.

Mandatory hard gates also passed:

- complete 16/16 curriculum;
- fail-closed safety with no forbidden execution reported;
- evidence score >= 9.0/10.

## Cost evidence

Cost per event is **not scored** in this report. No same-run attributable infrastructure charge is attached to GitHub Actions run `29459954329`, so historical AWS or other cloud costs are intentionally not divided across these events.

## Scope and limitations

This evidence supports a **10/10 controlled-pilot functional/safety/evidence score**, not a production-readiness or SLA claim. It does not establish WAN latency, AWS regional failover time, RTO/RPO under real infrastructure loss, partner traffic performance, production availability, or field reliability.

The 2026-08-20 branch adds a repeatable scorer and two-platform workflow so future runs can generate the score directly as a CI artifact rather than requiring an external re-score.
