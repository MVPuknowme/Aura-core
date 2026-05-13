from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from typing import Any

from app import DEFAULT_SWITCH_THRESHOLD, make_auto_switch_decision, serialize_switch_decision

SAFE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_.:/+=,@-]{1,256}$")


@dataclass(frozen=True)
class AwsComputeBridgeConfig:
    mode: str
    provider: str
    region: str
    objective: str
    threshold: float
    batch_job_queue: str | None
    batch_job_definition: str | None
    ecs_cluster: str | None
    ecs_task_definition: str | None
    ecs_subnets: list[str]
    ecs_security_groups: list[str]
    container_name: str | None
    dry_run: bool


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _safe_name(value: str | None, field: str, errors: list[str]) -> None:
    if value and not SAFE_NAME_PATTERN.fullmatch(value):
        errors.append(f"{field} contains unsupported characters")


def _float_env(name: str, default: float) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def load_config() -> tuple[AwsComputeBridgeConfig, list[str]]:
    errors: list[str] = []

    provider = os.getenv("AUTO_DRILL_AWS_PROVIDER", "batch").strip().lower()
    if provider not in {"batch", "ecs"}:
        errors.append("AUTO_DRILL_AWS_PROVIDER must be batch or ecs")

    objective = os.getenv("AUTO_DRILL_OBJECTIVE", "balanced").strip().lower()
    threshold = max(0.0, min(_float_env("AUTO_DRILL_SWITCH_THRESHOLD", DEFAULT_SWITCH_THRESHOLD), 100.0))
    region = os.getenv("AWS_REGION", "us-east-1").strip() or "us-east-1"
    dry_run = os.getenv("AUTO_DRILL_AWS_DRY_RUN", "true").strip().lower() != "false"

    batch_job_queue = os.getenv("AUTO_DRILL_BATCH_JOB_QUEUE", "").strip() or None
    batch_job_definition = os.getenv("AUTO_DRILL_BATCH_JOB_DEFINITION", "").strip() or None
    ecs_cluster = os.getenv("AUTO_DRILL_ECS_CLUSTER", "").strip() or None
    ecs_task_definition = os.getenv("AUTO_DRILL_ECS_TASK_DEFINITION", "").strip() or None
    ecs_subnets = _split_csv(os.getenv("AUTO_DRILL_ECS_SUBNETS"))
    ecs_security_groups = _split_csv(os.getenv("AUTO_DRILL_ECS_SECURITY_GROUPS"))
    container_name = os.getenv("AUTO_DRILL_CONTAINER_NAME", "auto-drill").strip() or "auto-drill"

    for field, value in {
        "AWS_REGION": region,
        "AUTO_DRILL_BATCH_JOB_QUEUE": batch_job_queue,
        "AUTO_DRILL_BATCH_JOB_DEFINITION": batch_job_definition,
        "AUTO_DRILL_ECS_CLUSTER": ecs_cluster,
        "AUTO_DRILL_ECS_TASK_DEFINITION": ecs_task_definition,
        "AUTO_DRILL_CONTAINER_NAME": container_name,
    }.items():
        _safe_name(value, field, errors)

    if provider == "batch":
        if not batch_job_queue:
            errors.append("AUTO_DRILL_BATCH_JOB_QUEUE is required when provider=batch")
        if not batch_job_definition:
            errors.append("AUTO_DRILL_BATCH_JOB_DEFINITION is required when provider=batch")

    if provider == "ecs":
        if not ecs_cluster:
            errors.append("AUTO_DRILL_ECS_CLUSTER is required when provider=ecs")
        if not ecs_task_definition:
            errors.append("AUTO_DRILL_ECS_TASK_DEFINITION is required when provider=ecs")
        if not ecs_subnets:
            errors.append("AUTO_DRILL_ECS_SUBNETS is required when provider=ecs")
        if not ecs_security_groups:
            errors.append("AUTO_DRILL_ECS_SECURITY_GROUPS is required when provider=ecs")

    config = AwsComputeBridgeConfig(
        mode="recommendation_to_compute",
        provider=provider,
        region=region,
        objective=objective,
        threshold=threshold,
        batch_job_queue=batch_job_queue,
        batch_job_definition=batch_job_definition,
        ecs_cluster=ecs_cluster,
        ecs_task_definition=ecs_task_definition,
        ecs_subnets=ecs_subnets,
        ecs_security_groups=ecs_security_groups,
        container_name=container_name,
        dry_run=dry_run,
    )
    return config, errors


def build_plan(config: AwsComputeBridgeConfig) -> dict[str, Any]:
    decision = make_auto_switch_decision(objective=config.objective, threshold=config.threshold)
    decision_payload = serialize_switch_decision(decision, config.objective)
    active_route = decision_payload.get("activeRoute") or {}

    command = [
        "python",
        "app.py",
        "--auto-drill-route",
        str(active_route.get("network", "unknown")),
        "--objective",
        config.objective,
    ]

    environment = [
        {"name": "AUTO_DRILL_SELECTED_ROUTE", "value": str(active_route.get("network", "unknown"))},
        {"name": "AUTO_DRILL_OBJECTIVE", "value": config.objective},
        {"name": "AUTO_DRILL_ACTION_TYPE", "value": "compute_only"},
        {"name": "AUTO_DRILL_PUBLIC_SAFE", "value": "true"},
    ]

    if config.provider == "batch":
        aws_plan = {
            "service": "aws-batch",
            "submitCommand": "aws batch submit-job",
            "jobName": "skygrid-auto-drill",
            "jobQueue": config.batch_job_queue,
            "jobDefinition": config.batch_job_definition,
            "containerOverrides": {
                "command": command,
                "environment": environment,
            },
        }
    else:
        aws_plan = {
            "service": "aws-ecs",
            "submitCommand": "aws ecs run-task",
            "cluster": config.ecs_cluster,
            "taskDefinition": config.ecs_task_definition,
            "launchType": "FARGATE",
            "networkConfiguration": {
                "awsvpcConfiguration": {
                    "subnets": config.ecs_subnets,
                    "securityGroups": config.ecs_security_groups,
                    "assignPublicIp": "DISABLED",
                }
            },
            "overrides": {
                "containerOverrides": [
                    {
                        "name": config.container_name,
                        "command": command,
                        "environment": environment,
                    }
                ]
            },
        }

    return {
        "ok": True,
        "mode": config.mode,
        "dryRun": config.dry_run,
        "provider": config.provider,
        "region": config.region,
        "decision": decision_payload,
        "awsPlan": aws_plan,
        "safety": {
            "computeOnly": True,
            "walletActions": False,
            "bridgeTransfers": False,
            "swaps": False,
            "staking": False,
            "hiddenMining": False,
            "secretsPrinted": False,
        },
    }


def main() -> int:
    config, errors = load_config()
    if errors:
        print(json.dumps({"ok": False, "errors": errors, "config": asdict(config)}, indent=2))
        return 1

    print(json.dumps(build_plan(config), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
