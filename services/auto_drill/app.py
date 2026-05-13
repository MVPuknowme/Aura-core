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
DEFAULT_SWITCH_THRESHOLD = 7.5


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


@dataclass(frozen=True)
class AutoSwitchDecision:
    active_route: DrillRoute | None
    fallback_route: DrillRoute | None
    mode: str
    switch_recommended: bool
    switch_reason: str
    score_gap: float
    threshold: float


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


def route_penalty(route: DrillRoute) -> float:
    """Estimate operational pressure that may justify a route switch.

    A higher penalty means higher friction caused by latency, health degradation,
    or lower success rate. This is not a trading or wallet signal.
    """
    latency_pressure = min(route.latency_ms / 1000.0, 1.0) * 25.0
    health_pressure = max(0.0, 100.0 - route.health_score) * 0.35
    reliability_pressure = max(0.0, 100.0 - route.success_rate) * 0.40
    return clamp_score(latency_pressure + health_pressure + reliability_pressure)


def adjusted_score(route: DrillRoute, objective: str = "balanced") -> float:
    """Score a route for a selected operator objective.

    Supported objectives:
      - balanced: default mixed signal
      - lowest-latency: prioritize faster routes
      - lowest-cost: prioritize lower-cost/builder accessibility
      - grants: prioritize opportunity/grant alignment
      - reliability: prioritize health and success rate
    """
    base = score_route(route)
    objective = objective.strip().lower()

    if objective == "lowest-latency":
        latency_bonus = max(0.0, 100.0 - min(route.latency_ms, 1000) / 10.0)
        return clamp_score(base * 0.70 + latency_bonus * 0.30)

    if objective == "lowest-cost":
        return clamp_score(base * 0.70 + route.cost_score * 0.30)

    if objective == "grants":
        return clamp_score(base * 0.65 + route.opportunity_weight * 0.35)

    if objective == "reliability":
        reliability = route.health_score * 0.50 + route.success_rate * 0.50
        return clamp_score(base * 0.60 + reliability * 0.40)

    return base


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


def serialize_route(route: DrillRoute, objective: str = "balanced") -> dict[str, Any]:
    data = asdict(route)
    data["score"] = score_route(route)
    data["adjustedScore"] = adjusted_score(route, objective)
    data["pressure"] = route_penalty(route)
    data["publicSafe"] = True
    data["actionType"] = "reference_and_validation_only"
    return data


def get_ranked_routes(category: str = "", objective: str = "balanced") -> list[DrillRoute]:
    candidates = ROUTES
    if category:
        category = category.strip().lower()
        candidates = [route for route in ROUTES if route.category.lower() == category]

    return sorted(
        candidates,
        key=lambda route: adjusted_score(route, objective),
        reverse=True,
    )


def make_auto_switch_decision(
    category: str = "",
    objective: str = "balanced",
    threshold: float = DEFAULT_SWITCH_THRESHOLD,
) -> AutoSwitchDecision:
    ranked = get_ranked_routes(category=category, objective=objective)

    if not ranked:
        return AutoSwitchDecision(
            active_route=None,
            fallback_route=None,
            mode="no_candidates",
            switch_recommended=False,
            switch_reason="No routes matched the requested filters.",
            score_gap=0.0,
            threshold=threshold,
        )

    active = ranked[0]
    fallback = ranked[1] if len(ranked) > 1 else None

    if fallback is None:
        return AutoSwitchDecision(
            active_route=active,
            fallback_route=None,
            mode="single_route",
            switch_recommended=False,
            switch_reason="Only one route matched; no fallback route is available.",
            score_gap=0.0,
            threshold=threshold,
        )

    active_score = adjusted_score(active, objective)
    fallback_score = adjusted_score(fallback, objective)
    score_gap = clamp_score(active_score - fallback_score)

    active_pressure = route_penalty(active)
    fallback_pressure = route_penalty(fallback)

    switch_recommended = False
    switch_reason = "Primary route remains strongest under current pilot scoring."
    mode = "hold_primary"

    if score_gap < threshold and fallback_pressure < active_pressure:
        switch_recommended = True
        mode = "switch_to_fallback"
        switch_reason = "Fallback route is close in score and has lower operational pressure."
    elif score_gap < threshold:
        mode = "watch_fallback"
        switch_reason = "Fallback route is close enough to watch, but current primary still holds."

    return AutoSwitchDecision(
        active_route=active,
        fallback_route=fallback,
        mode=mode,
        switch_recommended=switch_recommended,
        switch_reason=switch_reason,
        score_gap=score_gap,
        threshold=threshold,
    )


