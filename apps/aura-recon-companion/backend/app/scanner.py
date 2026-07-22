from __future__ import annotations

import hashlib
import ipaddress
import json
import socket
import uuid
from datetime import UTC, datetime

import dns.exception
import dns.resolver
import httpx

from .models import Finding, ScanProfile, ScanReport, ScanRequest

_RECORD_TYPES = ("A", "AAAA", "MX", "NS", "TXT")
_SELECTED_HEADERS = {
    "content-type",
    "content-length",
    "server",
    "strict-transport-security",
    "content-security-policy",
    "x-content-type-options",
    "x-frame-options",
    "referrer-policy",
}


def _validated_public_addresses(hostname: str) -> list[str]:
    try:
        entries = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError(f"Target did not resolve: {exc}") from exc

    addresses = sorted({entry[4][0] for entry in entries})
    if not addresses:
        raise ValueError("Target did not resolve to an address")

    for raw in addresses:
        address = ipaddress.ip_address(raw)
        if not address.is_global:
            raise ValueError("Private, loopback, link-local, reserved, and non-global targets are blocked")
    return addresses


def _dns_findings(target: str) -> list[Finding]:
    findings: list[Finding] = []
    resolver = dns.resolver.Resolver(configure=True)
    resolver.lifetime = 5.0

    for record_type in _RECORD_TYPES:
        try:
            answer = resolver.resolve(target, record_type, raise_on_no_answer=False)
        except (dns.resolver.NXDOMAIN, dns.resolver.NoNameservers, dns.exception.Timeout):
            continue
        except dns.resolver.NoAnswer:
            continue

        values = [item.to_text() for item in answer]
        if values:
            findings.append(
                Finding(category="dns", source=record_type, value=values)
            )
    return findings


def _web_metadata_findings(target: str) -> list[Finding]:
    url = f"https://{target}/"
    with httpx.Client(
        timeout=httpx.Timeout(8.0, connect=5.0),
        follow_redirects=False,
        headers={"User-Agent": "Aura-Recon-Companion/0.1 authorized-metadata-check"},
    ) as client:
        response = client.head(url)

    headers = {
        key.lower(): value
        for key, value in response.headers.items()
        if key.lower() in _SELECTED_HEADERS
    }
    findings = [
        Finding(category="web", source="status", value=response.status_code),
        Finding(category="web", source="headers", value=headers),
    ]
    if "location" in response.headers:
        findings.append(
            Finding(category="web", source="redirect-location", value=response.headers["location"])
        )
    return findings


def run_scan(request: ScanRequest) -> ScanReport:
    if not request.authorized:
        raise PermissionError("You must confirm that you own or are authorized to assess the target")

    started_at = datetime.now(UTC)
    public_addresses = _validated_public_addresses(request.target)
    findings: list[Finding] = [
        Finding(category="resolution", source="system", value=public_addresses)
    ]
    findings.extend(_dns_findings(request.target))

    limitations = [
        "This baseline collects DNS records and, when selected, one HTTPS metadata request.",
        "It does not exploit services, brute-force paths, test credentials, or prove a vulnerability.",
        "SpiderFoot-scale enrichment requires separately configured providers and API credentials.",
    ]

    if request.profile == ScanProfile.WEB_METADATA:
        try:
            findings.extend(_web_metadata_findings(request.target))
        except httpx.HTTPError as exc:
            findings.append(Finding(category="web", source="error", value=str(exc)))

    completed_at = datetime.now(UTC)
    scan_id = str(uuid.uuid4())
    evidence_payload = {
        "scan_id": scan_id,
        "target": request.target,
        "profile": request.profile.value,
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "findings": [finding.model_dump(mode="json") for finding in findings],
    }
    evidence_sha256 = hashlib.sha256(
        json.dumps(evidence_payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    return ScanReport(
        scan_id=scan_id,
        target=request.target,
        profile=request.profile,
        started_at=started_at,
        completed_at=completed_at,
        findings=findings,
        evidence_sha256=evidence_sha256,
        limitations=limitations,
    )
