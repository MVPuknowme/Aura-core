# AURA SUPER INTELLIGENCE — v1 Architecture

**Status:** bounded advisory implementation  
**Applies to:** Aura-Core and SKYGRID  
**Policy version:** `aura-super-intelligence-v1`

## Objective

AURA SUPER INTELLIGENCE is an evidence-controlled reasoning layer. It may discover authorized evidence-plane metadata, select evidence for a bounded task, hash-bind that evidence, reason across multiple sources, pass the result through PNPK policy, and emit an auditable decision receipt.

Greater reasoning capability does **not** grant greater execution authority.

```text
AURA SUPER INTELLIGENCE
│
├── GLOBAL
│   discover authorized evidence planes
│
├── FOCUS
│   select + hash-bind required evidence
│
├── REASON
│   multi-source analysis
│   confidence + severity
│   alternatives + counter-evidence
│
├── PNPK
│   authority check
│   provenance check
│   receipt generation
│
├── DECIDE
│   RECOMMEND
│   ESCALATE
│   AWAIT_APPROVAL
│   FAIL_CLOSED
│
└── EXECUTION
    separate authorized execution layer only
```

## Phase contract

### GLOBAL

GLOBAL receives evidence-plane metadata only. It identifies available scopes and their authorization/provenance state. The public GLOBAL result intentionally excludes evidence payloads.

### FOCUS

FOCUS accepts explicit scope identifiers. Every selected plane is bound to a SHA-256 digest over its identifier, source, evidence class, observation timestamp, and payload.

Missing or unauthorized requested evidence fails closed.

### REASON

REASON produces:

- confidence: `high | medium | low | unknown`;
- severity: `informational | advisory | elevated | critical`;
- alternatives;
- counter-evidence.

Observed, authorized, provenance-valid, non-stale and non-conflicting evidence can produce high confidence. Simulated, declared, or inferred evidence caps the default result at medium. Stale or conflicting evidence yields low confidence. Invalid provenance yields unknown confidence.

### PNPK

PNPK independently verifies:

- exact policy version;
- authority gate;
- provenance of all focused evidence;
- mandatory receipt generation.

A failed PNPK check produces `FAIL_CLOSED`.

### DECIDE

The evaluator emits exactly one advisory decision:

| Decision | Meaning |
| --- | --- |
| `RECOMMEND` | Evidence supports a bounded advisory recommendation. |
| `ESCALATE` | Evidence is usable but stale/conflicting enough to require operator review. |
| `AWAIT_APPROVAL` | Elevated/critical or explicitly approval-bound work needs attributable operator approval. |
| `FAIL_CLOSED` | Evidence, scope, provenance, policy, or authority requirements are not satisfied. |

Operator approval changes the advisory state only. It does not grant execution inside this evaluator.

### EXECUTION

The v1 evaluator always returns:

```json
{
  "allowed": false,
  "boundary": "separate_authorized_execution_layer",
  "grant": null
}
```

Production mutation, wallet signing, token movement, settlement, deployment, failover, access expansion, and other consequential execution remain outside this module and require their own explicit authorization and policy enforcement.

## Receipt

Every completed evaluation emits an `aura-super-intelligence-receipt/v1` receipt containing:

- request and operator identity;
- requested action and target;
- evidence hash bindings;
- confidence and severity;
- alternatives and counter-evidence;
- PNPK gate results;
- final decision and reason;
- deterministic decision hash;
- timestamp.

The receipt is evidence of the evaluation. It is not itself execution authority.

## Implementation

- evaluator: `src/intelligence/aura-super-intelligence.mjs`
- tests: `tests/aura-super-intelligence.test.mjs`
- test command: `pnpm run aura:super-intelligence:test`

This module is intended to compose with the existing synchronous preflight and PNPK layers, not replace them.