def serialize_switch_decision(
    decision: AutoSwitchDecision,
    objective: str = "balanced",
) -> dict[str, Any]:
    return {
        "mode": decision.mode,
        "switchRecommended": decision.switch_recommended,
        "switchReason": decision.switch_reason,
        "scoreGap": decision.score_gap,
        "threshold": decision.threshold,
        "activeRoute": serialize_route(decision.active_route, objective) if decision.active_route else None,
        "fallbackRoute": serialize_route(decision.fallback_route, objective) if decision.fallback_route else None,
        "actionType": "recommendation_only",
        "publicSafe": True,
    }


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
    decision = make_auto_switch_decision()
    return jsonify(
        {
            "service": SERVICE_NAME,
            "status": STATUS,
            "metricsEnabled": True,
            "consentRequired": True,
            "rawTelemetryPublic": False,
            "aggregateOnlyDashboard": True,
            "autoSwitchMode": decision.mode,
            "activeRoute": decision.active_route.network if decision.active_route else None,
            "fallbackRoute": decision.fallback_route.network if decision.fallback_route else None,
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
                "routeHealthScore",
                "routeSuccessRate",
            ],
            "autoSwitch": {
                "enabled": True,
                "defaultObjective": "balanced",
                "supportedObjectives": [
                    "balanced",
                    "lowest-latency",
                    "lowest-cost",
                    "grants",
                    "reliability",
                ],
                "defaultThreshold": DEFAULT_SWITCH_THRESHOLD,
                "mode": "recommendation_only",
            },
            "disallowedActions": [
                "hiddenMining",
                "walletTransaction",
                "exchangeTrade",
                "privateCredentialCollection",
                "silentTelemetry",
                "automaticBridgeTransfer",
                "automaticSwap",
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
    decision = make_auto_switch_decision()
    return jsonify(
        {
            "status": STATUS,
            "totalSessions": 0,
            "successfulHealthChecks": 0,
            "averageLatencyMs": None,
            "routeDrillRecommendations": len(ROUTES),
            "autoSwitch": serialize_switch_decision(decision),
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
      objective: balanced | lowest-latency | lowest-cost | grants | reliability
      limit: optional integer, default 6, max 20
    """
    category = request.args.get("category", "").strip().lower()
    objective = request.args.get("objective", "balanced").strip().lower()
    try:
        limit = min(max(int(request.args.get("limit", "6")), 1), 20)
    except ValueError:
        limit = 6

    ranked = get_ranked_routes(category=category, objective=objective)[:limit]
    return jsonify(
        {
            "service": SERVICE_NAME,
            "status": STATUS,
            "strategy": "AI-assisted route drilling, deterministic pilot scorer",
            "objective": objective,
            "disclaimer": "Reference and validation only. No mining, staking, trading, wallet, bridge, or exchange action is performed.",
            "recommended": [serialize_route(route, objective) for route in ranked],
            "updatedAt": utc_now(),
        }
    )


@app.get("/routes/auto-switch")
def routes_auto_switch():
    """Return the active/fallback route decision.

    This endpoint does not perform a bridge, swap, wallet action, transaction,
    or deployment. It only returns a recommendation that a human/operator or
    approved controller can review.
    """
    category = request.args.get("category", "").strip().lower()
    objective = request.args.get("objective", "balanced").strip().lower()

    try:
        threshold = float(request.args.get("threshold", DEFAULT_SWITCH_THRESHOLD))
    except (TypeError, ValueError):
        threshold = DEFAULT_SWITCH_THRESHOLD

    threshold = max(0.0, min(threshold, 100.0))
    decision = make_auto_switch_decision(
        category=category,
        objective=objective,
        threshold=threshold,
    )

    return jsonify(
        {
            "service": SERVICE_NAME,
            "status": STATUS,
            "strategy": "Auto-switch route controller, recommendation-only",
            "objective": objective,
            "category": category or "all",
            "disclaimer": "Recommendation only. No mining, staking, trading, wallet, bridge, swap, or exchange action is performed.",
            "decision": serialize_switch_decision(decision, objective),
            "updatedAt": utc_now(),
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
