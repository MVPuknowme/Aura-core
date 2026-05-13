"""
SKYGRID / Aura-Core Auto Drill Backend

Purpose:
  Safe AI-assisted route drilling for Web3/L2 ecosystem participation.

This service does NOT mine cryptocurrency, trigger wallet actions, trade, stake,
or perform hidden device activity. It recommends public ecosystem routes based on
transparent scoring inputs: health, latency, cost estimate, success rate, and
opportunity weight.

Public positioning:
  "AI route drilling for validation, analytics, grants, and infrastructure participation."
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Any

from flask import Flask, jsonify, request

app = Flask(__name__)

SERVICE_NAME = "SKYGRID Auto Drill"
STATUS = "pilot"
CONSENT_VERSION = "validation-consent-v1"


@dataclass(frozen=True)
class DrillRoute:
    network: str
    category: str
    ecosystem_tag: str
    explorer_url: str
    developer_url: str
    grant_or_growth_url: str | None
    health_score: float
    latency_ms: int
    cost_score: float
    success_rate: float
    opportunity_weight: float
    notes: str


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clamp_score(value: float) -> float:
    return max(0.0, min(100.0, round(value, 2)))


def score_route(route: DrillRoute) -> float:
    """Return a transparent 0-100 score.

    Weights:
      - health: 30%
      - success rate: 25%
      - low latency: 15%
      - low cost / builder accessibility: 15%
      - opportunity weight: 15%
    """
    latency_score = max(0.0, 100.0 - min(route.latency_ms, 1000) / 10.0)
    score = (
        route.health_score * 0.30
        + route.success_rate * 0.25
        + latency_score * 0.15
        + route.cost_score * 0.15
        + route.opportunity_weight * 0.15
    )
    return clamp_score(score)


# Static pilot route map. Replace these values with live telemetry once the
# validation endpoints and uptime checks are proven.
ROUTES: list[DrillRoute] = [
    DrillRoute(
        network="Ethereum",
        category="validator-support",
        ecosystem_tag="L1 proof-of-stake validation reference",
        explorer_url="https://etherscan.io/",
        developer_url="https://ethereum.org/developers/",
        grant_or_growth_url="https://esp.ethereum.foundation/",
        health_score=92,
        latency_ms=180,
        cost_score=55,
        success_rate=94,
        opportunity_weight=82,
        notes="Use as the trust anchor and validator education route; not mining.",
    ),
    DrillRoute(
        network="Base",
        category="builder-growth",
        ecosystem_tag="AI apps, payments, consumer onchain onboarding",
        explorer_url="https://basescan.org/",
        developer_url="https://docs.base.org/",
        grant_or_growth_url="https://www.base.org/builders",
        health_score=90,
        latency_ms=95,
        cost_score=92,
        success_rate=91,
        opportunity_weight=95,
        notes="Strong early-adopter and builder distribution route.",
    ),
    DrillRoute(
        network="Optimism",
        category="public-goods",
        ecosystem_tag="OP Stack, grants, public-good infrastructure",
        explorer_url="https://optimistic.etherscan.io/",
        developer_url="https://docs.optimism.io/",
        grant_or_growth_url="https://www.optimism.io/grants",
        health_score=89,
        latency_ms=110,
        cost_score=90,
        success_rate=90,
        opportunity_weight=93,
        notes="Best framed as public-good route-health and OP Stack analytics.",
    ),
    DrillRoute(
        network="Arbitrum",
        category="developer-ecosystem",
        ecosystem_tag="L2 apps, DeFi, Orbit chains, ecosystem growth",
        explorer_url="https://arbiscan.io/",
        developer_url="https://docs.arbitrum.io/",
        grant_or_growth_url="https://arbitrum.foundation/grants",
        health_score=88,
        latency_ms=125,
        cost_score=88,
        success_rate=89,
        opportunity_weight=90,
        notes="Good candidate for route analytics, app infrastructure, and builder tooling.",
    ),
    DrillRoute(
        network="Scroll",
        category="zk-l2",
        ecosystem_tag="zkEVM route testing and proof-oriented analytics",
        explorer_url="https://scrollscan.com/",
        developer_url="https://docs.scroll.io/",
        grant_or_growth_url="https://scroll.io/developer-nft/check-eligibility",
        health_score=84,
        latency_ms=140,
        cost_score=86,
        success_rate=85,
        opportunity_weight=86,
        notes="Useful for proof-themed pilots and zk route performance tests.",
    ),
    DrillRoute(
        network="Covalent",
        category="data-api",
        ecosystem_tag="multi-chain data, analytics, query/API integration",
        explorer_url="https://www.covalenthq.com/",
        developer_url="https://www.covalenthq.com/docs/",
        grant_or_growth_url="https://www.covalenthq.com/",
        health_score=87,
        latency_ms=160,
        cost_score=84,
        success_rate=88,
        opportunity_weight=91,
        notes="Best positioned for data enrichment and route-health dashboards.",
    ),
]


def serialize_route(route: DrillRoute) -> dict[str, Any]:
    data = asdict(route)
    data["score"] = score_route(route)
    data["publicSafe"] = True
    data["actionType"] = "reference_and_validation_only"
    return data


@app.get("/health")
def health():
    return jsonify(
        {
            "service": SERVICE_NAME,
            "status": STATUS,
            "ok": True,
            "checkedAt": utc_now(),
            "notes": "Pilot/demo only. No mining, staking, trading, or wallet actions.",
        }
    )


@app.get("/validation/status")
def validation_status():
    return jsonify(
        {
            "service": SERVICE_NAME,
            "status": STATUS,
            "metricsEnabled": True,
            "consentRequired": True,
            "rawTelemetryPublic": False,
            "aggregateOnlyDashboard": True,
            "updatedAt": utc_now(),
        }
    )


@app.get("/validation/config")
def validation_config():
    return jsonify(
        {
            "consentVersion": CONSENT_VERSION,
            "defaultLocationMode": "none",
            "allowedMetrics": [
                "timestampUtc",
                "timezone",
                "approximateLocationOptional",
                "weatherContextOptional",
                "browserFamily",
                "platform",
                "routeLatencyMs",
                "explorerLinkOpened",
            ],
            "disallowedActions": [
                "hiddenMining",
                "walletTransaction",
                "exchangeTrade",
                "privateCredentialCollection",
                "silentTelemetry",
            ],
        }
    )


@app.post("/validation/consent")
def validation_consent():
    body = request.get_json(silent=True) or {}
    participant_id = body.get("participantId") or "anonymous-pilot"
    accepted = bool(body.get("accepted", False))
    return jsonify(
        {
            "ok": accepted,
            "participantId": participant_id,
            "consentVersion": CONSENT_VERSION,
            "recordedAt": utc_now(),
            "notes": "Consent recorded only if accepted=true. This endpoint does not trigger mining or wallet actions.",
        }
    ), (200 if accepted else 400)


@app.post("/validation/metrics")
def validation_metrics():
    body = request.get_json(silent=True) or {}
    if body.get("consentVersion") != CONSENT_VERSION:
        return jsonify({"ok": False, "error": "Missing or invalid consentVersion"}), 400

    accepted_fields = {
        "participantId": body.get("participantId", "anonymous-pilot"),
        "timestampUtc": body.get("timestampUtc", utc_now()),
        "timezone": body.get("timezone"),
        "locationMode": (body.get("location") or {}).get("mode", "none"),
        "weatherProvided": bool(body.get("weather")),
        "validation": body.get("validation", {}),
    }
    return jsonify(
        {
            "ok": True,
            "received": True,
            "acceptedFields": accepted_fields,
            "recordedAt": utc_now(),
            "notes": "Pilot validation metrics accepted. Raw telemetry is not public.",
        }
    )


@app.get("/validation/aggregate")
def validation_aggregate():
    return jsonify(
        {
            "status": STATUS,
            "totalSessions": 0,
            "successfulHealthChecks": 0,
            "averageLatencyMs": None,
            "routeDrillRecommendations": len(ROUTES),
            "explorerClicks": {
                "etherscan": 0,
                "basescan": 0,
                "optimism": 0,
                "arbiscan": 0,
                "scrollscan": 0,
                "covalent": 0,
            },
            "updatedAt": utc_now(),
        }
    )


@app.get("/routes/recommend")
def routes_recommend():
    """Return the currently strongest route-drilling targets.

    Query params:
      category: optional exact category filter
      limit: optional integer, default 6, max 20
    """
    category = request.args.get("category", "").strip().lower()
    try:
        limit = min(max(int(request.args.get("limit", "6")), 1), 20)
    except ValueError:
        limit = 6

    candidates = ROUTES
    if category:
        candidates = [r for r in ROUTES if r.category.lower() == category]

    ranked = sorted(candidates, key=score_route, reverse=True)[:limit]
    return jsonify(
        {
            "service": SERVICE_NAME,
            "status": STATUS,
            "strategy": "AI-assisted route drilling, deterministic pilot scorer",
            "disclaimer": "Reference and validation only. No mining, staking, trading, wallet, or exchange action is performed.",
            "recommended": [serialize_route(route) for route in ranked],
            "updatedAt": utc_now(),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
