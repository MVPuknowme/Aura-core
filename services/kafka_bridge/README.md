# AWS Kafka Bridge

This folder holds the safe configuration and smoke-test lane for connecting Aura-Core / SKYGRID events to AWS Kafka infrastructure.

## Supported targets

- Amazon MSK provisioned clusters
- Amazon MSK Serverless
- Self-managed Kafka reachable through approved network routes

## Safety boundary

This bridge is configuration-first and verification-first.

It does **not**:

- publish production events by default
- consume private topics by default
- expose broker credentials
- print secrets
- move funds
- trigger wallet, bridge, swap, or exchange actions

## Required GitHub secrets

Choose the AWS credential path already used by the hub:

Preferred OIDC:

```text
AWS_ROLE_ARN
```

Fallback static credentials:

```text
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

Kafka bridge configuration:

```text
KAFKA_BOOTSTRAP_SERVERS
KAFKA_CLIENT_ID
KAFKA_TOPIC_HEALTH
```

Optional:

```text
AWS_REGION
KAFKA_SECURITY_PROTOCOL
KAFKA_SASL_MECHANISM
KAFKA_GROUP_ID
```

## Recommended defaults

```text
AWS_REGION=us-east-1
KAFKA_CLIENT_ID=aura-core-kafka-bridge
KAFKA_TOPIC_HEALTH=aura-core.health
KAFKA_SECURITY_PROTOCOL=SASL_SSL
```

## First proof target

The first proof target is not live event streaming. The first proof target is:

```text
1. AWS identity resolves
2. Kafka config exists
3. Bootstrap server list is parseable
4. Health topic name is safe
5. Optional metadata check succeeds when network allows it
```

## Bridge relationship

```text
Auto Drill -> route decision event -> Kafka bridge -> AWS/MSK topic -> analytics/consumers
```

The Kafka bridge should receive route-health events from Auto Drill, not control wallets or perform chain actions.
