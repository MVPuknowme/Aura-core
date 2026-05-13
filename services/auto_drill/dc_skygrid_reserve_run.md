# DC SKYGRID Reserve Compute Dry Run

Run intent:

```text
Auto Drill -> DC/SKYGRID reserve compute -> AWS Batch/ECS plan
```

Default mode:

```text
dry_run=true
```

Validation scope:

```text
route-health,token-metadata,exchange-reference
```

Safety boundary:

```text
compute-only
non-custodial
reference validation only
no wallet actions
no bridge transfers
no swaps
no staking
no hidden mining
no exchange execution
```

This marker file intentionally touches `services/auto_drill/**` so the `Auto Drill AWS Compute` push workflow can run from the `MVPuknowme` branch.
