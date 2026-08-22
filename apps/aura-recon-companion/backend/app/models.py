from __future__ import annotations

import ipaddress
import re
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator

_HOST_LABEL = re.compile(r"(?!-)[a-z0-9-]{1,63}(?<!-)\Z")


class ScanProfile(str, Enum):
    DNS_PASSIVE = "dns-passive"
    WEB_METADATA = "web-metadata"


class ScanRequest(BaseModel):
    target: str = Field(min_length=3, max_length=253)
    authorized: bool
    profile: ScanProfile = ScanProfile.DNS_PASSIVE

    @field_validator("target")
    @classmethod
    def normalize_target(cls, value: str) -> str:
        target = value.strip().lower().rstrip(".")
        if "://" in target or "/" in target or "@" in target:
            raise ValueError("Enter a hostname only, without a URL, path, or credentials")

        try:
            ipaddress.ip_address(target)
        except ValueError:
            pass
        else:
            raise ValueError("Enter a DNS hostname; IP address literals are not supported")

        try:
            target = target.encode("idna").decode("ascii")
        except UnicodeError as exc:
            raise ValueError("Enter a valid DNS hostname") from exc

        if len(target) > 253 or not target:
            raise ValueError("Enter a valid DNS hostname")
        if any(_HOST_LABEL.fullmatch(label) is None for label in target.split(".")):
            raise ValueError("Enter a valid DNS hostname")
        return target


class Finding(BaseModel):
    category: str
    source: str
    value: Any


class ScanReport(BaseModel):
    scan_id: str
    target: str
    profile: ScanProfile
    started_at: datetime
    completed_at: datetime
    findings: list[Finding]
    evidence_sha256: str
    limitations: list[str]
