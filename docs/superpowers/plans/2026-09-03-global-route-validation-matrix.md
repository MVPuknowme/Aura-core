# Global Route Validation Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic, fail-closed worldwide 24-hour route-validation matrix with a 98% payment-execution eligibility threshold, robust exception-loss calculation, 24-hour inflation/FX normalization, and a contingent 3% SKYGRID support-fee calculation.

**Architecture:** Add a pure policy/evaluator module with no side effects, then expose a read-only API wrapper that returns normalized route rows and summary counts. Keep payment execution as an eligibility signal only: no processor call, signing, broadcast, transfer, private-data movement, device activation, or production failover is introduced.

**Tech Stack:** Node.js 24.x, ES modules, built-in `node:test`, Vercel-style API handlers.

**Spec:** `docs/superpowers/specs/2026-09-03-global-route-validation-matrix.md`

## Global Constraints

- Product name remains `SKYGRID Emergency Data On-Ramp`.
- Rolling validation window is exactly 24 hours.
- Payment execution eligibility threshold is exactly `0.98`.
- Proposed support fee rate is exactly `0.03`.
- Provider transactions remain authoritative and are not rewritten.
- Matrix output is analytical/control data, not realized income by itself.
- No live payment processor call, wallet signing, transaction broadcast, funds movement, device activation, private-data movement, or production failover.
- Preserve fail-closed behavior for missing, stale, contradictory, unsupported, or malformed evidence.

---

### Task 1: Pure route-matrix evaluator

**Files:**
- Create: `config/skygrid-global-route-matrix.mjs`
- Create: `tests/skygrid-global-route-matrix.test.mjs`

**Interfaces:**
- Produces: `evaluateGlobalRouteObservation(observation, options?) -> normalizedRow`
- Produces: `summarizeGlobalRouteMatrix(rows) -> summary`
- Produces constants: `GLOBAL_ROUTE_CONFIDENCE_THRESHOLD`, `GLOBAL_ROUTE_FEE_RATE`, `GLOBAL_ROUTE_WINDOW_MS`

- [ ] **Step 1: Write failing tests**

Tests must assert:
1. confidence `0.98` with all required checks passes and sets `payment_execution_eligible: true`.
2. confidence `0.979999` is `deferred` and never execution-eligible.
3. destination mismatch is `blocked`.
4. evidence older than 24 hours is `deferred`.
5. exception loss uses `median + 1.5 * IQR` from comparable verified losses.
6. proposed fee equals `0.03 * adjusted_eligible_value`.
7. unsettled verified rows expose `proposed_support_fee` but `realized_income: false`.
8. settled rows may set `receivable_evidence_complete: true` but still do not fabricate provider income.
9. non-finite numeric values fail closed.

Representative test shape:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateGlobalRouteObservation,
  GLOBAL_ROUTE_CONFIDENCE_THRESHOLD
} from "../config/skygrid-global-route-matrix.mjs";

