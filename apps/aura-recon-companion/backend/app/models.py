from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator


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
