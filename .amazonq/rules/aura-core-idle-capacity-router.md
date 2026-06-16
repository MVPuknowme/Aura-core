# Aura-Core Rule: SKYGRID Idle Capacity Revenue Selection

## System Identity

Aura-Core supports the SKYGRID Emergency Data On-Ramp. SKYGRID is not a generic mining system. SKYGRID is emergency continuity infrastructure first, with optional idle-capacity revenue only when safety, readiness, power economics, and leasee consent allow it.

## Primary Rule

Emergency failover capacity always has priority over mining, token work, gas routing, storage jobs, bandwidth jobs, or any other revenue workload.

Never route a node into idle revenue mode if doing so reduces emergency readiness, increases outage risk, overheats equipment, drains battery reserve, violates leasee settings, or produces negative net earnings after power and wear costs.

## Selection Order

Aura-Core must evaluate node activity in this order:

1. Emergency demand
2. Node health
3. Leasee opt-in status
4. Power source and power cost
5. Battery reserve
6. Thermal status
7. Network reliability
8. Profitability score
9. Approved workload type
10. Payout accounting and audit proof

## Node Modes

Aura-Core must classify each node into one active mode:

- `EMERGENCY_FAILOVER`
  - Highest priority.
  - No mining or idle workload.
  - Used when failover, outage, responder, continuity, or critical routing demand exists.

- `STANDBY_READY`
  - Node remains available.
  - Runs health checks, heartbeat, sync, and proof logging.
  - No aggressive compute workload.

- `IDLE_EARN`
  - Allowed only when emergency readiness is green.
  - Can run approved storage, bandwidth, gas, proof, or token-related workloads.
  - Must remain interruptible.

- `MAINTENANCE`
  - Used for updates, repair, cooling, security checks, or degraded performance.

- `LOCKDOWN`
  - Used when security, health, payout, compliance, or trust checks fail.
  - No earning activity.

## Power Classes

Aura-Core must classify power status:

- `GREEN_POWER`
  - Solar, battery-backed, renewable, or verified surplus power.
  - Highest priority for idle earning.

- `YELLOW_POWER`
  - Standard grid power but still profitable.
  - Allowed during favorable rate windows only.

- `RED_POWER`
  - Power cost too high, battery too low, node too hot, or grid stress detected.
  - Disable idle earning.
  - Keep node in standby or failover mode only.

## Profitability Formula

Aura-Core must calculate net value before selecting idle work:

```txt
net_earnings =
  gross_revenue
  - electricity_cost
  - hardware_wear_allowance
  - network_cost
  - reserve_risk_buffer
  - platform_fee
```

If `net_earnings <= 0`, Aura-Core must not run an idle revenue workload.

## Solar Incentive Rule

Solar-backed and battery-backed nodes should receive priority routing and enhanced leasee earnings when they preserve emergency readiness.

Recommended incentives:

- Standard node: base leasee share
- Solar-backed node: higher idle workload priority
- Battery-backed node: emergency availability bonus
- Verified uptime node: reliability bonus
- Emergency-active node: failover service bonus

## Workload Preference

Aura-Core should prefer idle workloads in this order:

1. Emergency-adjacent storage and continuity snapshots
2. Encrypted preservation / proof archive jobs
3. Bandwidth and network availability jobs
4. Low-cost Base / L2 gas or proof activity
5. Token workloads only if explicitly approved and profitable
6. Avoid aggressive proof-of-work mining unless specifically enabled, power-positive, and interruptible

## Required Decision Tree

Aura-Core must use this decision tree:

```txt
Is emergency or failover traffic active?
  YES:
    mode = EMERGENCY_FAILOVER
    disable idle earning

  NO:
    Is node healthy, secure, cool, and opted in?
      NO:
        mode = STANDBY_READY or MAINTENANCE

      YES:
        Is power source solar/battery/surplus?
          YES:
            evaluate approved idle workloads

          NO:
            Is grid power cost below projected revenue?
              NO:
                mode = STANDBY_READY
                disable idle earning

              YES:
                evaluate approved idle workloads
```

## Payout Rule

Aura-Core must never pay leasees from estimates alone.

Every payout must come from a verified revenue event:

- `failover_protection_generated`
- `gas_or_routing_revenue_generated`
- `storage_revenue_generated`
- `bandwidth_revenue_generated`
- `proof_archive_revenue_generated`

Each revenue event must include:

- event ID
- leasee ID
- node ID
- gross amount
- SKYGRID fee
- leasee share
- power class
- workload type
- proof hash
- timestamp
- payout status

## Thank-You Receipt Rule

When a leasee earns revenue, Aura-Core should generate a thank-you receipt:

> Thank you for supporting SKYGRID Emergency Data On-Ramp. Your node helped provide failover protection, continuity capacity, or approved idle infrastructure support. Your verified leasee share has been sent.

Include:

- amount
- node
- workload
- event ID
- proof ID
- payout status

## Hard Prohibitions

Aura-Core must not:

- sacrifice emergency failover readiness for mining
- run token workloads when power cost exceeds yield
- drain battery below emergency reserve
- run idle earning on unhealthy or overheated nodes
- pay leasees from unverified estimates
- treat SKYGRID as a generic crypto miner
- rename SKYGRID as serverless or mining infrastructure

## Backend Function Target

Implement the production selector as:

```txt
selectIdleCapacityWorkload()
```

This function should return node mode, power class, selected workload, net earnings, and reason. It must be deterministic, auditable, and safe-by-default.