test("98 percent verified route is execution eligible", () => {
  const now = Date.parse("2026-09-04T12:00:00Z");
  const row = evaluateGlobalRouteObservation({
    origin_jurisdiction: "Taiwan",
    destination_jurisdiction: "New York, US",
    provider: "test-provider",
    asset: "USD",
    network: "bank-test",
    settlement_destination: "verified-destination",
    destination_verified: true,
    auth_scope_ok: true,
    route_health: "passing",
    deposit_available: true,
    withdrawal_available: true,
    quote_value: 100000,
    verified_settlement_value: 100000,
    fee_spread_bps: 10,
    inflation_fx_margin_24h: 0.001,
    verification_confidence: GLOBAL_ROUTE_CONFIDENCE_THRESHOLD,
    evidence_timestamp: "2026-09-04T11:30:00Z",
    comparable_verified_losses: [1, 1, 2, 2, 3],
    verified_loss: 4,
    settlement_status: "verified"
  }, { now });

  assert.equal(row.payment_execution_eligible, true);
  assert.equal(row.state, "verified");
  assert.equal(row.realized_income, false);
});
```

- [ ] **Step 2: Run test to verify RED**

Run:

```powershell
node --test tests/skygrid-global-route-matrix.test.mjs
```

Expected: FAIL because the evaluator module does not yet exist.

- [ ] **Step 3: Implement minimal evaluator**

Implement focused helpers inside `config/skygrid-global-route-matrix.mjs`:
- finite-number validation
- route-id normalization/hash-free deterministic tuple string
- median and quartile/IQR calculation
- 24-hour staleness check
- hard-failure vs temporary-deferral classification
- exception-loss calculation
- inflation/FX adjustment
- 3% proposed fee calculation
- exact 0.98 eligibility gate

The evaluator must never execute a payment and must return explicit fields:

```js
{
  state,
  payment_execution_eligible,
  execution_performed: false,
  funds_moved: false,
  wallet_signing: false,
  transaction_broadcast: false,
  realized_income: false,
  proposed_support_fee,
  adjusted_eligible_value,
  exception_loss,
  failure_reasons
}
```

- [ ] **Step 4: Run tests to verify GREEN**

```powershell
node --test tests/skygrid-global-route-matrix.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add config/skygrid-global-route-matrix.mjs tests/skygrid-global-route-matrix.test.mjs
git commit -m "feat: add global route validation matrix evaluator"
```

### Task 2: Read-only matrix API

**Files:**
- Create: `api/skygrid/global-route-matrix.js`
- Create: `tests/skygrid-global-route-matrix-api.test.mjs`

**Interfaces:**
- Consumes: `evaluateGlobalRouteObservation`, `summarizeGlobalRouteMatrix`
- Produces: Vercel handler accepting `POST` with `{ observations: [...] }`

- [ ] **Step 1: Write failing API tests**

Assert:
- POST returns normalized rows and summary.
- GET returns method guidance only and no execution.
- malformed bodies return 400 fail-closed.
- more than a bounded batch (100 observations) returns 413/400 without partial evaluation.
- response always includes `executionPerformed:false`, `fundsMoved:false`, `walletSigning:false`, `transactionBroadcast:false`.

- [ ] **Step 2: Run API tests to verify RED**

```powershell
node --test tests/skygrid-global-route-matrix-api.test.mjs
```

Expected: FAIL because handler does not exist.

- [ ] **Step 3: Implement minimal API handler**

The handler must:
- accept POST only for evaluation payloads;
- cap observations at 100;
- never call external providers;
- return deterministic evaluation rows;
- expose summary counts by state and execution eligibility;
- return explicit no-side-effect flags.

- [ ] **Step 4: Run API tests to verify GREEN**

```powershell
node --test tests/skygrid-global-route-matrix-api.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add api/skygrid/global-route-matrix.js tests/skygrid-global-route-matrix-api.test.mjs
git commit -m "feat: expose read-only global route matrix API"
```

### Task 3: Package script and regression verification

**Files:**
- Modify: `package.json`

**Interfaces:**
- Produces script: `route:matrix:test`

- [ ] **Step 1: Add script**

Add:

```json
"route:matrix:test": "node --test tests/skygrid-global-route-matrix.test.mjs tests/skygrid-global-route-matrix-api.test.mjs"
```

- [ ] **Step 2: Run focused verification**

```powershell
pnpm run route:matrix:test
```

Expected: all matrix tests pass.

- [ ] **Step 3: Run syntax checks**

```powershell
node --check config/skygrid-global-route-matrix.mjs
node --check api/skygrid/global-route-matrix.js
```

Expected: both exit 0.

- [ ] **Step 4: Run relevant existing security/policy tests**

```powershell
pnpm run operator:test
pnpm run pnpk:validate
```

Expected: pass. If canonical PNPK validation fails because the default-branch runtime-policy booleans are inconsistent with repository guardrails, do not weaken the validator; report the pre-existing contradiction separately.

- [ ] **Step 5: Commit**

```powershell
git add package.json
git commit -m "test: add route matrix verification script"
```

### Task 4: Review and PR

**Files:**
- No production file changes expected beyond Tasks 1-3.

- [ ] **Step 1: Compare branch against base**

Verify only the spec, plan, evaluator, API, tests, and package script changed.

- [ ] **Step 2: Confirm security invariants**

Search the diff for provider SDK execution calls, wallet signing, raw transaction broadcast, private-key handling, and direct balance mutation. Expected: none.

- [ ] **Step 3: Open a draft PR**

Title:

`Add worldwide 24-hour route validation matrix with 98% eligibility gate`

PR body must explicitly state:
- 98% is an execution-eligibility threshold, not proof that funds were moved;
- 3% fee is proposed/contingent until settlement evidence exists;
- no live processor call or wallet broadcast was added;
- Taiwan → New York is represented as a corridor example within worldwide scope.

## Self-review

- Spec coverage: all approved requirements are mapped to Tasks 1-4.
- Placeholder scan: no TBD/TODO/fill-later instructions remain.
- Type consistency: evaluator/API field names are consistent across tasks.
- Safety boundary: the plan allows an eligibility signal at >=98% but does not add autonomous financial execution.
