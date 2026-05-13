from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from typing import Any

SAFE_TOPIC_PATTERN = re.compile(r"^[a-zA-Z0-9._-]{1,249}$")


@dataclass(frozen=True)
class KafkaBridgeConfig:
    bootstrap_servers: list[str]
    client_id: str
    topic_health: str
    security_protocol: str
    sasl_mechanism: str | None
    group_id: str | None


def parse_bootstrap_servers(raw: str) -> list[str]:
    return [server.strip() for server in raw.split(",") if server.strip()]


def validate_server(server: str) -> str | None:
    if ":" not in server:
        return f"Kafka bootstrap server must include host:port: {server}"

    host, port = server.rsplit(":", 1)
    if not host:
        return f"Kafka bootstrap server host is empty: {server}"

    if not port.isdigit():
        return f"Kafka bootstrap server port must be numeric: {server}"

    port_int = int(port)
    if port_int < 1 or port_int > 65535:
        return f"Kafka bootstrap server port out of range: {server}"

    return None


def validate_topic(topic: str) -> str | None:
    if not SAFE_TOPIC_PATTERN.fullmatch(topic):
        return "Kafka topic must be 1-249 chars and contain only letters, numbers, dots, underscores, or dashes."
    return None


def load_config() -> tuple[KafkaBridgeConfig | None, list[str]]:
    errors: list[str] = []

    raw_bootstrap = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "").strip()
    client_id = os.getenv("KAFKA_CLIENT_ID", "aura-core-kafka-bridge").strip()
    topic_health = os.getenv("KAFKA_TOPIC_HEALTH", "aura-core.health").strip()
    security_protocol = os.getenv("KAFKA_SECURITY_PROTOCOL", "SASL_SSL").strip()
    sasl_mechanism = os.getenv("KAFKA_SASL_MECHANISM", "").strip() or None
    group_id = os.getenv("KAFKA_GROUP_ID", "").strip() or None

    if not raw_bootstrap:
        errors.append("Missing KAFKA_BOOTSTRAP_SERVERS")

    if not client_id:
        errors.append("Missing KAFKA_CLIENT_ID")

    if not topic_health:
        errors.append("Missing KAFKA_TOPIC_HEALTH")

    bootstrap_servers = parse_bootstrap_servers(raw_bootstrap)
    if raw_bootstrap and not bootstrap_servers:
        errors.append("KAFKA_BOOTSTRAP_SERVERS did not contain any parseable host:port entries")

    for server in bootstrap_servers:
        error = validate_server(server)
        if error:
            errors.append(error)

    topic_error = validate_topic(topic_health)
    if topic_error:
        errors.append(topic_error)

    if not security_protocol:
        errors.append("Missing KAFKA_SECURITY_PROTOCOL")

    config = KafkaBridgeConfig(
        bootstrap_servers=bootstrap_servers,
        client_id=client_id,
        topic_health=topic_health,
        security_protocol=security_protocol,
        sasl_mechanism=sasl_mechanism,
        group_id=group_id,
    )

    return (None if errors else config), errors


def public_config(config: KafkaBridgeConfig) -> dict[str, Any]:
    data = asdict(config)
    data["bootstrap_server_count"] = len(config.bootstrap_servers)
    data["bootstrap_servers"] = ["<redacted-host:port>" for _ in config.bootstrap_servers]
    data["secrets_printed"] = False
    data["mode"] = "config_validation_only"
    return data


def main() -> int:
    config, errors = load_config()
    if errors:
        print(json.dumps({"ok": False, "errors": errors}, indent=2))
        return 1

    assert config is not None
    print(json.dumps({"ok": True, "config": public_config(config)}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
