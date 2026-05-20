import os
import uuid
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError


TABLE_NAME = os.getenv("SKYGRID_PREFLIGHT_TABLE", "skygrid-preflight-records")

VALID_RISK_LEVELS = {"Info", "Low", "Medium", "High", "Critical"}
VALID_FINAL_STATES = {
    "Not Started",
    "Queued",
    "Running",
    "Passed",
    "Warning",
    "Failed",
    "Skipped",
    "Waiting Human Approval",
    "Approved",
    "Blocked",
}
VALID_EMERGENCY_LANE_STATES = {
    "Intake",
    "Builder Setup",
    "Preflight Required",
    "Dependency Check",
    "Infrastructure Check",
    "Security Check",
    "Client Approval Required",
    "Ready for Drill",
    "Active Monitoring",
    "Blocked",
    "Closed",
}

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_string(data: dict, key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Missing required field: {key}")
    return value.strip()


def require_string_list(data: dict, key: str) -> list[str]:
    value = data.get(key, [])
    if value is None:
        return []
    if not isinstance(value, list):
        raise ValueError(f"{key} must be a list")
    for item in value:
        if not isinstance(item, str) or not item.strip():
            raise ValueError(f"{key} must contain only non-empty strings")
    return [item.strip() for item in value]


def create_preflight_record(preflight_data: dict) -> dict:
    """
    Creates a SkyGrid Preflight Protection Lane record.

    This function only creates the state record.
    It must not execute infrastructure, wallet, financial, contract,
    legal, deployment, or client-facing actions.
    """

    preflight_id = require_string(preflight_data, "preflight_id")
    now = utc_now_iso()

    risk_level = preflight_data.get("risk_level", "Medium")
    if risk_level not in VALID_RISK_LEVELS:
        raise ValueError(f"Invalid risk_level: {risk_level}")

    emergency_lane_status = preflight_data.get("emergency_lane_status", "Intake")
    if emergency_lane_status not in VALID_EMERGENCY_LANE_STATES:
        raise ValueError(f"Invalid emergency_lane_status: {emergency_lane_status}")

    final_state = preflight_data.get("final_readiness_state", "Not Started")
    if final_state not in VALID_FINAL_STATES:
        raise ValueError(f"Invalid final_readiness_state: {final_state}")

    record = {
        "PreflightID": preflight_id,
        "IntentID": preflight_data.get("intent_id", f"intent-{uuid.uuid4()}"),
        "Operator": preflight_data.get("operator", "Michael Vincent Patrick / MVPuknowme"),
        "ClientMatter": preflight_data.get("client_matter"),
        "LinearIssue": preflight_data.get("linear_issue"),
        "GitHubRepo": preflight_data.get("github_repo"),
        "GitHubBranch": preflight_data.get("github_branch"),
        "GitHubCommit": preflight_data.get("github_commit"),
        "GitHubWorkflowURL": preflight_data.get("github_workflow_url"),
        "CopilotChangeSummary": preflight_data.get("copilot_change_summary"),
        "RailwayServiceURL": preflight_data.get("railway_service_url"),
        "RailwayDeployStatus": preflight_data.get("railway_deploy_status"),
        "AzureResourceGroup": preflight_data.get("azure_resource_group"),
        "AzureDeploymentStatus": preflight_data.get("azure_deployment_status"),
        "VercelDeploymentURL": preflight_data.get("vercel_deployment_url"),
        "AirtableRecordURL": preflight_data.get("airtable_record_url"),
        "ClioMatterURL": preflight_data.get("clio_matter_url"),
        "WalletApprovalRequired": bool(preflight_data.get("wallet_approval_required", False)),
        "HumanApprovalRequired": bool(preflight_data.get("human_approval_required", True)),
        "InfrastructureChange": bool(preflight_data.get("infrastructure_change", False)),
        "FinancialAction": bool(preflight_data.get("financial_action", False)),
        "EmergencyLaneStatus": emergency_lane_status,
        "FinalReadinessState": final_state,
        "RiskLevel": risk_level,
        "EvidenceURLs": require_string_list(preflight_data, "evidence_urls"),
        "OperatorNotes": preflight_data.get("operator_notes", ""),
        "CreatedAt": now,
        "UpdatedAt": now,
    }

    try:
        table.put_item(
            Item=record,
            ConditionExpression="attribute_not_exists(PreflightID)",
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code")

        if error_code == "ConditionalCheckFailedException":
            return {
                "ok": False,
                "status": "duplicate",
                "message": f"Preflight record already exists: {preflight_id}",
                "preflight_id": preflight_id,
            }

        raise

    return {
        "ok": True,
        "status": "created",
        "preflight_id": preflight_id,
        "intent_id": record["IntentID"],
        "final_readiness_state": record["FinalReadinessState"],
        "emergency_lane_status": record["EmergencyLaneStatus"],
        "risk_level": record["RiskLevel"],
        "record": record,
    }


def lambda_handler(event, context):
    """
    AWS Lambda entrypoint for Step Functions.

    Expected input can be either a direct preflight payload or a Step Functions
    Lambda invoke wrapper with Payload.
    """

    try:
        payload = event.get("Payload", event) if isinstance(event, dict) else {}

        if "preflight_id" not in payload:
            payload["preflight_id"] = f"skygrid-preflight-{uuid.uuid4()}"

        result = create_preflight_record(payload)

        return {
            "ok": result["ok"],
            "status": result["status"],
            "preflightId": result["preflight_id"],
            "intentId": result.get("intent_id"),
            "finalReadinessState": result.get("final_readiness_state"),
            "emergencyLaneStatus": result.get("emergency_lane_status"),
            "riskLevel": result.get("risk_level"),
            "record": result.get("record"),
        }

    except ValueError as exc:
        return {
            "ok": False,
            "status": "validation_error",
            "message": str(exc),
        }

    except ClientError as exc:
        return {
            "ok": False,
            "status": "aws_client_error",
            "message": exc.response.get("Error", {}).get("Message", str(exc)),
            "code": exc.response.get("Error", {}).get("Code"),
        }

    except Exception as exc:
        return {
            "ok": False,
            "status": "unexpected_error",
            "message": str(exc),
        }
