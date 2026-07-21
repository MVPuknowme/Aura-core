#!/usr/bin/env python3
r"""Local-only audit scaffold for the iPhone/tablet bridge observation.

Purpose
-------
Treat the user's report as the source of a *testable hypothesis* while keeping
the mechanism undecided. The program time-aligns three measurable channels:

1. microphone energy and spectral peaks (features only; raw audio is not saved),
2. Bluetooth Low Energy advertisements, and
3. local TCP/UDP socket state, including listening ports.

It does not transmit data, open a listening port, identify a radio device as a
person, or claim that a signal contains thoughts. Run it on the computer that
executes Python; ordinary iOS does not run this desktop scanner directly.

PowerShell quick start
----------------------
  py -m pip install bleak numpy psutil sounddevice
  py .\bridge_hypothesis_audit.py --label baseline --duration 30
  py .\bridge_hypothesis_audit.py --label bridge_on --duration 30
  $Log = Get-ChildItem .\audit-baseline-*.jsonl | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  py .\bridge_hypothesis_audit.py --verify $Log.FullName

Scientific interpretation
-------------------------
H0: Any intelligible contact-side audio originates from an acoustic or digital
    audio path, ordinary radio-device activity, coincidence, or reporting bias.
H1: A preregistered silent target is identified above chance after acoustic,
    application, network, and cueing paths are excluded.

This logger can reveal ordinary audio/network correlations. It cannot by itself
establish H1; that requires blinded recipient-side recordings and independent
replication.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import math
import os
import platform
import secrets
import sys
import threading
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


SCHEMA_VERSION = "1.0"
DEVICE_PROFILE_DEFAULTS = {
    "json_marker": "ram.os",
    "reported_os": "23",
    "reported_chip": "A16",
    "reported_ram_gb": None,
}
ORIGINATING_OBSERVATION = (
    "During an iPhone-to-tablet cable/hotspot/Bluetooth configuration, contacts "
    "reported hearing speech while the user reports only an inner monologue."
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def json_bytes(value: dict[str, Any]) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")


class HashChainLog:
    """Append-only JSONL log with a simple tamper-evident hash chain."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._previous_hash = "0" * 64
        self._sequence = 0
        self._lock = threading.Lock()

    def append(self, event_type: str, payload: dict[str, Any]) -> None:
        with self._lock:
            body = {
                "schema_version": SCHEMA_VERSION,
                "sequence": self._sequence,
                "utc": utc_now(),
                "monotonic_ns": time.monotonic_ns(),
                "event_type": event_type,
                "payload": payload,
                "previous_hash": self._previous_hash,
            }
            event_hash = hashlib.sha256(json_bytes(body)).hexdigest()
            event = {**body, "event_hash": event_hash}
            with self.path.open("a", encoding="utf-8", newline="\n") as handle:
                handle.write(json.dumps(event, sort_keys=True) + "\n")
                handle.flush()
                os.fsync(handle.fileno())
            self._previous_hash = event_hash
            self._sequence += 1


def verify_log(path: Path) -> bool:
    previous_hash = "0" * 64
    expected_sequence = 0
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            event = json.loads(line)
            supplied_hash = event.pop("event_hash")
            calculated_hash = hashlib.sha256(json_bytes(event)).hexdigest()
            if event.get("sequence") != expected_sequence:
                raise ValueError(f"line {line_number}: unexpected sequence")
            if event.get("previous_hash") != previous_hash:
                raise ValueError(f"line {line_number}: broken previous_hash")
            if supplied_hash != calculated_hash:
                raise ValueError(f"line {line_number}: event hash mismatch")
            previous_hash = supplied_hash
            expected_sequence += 1
    print(f"Verified {expected_sequence} events: {path}")
    return True


def endpoint(value: Any) -> dict[str, Any] | None:
    if not value:
        return None
    if hasattr(value, "ip"):
        return {"ip": value.ip, "port": value.port}
    if isinstance(value, (tuple, list)) and len(value) >= 2:
        return {"ip": str(value[0]), "port": value[1]}
    return {"value": str(value)}


def network_snapshot() -> dict[str, Any]:
    try:
        import psutil  # type: ignore
    except ImportError:
        return {"available": False, "reason": "Install psutil to inspect sockets."}

    rows: list[dict[str, Any]] = []
    denied = 0
    try:
        connections = psutil.net_connections(kind="inet")
    except Exception as exc:  # permissions vary by operating system
        return {"available": False, "reason": f"socket inspection failed: {exc}"}

    for connection in connections:
        process_name = None
        if connection.pid is not None:
            try:
                process_name = psutil.Process(connection.pid).name()
            except (psutil.AccessDenied, psutil.NoSuchProcess):
                denied += 1
        rows.append(
            {
                "family": str(connection.family),
                "type": str(connection.type),
                "local": endpoint(connection.laddr),
                "remote": endpoint(connection.raddr),
                "status": connection.status,
                "pid": connection.pid,
                "process_name": process_name,
            }
        )
    rows.sort(key=lambda row: json.dumps(row, sort_keys=True))
    return {"available": True, "connections": rows, "process_names_denied": denied}


