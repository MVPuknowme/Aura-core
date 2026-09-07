from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

_LINE_RE = re.compile(r"^(?P<timestamp>\S+)\s+(?P<peripheral>\S+)\s+(?P<event>.+)$")
_RSSI_RE = re.compile(r"^peripheral changed RSSI to (?P<rssi>-?\d+)$")
_SERVICE_RE = re.compile(r"^service with ID (?P<id>\S+) discovered$")
_CHARACTERISTIC_RE = re.compile(r"^characteristic with ID (?P<id>\S+) discovered$")


def _new_peripheral(timestamp: str) -> dict[str, Any]:
    return {
        "first_seen": timestamp,
        "last_seen": timestamp,
        "discoveries": 0,
        "interrogations": 0,
        "disconnects": 0,
        "rssi_values": [],
        "services": set(),
        "characteristics": set(),
    }


def parse_bluetooth_log(text: str) -> dict[str, Any]:
    peripherals: dict[str, dict[str, Any]] = {}

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = _LINE_RE.match(line)
        if not match:
            continue

        timestamp = match.group("timestamp")
        peripheral_id = match.group("peripheral")
        event = match.group("event")
        record = peripherals.setdefault(peripheral_id, _new_peripheral(timestamp))
        record["last_seen"] = timestamp

        if event == "peripheral discovered":
            record["discoveries"] += 1
        elif event == "peripheral state changed to interrogating":
            record["interrogations"] += 1
        elif event == "peripheral state changed to disconnected":
            record["disconnects"] += 1
        elif rssi_match := _RSSI_RE.match(event):
            record["rssi_values"].append(int(rssi_match.group("rssi")))
        elif service_match := _SERVICE_RE.match(event):
            record["services"].add(service_match.group("id"))
        elif characteristic_match := _CHARACTERISTIC_RE.match(event):
            record["characteristics"].add(characteristic_match.group("id"))

    rendered: dict[str, dict[str, Any]] = {}
    counts: defaultdict[str, int] = defaultdict(int)

    for peripheral_id, record in peripherals.items():
        if record["services"] or record["characteristics"]:
            classification = "service_enumerated"
        elif record["interrogations"]:
            classification = "interrogated"
        else:
            classification = "observed_only"

        counts[classification] += 1
        rssi_values: list[int] = record.pop("rssi_values")
        services = sorted(record.pop("services"))
        characteristics = sorted(record.pop("characteristics"))

        rendered_record = {
            **record,
            "classification": classification,
            "services": services,
            "characteristics": characteristics,
            "rssi": {
                "samples": len(rssi_values),
                "strongest": max(rssi_values) if rssi_values else None,
                "weakest": min(rssi_values) if rssi_values else None,
                "average": round(sum(rssi_values) / len(rssi_values), 2) if rssi_values else None,
            },
        }
        rendered[peripheral_id] = rendered_record

    return {
        "summary": {
            "peripherals": len(rendered),
            "observed_only": counts["observed_only"],
            "interrogated": counts["interrogated"],
            "service_enumerated": counts["service_enumerated"],
        },
        "peripherals": rendered,
    }
