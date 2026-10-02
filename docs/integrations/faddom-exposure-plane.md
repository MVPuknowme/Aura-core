# SKYGRID™ + Faddom Exposure Visibility Plane

**Owner:** Michael Vincent Patrick — MVPuknowme  
**System:** SKYGRID™ / Aura-Core / PNPK  
**Status:** Proposed controlled-pilot integration  
**Third-party platform:** Faddom

> Trademark notice: SKYGRID™ is used here as a claimed project/service mark of Michael Vincent Patrick (MVPuknowme). This document does not claim ownership of Faddom, its software, product names, logos, or other third-party intellectual property. Faddom remains an independent third-party platform and all third-party marks remain with their respective owners.

## Decision

Treat Faddom as the preferred **exposure and dependency visibility plane** for SKYGRID™ where it is technically and commercially appropriate.

Faddom solves the visibility problem that SKYGRID should not duplicate: discovering assets, dependencies, external communications, shadow IT, attack paths, and change impact across hybrid infrastructure.

SKYGRID™ remains the **validation, authorization, continuity, routing, and evidence plane**.

PNPK remains the **fail-closed policy and receipt boundary**.

The integration rule is:

```text
Faddom observes.
SKYGRID™ reasons and routes.
PNPK validates and receipts.
Humans authorize production-impacting actions.
```

## Why this addresses the exposure problem

The operational failure mode is not only that a service can fail. It is that the operator may not know:

- which asset is exposed;
- which external path can reach it;
- which services depend on it;
- what the blast radius of a change or incident is;
- which undocumented or shadow assets exist;
- whether a proposed failover will break a required dependency.

Faddom's current product positioning directly targets those blind spots through agentless dependency discovery, external traffic visibility, shadow-IT discovery, exposure context, anomaly detection, and change-impact mapping.

SKYGRID™ should consume that visibility as evidence rather than attempt to recreate the entire dependency-discovery stack.

## Responsibility boundary

| Layer | Owner | Responsibility | Execution authority |
| --- | --- | --- | --- |
| Discovery / topology | Faddom | Observe assets, dependencies, communications, exposure context and topology changes | None inside SKYGRID |
| Ingest / normalization | SKYGRID™ | Accept approved Faddom-derived evidence and normalize it into SKYGRID event format | No production change |
| Policy / validation | PNPK | Validate provenance, schema, freshness, scope, identity, authorization state and route policy | Fail closed |
| Impact reasoning | Auto-Drill | Compare topology evidence against continuity/failover plans and estimate affected dependencies | Simulation by default |
| Production action | Existing approved infrastructure control plane | Execute separately authorized network, workload, failover or settlement action | Explicit human/operator grant required |
| Evidence | PNPK / SKYGRID™ | Hash-bind inputs, decision, approval and resulting action reference into a receipt | Receipt only |

## Exposure-event contract

A Faddom-derived event should enter SKYGRID™ only through an allowlisted adapter. The adapter should not contain credentials in a `.pnpk` package.

Minimum normalized event:

```json
{
  "schema": "skygrid.exposure.v1",
  "source": {
    "provider": "faddom",
    "mode": "visibility_only"
  },
  "observed_at": "ISO-8601",
  "event_type": "asset_exposure_or_dependency_change",
  "asset": {
    "external_id": "provider-scoped-id",
    "criticality": "unknown"
  },
  "evidence": {
    "dependency_hash": "sha256:...",
    "source_record_hash": "sha256:...",
    "raw_secret_material_included": false
  },
  "authorization": {
    "production_execution_requested": false,
    "operator_approval_required": true
  }
}
```

The actual Faddom ingestion mechanism must use a vendor-supported interface available to the deployment. Do not assume a REST endpoint, webhook, export format, or credential model until the deployed Faddom version and vendor documentation confirm it.

## PNPK gates

Every Faddom-derived event must fail closed unless all required gates pass:

1. **Source gate** — provider identity is allowlisted as `faddom`.
2. **Integrity gate** — source evidence and normalized payload are hash-bound.
3. **Freshness gate** — stale topology is not treated as current topology.
4. **Scope gate** — only approved environments/assets can influence a decision.
5. **Redaction gate** — no secrets, keys, session material, raw credentials or prohibited private evidence enter the `.pnpk` package.
6. **Dependency gate** — proposed action includes known upstream/downstream impact evidence where available.
7. **Human gate** — any production-impacting action requires an explicit activation grant.
8. **Receipt gate** — the final receipt records the input evidence hash, policy decision, operator authorization and external execution reference.

A visibility event may pass validation while a production action remains denied.

## Exposure classifications

Normalize observations into conservative classes:

- `external_surface`
- `unexpected_external_communication`
- `shadow_asset`
- `dependency_change`
- `critical_path_change`
- `certificate_risk`
- `vulnerability_context`
- `anomalous_traffic`
- `segmentation_impact`
- `unknown_exposure`

Faddom risk labels or scores should be preserved as **source assertions**, not silently converted into SKYGRID severity. SKYGRID can derive its own operational priority only after policy and business-criticality evidence are available.

## Controlled-pilot flow

```text
Faddom
  ↓ visibility/dependency evidence
SKYGRID™ Exposure Adapter
  ↓ normalize + hash
PNPK
  ↓ fail-closed validation
Auto-Drill
  ↓ simulate dependency / blast-radius impact
Operator
  ↓ explicit approval if action is required
Approved control plane
  ↓ action reference
PNPK receipt
```

## What we do not allow

This integration must not:

- give Faddom autonomous authority to alter SKYGRID production infrastructure;
- treat discovery output as authorization;
- copy Faddom credentials or protected raw datasets into Git;
- claim Faddom technology, branding or intellectual property as SKYGRID property;
- bypass existing PNPK human-approval gates;
- turn a risk score into an automatic shutdown, network block, failover, payment or settlement;
- represent a simulation or recommendation as an executed action.

## Initial implementation target

Phase 1 is intentionally read-mostly:

1. define the normalized `skygrid.exposure.v1` schema;
2. implement a provider adapter with no production execution authority;
3. create fixtures using dummy Faddom-shaped data only;
4. validate events through PNPK;
5. feed dependency changes into Auto-Drill simulation;
6. produce a hash-bound exposure receipt;
7. add tests proving that production-impacting actions remain fail closed without an activation grant.

After the deployed Faddom interface is verified, Phase 2 may add authenticated ingestion using the least-privilege vendor-supported mechanism.

## Ownership and product position

The SKYGRID™ contribution is the orchestration boundary around visibility:

**topology evidence → policy validation → continuity reasoning → explicit authorization → independently verifiable receipt**

That orchestration, PNPK policy model, receipt semantics, Auto-Drill decision flow, and SKYGRID integration code remain part of the Aura-Core/SKYGRID™ project.

Faddom is deliberately treated as a strong specialized dependency-visibility provider rather than something SKYGRID™ needs to replace.

## References

- Faddom product overview: https://faddom.com/
- Faddom exposure management: https://faddom.com/use-case/exposure-management-with-faddom/
- Faddom discovery and asset management: https://faddom.com/use-case/discovery-and-asset-management-with-faddom/
- Faddom micro-segmentation planning: https://faddom.com/use-case/micro-segmentation-with-faddom/
