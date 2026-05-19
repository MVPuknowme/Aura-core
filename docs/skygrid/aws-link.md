# SKYGRID AWS Link

## Purpose

Link SKYGRID to AWS as a resilient cloud backbone for runtime logging, consent-based safety sessions, check-in timers, proof packets, and controlled notification workflows.

SKYGRID remains the product and safety/network layer. AWS provides managed infrastructure.

## Runtime status route

```text
/api/skygrid/aws
```

This route reports AWS readiness without exposing credentials or secret values.

## Recommended AWS services

| Need | AWS service | Notes |
| --- | --- | --- |
| Runtime logs and alarms | CloudWatch | Store operational events and alarm on failures. |
| Lightweight workflows | Lambda | Use for safety webhooks and routing tasks. |
| Safety session state | DynamoDB | Store session state, consent flags, trusted-contact status, and check-in state. |
| Proof packets and docs | S3 | Use signed URLs for private proof packets; public docs only when intended. |
| Timers and escalation workflows | EventBridge Scheduler | Schedule check-in prompts and missed-check-in escalation. |
| Opted-in notifications | SNS or Pinpoint | Use only with clear user consent and anti-abuse limits. |
| Operator identity | Cognito or IAM Identity Center | Do not rely on shared passwords. |

## Environment variables

Set these in Vercel or the runtime host, not in source code:

```text
AWS_REGION=us-west-2
AWS_ROLE_ARN=<preferred-oidc-role-arn>
AWS_ACCESS_KEY_ID=<only-if-role-auth-is-not-available>
AWS_SECRET_ACCESS_KEY=<only-if-role-auth-is-not-available>
```

## Security rules

- Do not commit AWS keys.
- Prefer OIDC or IAM roles over long-lived access keys.
- Use least-privilege policies.
- Do not expose private user data through public endpoints.
- Do not log raw private speech, exact location, seed phrases, private keys, MAC addresses, IMEI values, or secret credentials.
- Keep emergency and notification workflows consent-based.

## First build track

1. Verify `/api/skygrid/aws` returns `aws-link-pending-env` before credentials are configured.
2. Add `AWS_REGION` in the Vercel environment.
3. Create CloudWatch log group for SKYGRID runtime events.
4. Create DynamoDB table for safety sessions.
5. Add EventBridge Scheduler for timed check-ins.
6. Add SNS or Pinpoint only after consent and abuse-prevention rules are implemented.

## Status

Initial AWS link endpoint created. Awaiting runtime environment configuration.
