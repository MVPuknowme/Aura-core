"""
SkyGrid Node Onboarding Flask Gateway

Purpose:
- Provide a Postman-testable API gate in front of the public B12 onboarding page.
- Validate onboarding intake fields before records move toward proof review.
- Return a preflight-friendly response object for Airtable, Linear, DynamoDB, or Step Functions wiring.

This gateway is advisory and recordkeeping oriented. It does not activate nodes,
execute payments, execute Web3 actions, or perform infrastructure changes.
"""

from __future__ import annotations

import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List

from flask import Flask, jsonify, request
from flask_cors import CORS

B12_ONBOARDING_URL = os.getenv(
    "SKYGRID_B12_ONBOARDING_URL",
    "https://aura-sky-skygrid-protocol-staging.b12sites.com/node-onboarding",
)

ALLOWED_PARTNER_TYPES = {
    "business",
    "device_owner",
    "solar_partner",
    "isp",
    "web3_builder",
    "carrier_partner",
    "community_node",
    "investor_sponsor",
    "other",
}

ALLOWED_NETWORK_INTERESTS = {
    "base",
    "usdc",
    "x402",
    "allbridge",
    "helium",
    "ton",
    "cloudflare",
    "blockscout",
    "local_wifi",
    "lora",
    "other",
}

ALLOWED_STATUSES = {
    "lead",
    "contacted",
    "pilot_candidate",
    "technical_review",
    "ready_to_onboard",
    "active_node",
}

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

app = Flask(__name__)
CORS(app)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_string(value: Any, field: str, required: bool = True) -> str | None:
    if value is None:
        if required:
            raise ValueError(f"Missing required field: {field}")
        return None

    if not isinstance(value, str):
        raise ValueError(f"{field} must be a string")

    cleaned = value.strip()
    if required and not cleaned:
        raise ValueError(f"Missing required field: {field}")

    return cleaned or None


def clean_list(value: Any, field: str, allowed: set[str], required: bool = True) -> List[str]:
    if value is None:
        if required:
            raise ValueError(f"Missing required field: {field}")
        return []

    if isinstance(value, str):
        value = [item.strip() for item in value.split(",") if item.strip()]

    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")

    cleaned: List[str] = []
    for item in value:
        if not isinstance(item, str):
            raise ValueError(f"{field} values must be strings")
        normalized = item.strip().lower()
        if normalized not in allowed:
            raise ValueError(f"Invalid {field} value: {item}")
        cleaned.append(normalized)

    if required and not cleaned:
        raise ValueError(f"{field} must include at least one value")

    return cleaned


def score_rate_band(partner_type: str, network_interest: List[str], proof_required: bool) -> str:
    high_review = {"isp", "carrier_partner"}
    web3_review = {"base", "usdc", "x402", "allbridge", "ton"}

    if partner_type in high_review:
        return "yellow" if proof_required else "red"

    if any(item in web3_review for item in network_interest):
        return "yellow" if proof_required else "red"

    if partner_type in {"device_owner", "community_node", "solar_partner"}:
        return "green" if proof_required else "yellow"

    return "yellow"


def validate_onboarding_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    name = clean_string(payload.get("name"), "name")
    email = clean_string(payload.get("email"), "email")
    if email and not EMAIL_RE.match(email):
        raise ValueError("email must be a valid email address")

    partner_type = clean_string(payload.get("partnerType") or payload.get("type"), "partnerType")
    partner_type = partner_type.lower() if partner_type else partner_type
    if partner_type not in ALLOWED_PARTNER_TYPES:
        raise ValueError(f"Invalid partnerType: {partner_type}")

    network_interest = clean_list(
        payload.get("networkInterest"),
        "networkInterest",
        ALLOWED_NETWORK_INTERESTS,
    )

    requested_status = payload.get("onboardingStatus", "lead")
    onboarding_status = clean_string(requested_status, "onboardingStatus")
    onboarding_status = onboarding_status.lower() if onboarding_status else "lead"
    if onboarding_status not in ALLOWED_STATUSES:
        raise ValueError(f"Invalid onboardingStatus: {onboarding_status}")

    proof_required = bool(payload.get("proofRequired", True))
    rate_band = score_rate_band(partner_type, network_interest, proof_required)

    if onboarding_status == "active_node":
        raise ValueError("active_node cannot be requested directly through public intake")

    return {
        "onboarderId": f"onboarder_{uuid.uuid4()}",
        "preflightId": payload.get("preflightId") or f"preflight_{uuid.uuid4()}",
        "name": name,
        "email": email,
        "organization": clean_string(payload.get("organization"), "organization", required=False),
        "partnerType": partner_type,
        "networkInterest": network_interest,
        "locationRegion": clean_string(payload.get("locationRegion"), "locationRegion", required=False),
        "currentInfrastructure": clean_string(
            payload.get("currentInfrastructure"),
            "currentInfrastructure",
            required=False,
        ),
        "desiredUseCase": clean_string(payload.get("desiredUseCase"), "desiredUseCase", required=False),
        "proofPacketNeeded": bool(payload.get("proofPacketNeeded", proof_required)),
        "proofRequired": proof_required,
        "onboardingStatus": onboarding_status,
        "rateBand": rate_band,
        "operatorNotes": clean_string(payload.get("notes"), "notes", required=False),
        "source": "b12-node-onboarding-gateway",
        "sourceUrl": B12_ONBOARDING_URL,
        "createdAt": utc_now(),
        "finalReadinessState": "Queued",
        "nextAction": "Create Airtable record and Linear review issue before activation.",
    }


@app.get("/health")
def health():
    return jsonify(
        {
            "ok": True,
            "service": "skygrid-onboarding-gateway",
            "b12OnboardingUrl": B12_ONBOARDING_URL,
            "timestamp": utc_now(),
        }
    )


@app.post("/api/onboarding/intake")
def intake():
    try:
        payload = request.get_json(force=True, silent=False)
        record = validate_onboarding_payload(payload or {})
        return jsonify({"ok": True, "status": "queued", "record": record}), 202
    except ValueError as exc:
        return jsonify({"ok": False, "status": "validation_error", "message": str(exc)}), 400
    except Exception as exc:  # defensive API boundary
        return jsonify({"ok": False, "status": "unexpected_error", "message": str(exc)}), 500


@app.post("/api/onboarding/preflight")
def preflight():
    try:
        payload = request.get_json(force=True, silent=False)
        record = validate_onboarding_payload(payload or {})
        return jsonify(
            {
                "ok": True,
                "status": "preflight_ready",
                "preflightId": record["preflightId"],
                "rateBand": record["rateBand"],
                "proofRequired": record["proofRequired"],
                "allowedToActivate": False,
                "message": "Public intake is ready for review. Activation requires proof approval.",
                "record": record,
            }
        ), 200
    except ValueError as exc:
        return jsonify({"ok": False, "status": "validation_error", "message": str(exc)}), 400


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8787"))
    app.run(host="0.0.0.0", port=port)