async def poll_network(log: HashChainLog, duration: float, interval: float) -> None:
    stop_at = time.monotonic() + duration
    while time.monotonic() < stop_at:
        log.append("network_snapshot", await asyncio.to_thread(network_snapshot))
        await asyncio.sleep(min(interval, max(0.0, stop_at - time.monotonic())))


async def scan_ble(
    log: HashChainLog,
    duration: float,
    include_identifiers: bool,
    session_salt: bytes,
) -> None:
    try:
        from bleak import BleakScanner  # type: ignore
    except ImportError:
        log.append("ble_status", {"available": False, "reason": "Install bleak to scan BLE."})
        return

    seen = 0

    def pseudonym(address: str) -> str:
        digest = hashlib.sha256(session_salt + address.encode("utf-8")).hexdigest()
        return f"ble-{digest[:12]}"

    def detection_callback(device: Any, advertisement: Any) -> None:
        nonlocal seen
        seen += 1
        address = str(getattr(device, "address", "unknown"))
        advertised_name = getattr(advertisement, "local_name", None) or getattr(device, "name", None)
        payload = {
            "device": address if include_identifiers else pseudonym(address),
            "identifier_mode": "raw" if include_identifiers else "session_pseudonym",
            "advertised_name": advertised_name if include_identifiers else None,
            "advertised_name_present": bool(advertised_name),
            "rssi_dbm": getattr(advertisement, "rssi", None),
            "tx_power_dbm": getattr(advertisement, "tx_power", None),
            "service_uuids": sorted(getattr(advertisement, "service_uuids", []) or []),
            "manufacturer_ids": sorted(
                int(item) for item in (getattr(advertisement, "manufacturer_data", {}) or {}).keys()
            ),
            "service_data_uuids": sorted(
                str(item) for item in (getattr(advertisement, "service_data", {}) or {}).keys()
            ),
            "note": "This record identifies a radio advertisement, not a person.",
        }
        log.append("ble_advertisement", payload)

    try:
        async with BleakScanner(detection_callback=detection_callback):
            log.append("ble_status", {"available": True, "scanning": True})
            await asyncio.sleep(duration)
    except Exception as exc:
        log.append("ble_status", {"available": False, "reason": str(exc)})
    finally:
        log.append("ble_status", {"scanning": False, "advertisements_seen": seen})


@dataclass
class AudioWindow:
    start_seconds: float
    end_seconds: float
    rms: float
    peak_hz: float | None
    peak_magnitude: float | None


def capture_audio_features(
    log: HashChainLog,
    duration: float,
    sample_rate: int,
    min_hz: float,
    max_hz: float,
) -> None:
    try:
        import numpy as np  # type: ignore
        import sounddevice as sd  # type: ignore
    except ImportError:
        log.append(
            "audio_status",
            {"available": False, "reason": "Install numpy and sounddevice for audio features."},
        )
        return

    nyquist_hz = sample_rate / 2.0
    if max_hz >= nyquist_hz:
        log.append(
            "audio_status",
            {
                "available": False,
                "reason": (
                    f"max_hz={max_hz:g} must be below Nyquist frequency "
                    f"{nyquist_hz:g} Hz for sample_rate={sample_rate}."
                ),
            },
        )
        return

    try:
        sd.check_input_settings(channels=1, dtype="float32", samplerate=sample_rate)
        frames = int(math.ceil(duration * sample_rate))
        capture_started_monotonic_ns = time.monotonic_ns()
        log.append(
            "audio_status",
            {
                "available": True,
                "recording_features": True,
                "raw_audio_saved": False,
                "sample_rate_hz": sample_rate,
                "analysis_band_hz": [min_hz, max_hz],
            },
        )
        samples = sd.rec(frames, samplerate=sample_rate, channels=1, dtype="float32")
        sd.wait()
        samples = np.asarray(samples[:, 0], dtype=np.float64)
    except Exception as exc:
        log.append("audio_status", {"available": False, "reason": str(exc)})
        return

    window_size = sample_rate
    for offset in range(0, len(samples), window_size):
        window = samples[offset : offset + window_size]
        if not len(window):
            continue
        rms = float(np.sqrt(np.mean(np.square(window))))
        tapered = window * np.hanning(len(window))
        spectrum = np.abs(np.fft.rfft(tapered))
        frequencies = np.fft.rfftfreq(len(window), d=1.0 / sample_rate)
        mask = (frequencies >= min_hz) & (frequencies <= max_hz)
        if np.any(mask):
            local_index = int(np.argmax(spectrum[mask]))
            eligible_frequencies = frequencies[mask]
            eligible_spectrum = spectrum[mask]
            peak_hz = float(eligible_frequencies[local_index])
            peak_magnitude = float(eligible_spectrum[local_index])
        else:
            peak_hz = None
            peak_magnitude = None
        result = AudioWindow(
            start_seconds=offset / sample_rate,
            end_seconds=(offset + len(window)) / sample_rate,
            rms=rms,
            peak_hz=peak_hz,
            peak_magnitude=peak_magnitude,
        )
        payload = asdict(result)
        payload["window_start_monotonic_ns"] = capture_started_monotonic_ns + int(
            result.start_seconds * 1_000_000_000
        )
        payload["window_end_monotonic_ns"] = capture_started_monotonic_ns + int(
            result.end_seconds * 1_000_000_000
        )
        log.append("audio_feature_window", payload)

    log.append("audio_status", {"recording_features": False, "raw_audio_saved": False})


