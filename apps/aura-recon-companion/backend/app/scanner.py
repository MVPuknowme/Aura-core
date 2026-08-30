from __future__ import annotations

import hashlib
import http.client
import ipaddress
import json
import socket
import ssl
import time
import uuid
from datetime import UTC, datetime

import dns.exception
import dns.resolver

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
_MAX_ADDRESSES = 16
_MAX_RECORD_VALUES = 20
_MAX_VALUE_CHARS = 2_048
_DNS_BUDGET_SECONDS = 6.0
_WEB_BUDGET_SECONDS = 8.0


def _bounded(value: str, limit: int = _MAX_VALUE_CHARS) -> str:
    return value if len(value) <= limit else f"{value[:limit]}…"


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
            raise ValueError(
                "Private, loopback, link-local, reserved, and non-global targets are blocked"
            )
    return addresses[:_MAX_ADDRESSES]


def _dns_findings(target: str) -> list[Finding]:
    findings: list[Finding] = []
    resolver = dns.resolver.Resolver(configure=True)
    deadline = time.monotonic() + _DNS_BUDGET_SECONDS

    for record_type in _RECORD_TYPES:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        resolver.lifetime = min(2.0, remaining)
        try:
            answer = resolver.resolve(target, record_type, raise_on_no_answer=False)
        except (dns.resolver.NXDOMAIN, dns.resolver.NoNameservers, dns.exception.Timeout):
            continue
        except dns.resolver.NoAnswer:
            continue

        values = [
            _bounded(item.to_text())
            for item in list(answer)[:_MAX_RECORD_VALUES]
        ]
        if values:
            findings.append(Finding(category="dns", source=record_type, value=values))
    return findings


def _pinned_https_head(
    target: str,
    public_addresses: list[str],
) -> tuple[int, dict[str, str], str | None]:
    """Send one HEAD request without re-resolving the validated hostname."""
    context = ssl.create_default_context()
    deadline = time.monotonic() + _WEB_BUDGET_SECONDS
    last_error: Exception | None = None

    for raw_address in public_addresses[:_MAX_ADDRESSES]:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break

        address = ipaddress.ip_address(raw_address)
        family = socket.AF_INET6 if address.version == 6 else socket.AF_INET
        endpoint: tuple[object, ...]
        endpoint = (raw_address, 443, 0, 0) if address.version == 6 else (raw_address, 443)
        raw_socket = socket.socket(family, socket.SOCK_STREAM)
        try:
            raw_socket.settimeout(remaining)
            raw_socket.connect(endpoint)
            tls_socket = context.wrap_socket(raw_socket, server_hostname=target)
            raw_socket = None
            with tls_socket:
                tls_socket.settimeout(max(0.1, deadline - time.monotonic()))
                request = (
                    "HEAD / HTTP/1.1\r\n"
                    f"Host: {target}\r\n"
                    "User-Agent: Aura-Recon-Companion/0.1 authorized-metadata-check\r\n"
                    "Accept: */*\r\n"
                    "Connection: close\r\n\r\n"
                ).encode("ascii")
                tls_socket.sendall(request)
                response = http.client.HTTPResponse(tls_socket)
                try:
                    response.begin()
                    selected: dict[str, str] = {}
                    location: str | None = None
                    for key, value in response.getheaders():
                        normalized = key.lower()
                        if normalized in _SELECTED_HEADERS:
                            selected[normalized] = _bounded(value)
                        elif normalized == "location":
                            location = _bounded(value)
                    return response.status, selected, location
                finally:
                    response.close()
        except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
            last_error = exc
        finally:
            if raw_socket is not None:
                raw_socket.close()

    message = str(last_error) if last_error else "request deadline exceeded"
    raise OSError(f"HTTPS metadata request failed: {message}")


def _web_metadata_findings(
    target: str,
    public_addresses: list[str],
) -> list[Finding]:
    status, headers, location = _pinned_https_head(target, public_addresses)
    findings = [
        Finding(category="web", source="status", value=status),
        Finding(category="web", source="headers", value=headers),
    ]
    if location is not None:
        findings.append(Finding(category="web", source="redirect-location", value=location))
    return findings


def run_scan(request: ScanRequest) -> ScanReport:
    if not request.authorized:
        raise PermissionError(
            "You must confirm that you own or are authorized to assess the target"
        )

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
            findings.extend(_web_metadata_findings(request.target, public_addresses))
        except (OSError, ssl.SSLError, http.client.HTTPException) as exc:
            findings.append(Finding(category="web", source="error", value=_bounded(str(exc))))

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
