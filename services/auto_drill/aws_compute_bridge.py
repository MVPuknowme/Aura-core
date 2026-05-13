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
    local_validator_count: int
    min_local_validators: int
    reserve_enabled: bool
    reserve_label: str
    validation_scope: str


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


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "y", "on"}


def local_capacity_is_sufficient(config: AwsComputeBridgeConfig) -> bool:
    return config.local_validator_count >= config.min_local_validators


def reserve_compute_should_activate(config: AwsComputeBridgeConfig) -> bool:
    return config.reserve_enabled and not local_capacity_is_sufficient(config)


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

    local_validator_count = max(0, _int_env("AUTO_DRILL_LOCAL_VALIDATOR_COUNT", 0))
    min_local_validators = max(0, _int_env("AUTO_DRILL_MIN_LOCAL_VALIDATORS", 3))
    reserve_enabled = _bool_env("AUTO_DRILL_DC_RESERVE_ENABLED", True)
    reserve_label = os.getenv("AUTO_DRILL_DC_RESERVE_LABEL", "dc-skygrid-reserve").strip() or "dc-skygrid-reserve"
    validation_scope = os.getenv("AUTO_DRILL_VALIDATION_SCOPE", "route-health,token-metadata,exchange-reference").strip()

    for field, value in {
        "AWS_REGION": region,
        "AUTO_DRILL_BATCH_JOB_QUEUE": batch_job_queue,
        "AUTO_DRILL_BATCH_JOB_DEFINITION": batch_job_definition,
        "AUTO_DRILL_ECS_CLUSTER": ecs_cluster,
        "AUTO_DRILL_ECS_TASK_DEFINITION": ecs_task_definition,
        "AUTO_DRILL_CONTAINER_NAME": container_name,
        "AUTO_DRILL_DC_RESERVE_LABEL": reserve_label,
        "AUTO_DRILL_VALIDATION_SCOPE": validation_scope,
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
        local_validator_count=local_validator_count,
        min_local_validators=min_local_validators,
        reserve_enabled=reserve_enabled,
        reserve_label=reserve_label,
        validation_scope=validation_scope,
    )
    return config, errors


def build_plan(config: AwsComputeBridgeConfig) -> dict[str, Any]:
    decision = make_auto_switch_decision(objective=config.objective, threshold=config.threshold)
    decision_payload = serialize_switch_decision(decision, config.objective)
    active_route = decision_payload.get("activeRoute") or {}
    reserve_active = reserve_compute_should_activate(config)
    capacity_mode = "dc_reserve" if reserve_active else "local_first"

    command = [
        "python",
        "app.py",
        "--auto-drill-route",
        str(active_route.get("network", "unknown")),
        "--objective",
        config.objective,
        "--capacity-mode",
        capacity_mode,
        "--validation-scope",
        config.validation_scope,
    ]

    environment = [
        {"name": "AUTO_DRILL_SELECTED_ROUTE", "value": str(active_route.get("network", "unknown"))},
        {"name": "AUTO_DRILL_OBJECTIVE", "value": config.objective},
        {"name": "AUTO_DRILL_ACTION_TYPE", "value": "compute_only"},
        {"name": "AUTO_DRILL_PUBLIC_SAFE", "value": "true"},
        {"name": "AUTO_DRILL_CAPACITY_MODE", "value": capacity_mode},
        {"name": "AUTO_DRILL_DC_RESERVE_LABEL", "value": config.reserve_label},
        {"name": "AUTO_DRILL_VALIDATION_SCOPE", "value": config.validation_scope},
    ]

    if config.provider == "batch":
        aws_plan = {
            "service": "aws-batch",
            "submitCommand": "aws batch submit-job",
            "jobName": "skygrid-auto-drill-reserve" if reserve_active else "skygrid-auto-drill",
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
        "capacityMode": capacity_mode,
        "reserveActive": reserve_active,
        "reserveLabel": config.reserve_label,
        "localValidatorCount": config.local_validator_count,
        "minLocalValidators": config.min_local_validators,
        "validationScope": config.validation_scope,
        "dryRun": config.dry_run,
        "provider": config.provider,
        "region": config.region,
        "decision": decision_payload,
        "awsPlan": aws_plan,
        "safety": {
            "computeOnly": True,
            "nonCustodial": True,
            "referenceValidationOnly": True,
            "walletActions": False,
            "bridgeTransfers": False,
            "swaps": False,
            "staking": False,
            "hiddenMining": False,
            "exchangeExecution": False,
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