def safe_filename_label(label: str) -> str:
    cleaned = "".join(character if character.isalnum() or character in "-_" else "-" for character in label)
    return cleaned.strip("-") or "session"


async def run_session(args: argparse.Namespace) -> Path:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output = args.output or (
        Path.home()
        / "AuraBridgeAuditLogs"
        / f"audit-{safe_filename_label(args.label)}-{timestamp}.jsonl"
    )
    output = output.resolve()
    if output.exists():
        raise FileExistsError(f"Refusing to overwrite existing log: {output}")
    output.parent.mkdir(parents=True, exist_ok=True)

    log = HashChainLog(output)
    log.append(
        "session_start",
        {
            "label": args.label,
            "duration_seconds": args.duration,
            "originating_observation": ORIGINATING_OBSERVATION,
            "user_observation": args.observation,
            "interpretation_status": "hypothesis_not_established",
            "observed_device_profile": {
                "json_marker": args.json_marker,
                "reported_os": args.device_os,
                "reported_chip": args.device_chip,
                "reported_ram_gb": args.device_ram_gb,
                "source": "user_reported_not_runtime_verified",
            },
            "host": {
                "platform": platform.platform(),
                "python": sys.version.split()[0],
                "interfaces": list(socket_interfaces()),
            },
            "safety": {
                "opens_listening_port": False,
                "sends_network_data": False,
                "saves_raw_audio": False,
                "device_is_person": False,
            },
        },
    )

    session_salt = secrets.token_bytes(32)
    await asyncio.gather(
        scan_ble(log, args.duration, args.include_identifiers, session_salt),
        poll_network(log, args.duration, args.network_interval),
        asyncio.to_thread(
            capture_audio_features,
            log,
            args.duration,
            args.sample_rate,
            args.min_hz,
            args.max_hz,
        ),
    )
    log.append(
        "session_end",
        {
            "interpretation_reminder": (
                "Correlation can locate an ordinary pathway; it does not establish causation "
                "or thought transmission."
            )
        },
    )
    print(f"Audit complete: {output}")
    return output


def socket_interfaces() -> Iterable[tuple[int, str]]:
    try:
        import socket

        return socket.if_nameindex()
    except (AttributeError, OSError):
        return []


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--label", default="baseline", help="Experimental condition label.")
    result.add_argument("--duration", type=float, default=30.0, help="Capture duration, 5-300 seconds.")
    result.add_argument("--network-interval", type=float, default=5.0, help="Socket snapshot interval.")
    result.add_argument("--sample-rate", type=int, default=48_000, help="Microphone sample rate in Hz.")
    result.add_argument("--min-hz", type=float, default=1.0, help="Lowest analyzed audio frequency.")
    result.add_argument("--max-hz", type=float, default=20_000.0, help="Highest analyzed audio frequency.")
    result.add_argument("--observation", default=None, help="Neutral note recorded in session metadata.")
    result.add_argument(
        "--json-marker",
        default=DEVICE_PROFILE_DEFAULTS["json_marker"],
        help="User-supplied JSON device marker.",
    )
    result.add_argument(
        "--device-os",
        default=DEVICE_PROFILE_DEFAULTS["reported_os"],
        help="Reported device OS label or version.",
    )
    result.add_argument(
        "--device-chip",
        default=DEVICE_PROFILE_DEFAULTS["reported_chip"],
        help="Reported device chip label.",
    )
    result.add_argument(
        "--device-ram-gb",
        type=float,
        default=DEVICE_PROFILE_DEFAULTS["reported_ram_gb"],
        help="Reported device RAM in GB; omitted when unknown.",
    )
    result.add_argument("--include-identifiers", action="store_true", help="Store raw BLE addresses/UUIDs.")
    result.add_argument("--output", type=Path, help="JSONL output path; existing files are never overwritten.")
    result.add_argument("--verify", type=Path, help="Verify an existing audit log, then exit.")
    return result


def validate_args(args: argparse.Namespace) -> None:
    if not 5 <= args.duration <= 300:
        raise ValueError("duration must be between 5 and 300 seconds")
    if args.network_interval <= 0:
        raise ValueError("network interval must be positive")
    if args.sample_rate <= 0:
        raise ValueError("sample rate must be positive")
    if args.min_hz < 0 or args.max_hz <= args.min_hz:
        raise ValueError("frequency band must satisfy 0 <= min_hz < max_hz")
    if args.device_ram_gb is not None and args.device_ram_gb <= 0:
        raise ValueError("device RAM must be positive when supplied")


def main() -> int:
    args = parser().parse_args()
    try:
        if args.verify:
            verify_log(args.verify.resolve())
            return 0
        validate_args(args)
        asyncio.run(run_session(args))
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
