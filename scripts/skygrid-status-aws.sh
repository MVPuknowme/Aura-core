#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
SKYGRID_REGION="${SKYGRID_REGION:-aws-us-east-1-virginia}"
MVP_NODE="${MVP_NODE:-42XA-0312}"

printf '== SkyGrid AWS Status Check ==\n'
printf 'operator=%s\n' "MVP-19830312"
printf 'node=%s\n' "$MVP_NODE"
printf 'skygrid_region=%s\n' "$SKYGRID_REGION"
printf 'aws_region=%s\n' "$REGION"

if ! command -v aws >/dev/null 2>&1; then
  echo "status=error reason=aws_cli_missing"
  echo "Install AWS CLI in Cloud Shell first."
  exit 1
fi

if ! aws sts get-caller-identity >/tmp/skygrid-aws-identity.json 2>/tmp/skygrid-aws-error.log; then
  echo "status=error reason=aws_auth_failed"
  cat /tmp/skygrid-aws-error.log
  exit 1
fi

ACCOUNT_ID=$(jq -r '.Account // "unknown"' /tmp/skygrid-aws-identity.json 2>/dev/null || echo unknown)
ARN=$(jq -r '.Arn // "unknown"' /tmp/skygrid-aws-identity.json 2>/dev/null || echo unknown)

printf 'aws_account=%s\n' "$ACCOUNT_ID"
printf 'aws_arn=%s\n' "$ARN"

if aws ec2 describe-vpcs --region "$REGION" >/tmp/skygrid-vpcs.json 2>/tmp/skygrid-vpcs-error.log; then
  VPC_COUNT=$(jq '.Vpcs | length' /tmp/skygrid-vpcs.json 2>/dev/null || echo 0)
  printf 'vpc_count=%s\n' "$VPC_COUNT"
else
  echo "vpc_check=failed"
  cat /tmp/skygrid-vpcs-error.log
fi

if aws ec2 describe-instances --region "$REGION" >/tmp/skygrid-instances.json 2>/tmp/skygrid-instances-error.log; then
  INSTANCE_COUNT=$(jq '[.Reservations[].Instances[]?] | length' /tmp/skygrid-instances.json 2>/dev/null || echo 0)
  printf 'instance_count=%s\n' "$INSTANCE_COUNT"
else
  echo "instance_check=failed"
  cat /tmp/skygrid-instances-error.log
fi

printf 'status=ok skygrid_region=%s aws_region=%s node=%s\n' "$SKYGRID_REGION" "$REGION" "$MVP_NODE"
