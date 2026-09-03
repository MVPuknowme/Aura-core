# HRJ=2 Philanthropic Designation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `hrj=2` as designation-only metadata that earmarks 100% of positive evidence-backed net realized income for philanthropic debt relief without adding payment, wallet, custody, beneficiary-selection, or transaction authority.

**Architecture:** Extend the existing evidence-first SKYGRID revenue ledger with a pure derived designation block computed from `net_realized_income_usd`. Keep the revenue API stateless and side-effect free; it will expose the derived block because it already returns the ledger. No payout adapter, wallet integration, beneficiary registry, or autonomous money movement is added.

**Tech Stack:** Node.js 24.x, ECMAScript modules, `node:test`, existing SKYGRID revenue ledger and GitHub Actions CI.

**Spec:** `docs/superpowers/specs/2026-09-03-hrj2-philanthropic-designation-design.md`

## Global Constraints

- `hrj=2` means philanthropic designation only, not an automatic obligation.
- Allocation is exactly 100% of positive `net_realized_income_usd` after verified realized costs.
- `eligible_net_usd = max(net_realized_income_usd, 0)`.
- Projected, contracted, accrued, unrealized, unverified, validator-estimate, run-rate, and unsupported valuation amounts never enter the designation.
- Existing settlement-evidence requirements remain unchanged.
- `payment_authority`, `wallet_signing`, `transaction_broadcast`, `automatic_disbursement`, and `beneficiary_selection_authority` remain false.
- No new dependencies.
- No wallet, payout, custody, private-data, or production-failover code.

---

### Task 1: Define the HRJ2 designation contract with failing tests

**Files:**
- Modify: `tests/skygrid-revenue-ledger.test.mjs`

**Interfaces:**
- Consumes: `summarizeRevenueLedger(records)` from `lib/skygrid-revenue-ledger.mjs`.
- Produces: test contract requiring `report.philanthropic_designation` with stable designation-only fields.

- [ ] **Step 1: Add positive-net and authority-boundary failing tests**

Append tests equivalent to:

```js
test("earmarks 100 percent of positive evidence-backed net realized income for hrj=2", () => {
  const report = summarizeRevenueLedger([
    {
      id: "service-payment-hrj2",
      direction: "income",
      category: "infrastructure",
      recognition: "realized",
      amount_usd: 200,
      evidence: [{ type: "service_payment", reference: "payment:hrj2:1" }]
    },
    {
      id: "hosting-cost-hrj2",
      direction: "cost",
      category: "hosting",
      recognition: "realized",
      amount_usd: 50,
      evidence: [{ type: "cloud_billing", reference: "invoice:hrj2:1" }]
    }
  ]);

  assert.deepEqual(report.philanthropic_designation, {
    designation: "hrj=2",
    purpose: "philanthropic_debt_relief",
    basis: "net_realized_income",
    allocation_percent: 100,
    eligible_net_usd: 150,
    earmarked_usd: 150,
    designation_only: true,
    payment_authority: false,
    wallet_signing: false,
    transaction_broadcast: false,
    automatic_disbursement: false,
    beneficiary_selection_authority: false
  });
});

test("hrj=2 never designates negative net income and does not use non-realized values", () => {
  const report = summarizeRevenueLedger([
    {
      id: "realized-income-small",
      direction: "income",
      category: "protocol",
      recognition: "realized",
      amount_usd: 20,
      evidence: [{ type: "service_payment", reference: "payment:hrj2:2" }]
    },
    {
      id: "realized-cost-large",
      direction: "cost",
      category: "network_fee",
      recognition: "realized",
      amount_usd: 30,
      evidence: [{ type: "vendor_invoice", reference: "fee:hrj2:2" }]
    },
    {
      id: "projection-does-not-count",
      direction: "income",
      category: "infrastructure",
      recognition: "projected",
      amount_usd: 100000
    }
  ]);

  assert.equal(report.summary.net_realized_income_usd, -10);
  assert.equal(report.philanthropic_designation.eligible_net_usd, 0);
  assert.equal(report.philanthropic_designation.earmarked_usd, 0);
  assert.equal(report.philanthropic_designation.designation_only, true);
  assert.equal(report.philanthropic_designation.payment_authority, false);
});
```

- [ ] **Step 2: Run the ledger tests and verify RED**

Run:

```powershell
pnpm run revenue:ledger:test
```

Expected: the new tests fail because `philanthropic_designation` does not yet exist.

- [ ] **Step 3: Commit the failing tests**

```powershell
git add tests/skygrid-revenue-ledger.test.mjs
git commit -m "test: define HRJ2 philanthropic designation contract"
```

---

### Task 2: Implement the pure HRJ2 designation derivation

**Files:**
- Modify: `lib/skygrid-revenue-ledger.mjs`
- Test: `tests/skygrid-revenue-ledger.test.mjs`

**Interfaces:**
- Consumes: computed `totals.net_realized_income_usd`.
- Produces: `buildPhilanthropicDesignation(netRealizedIncomeUsd)` and `report.philanthropic_designation`.

- [ ] **Step 1: Add a pure designation builder**

Add near the existing money helpers:

```js
function buildPhilanthropicDesignation(netRealizedIncomeUsd) {
  const parsed = Number(netRealizedIncomeUsd);
  const eligibleNetUsd = Number.isFinite(parsed)
    ? roundMoney(Math.max(parsed, 0))
    : 0;

  return {
    designation: "hrj=2",
    purpose: "philanthropic_debt_relief",
    basis: "net_realized_income",
    allocation_percent: 100,
    eligible_net_usd: eligibleNetUsd,
    earmarked_usd: eligibleNetUsd,
    designation_only: true,
    payment_authority: false,
    wallet_signing: false,
    transaction_broadcast: false,
    automatic_disbursement: false,
    beneficiary_selection_authority: false
  };
}
```

- [ ] **Step 2: Attach the designation to the ledger report**

In `summarizeRevenueLedger`, after calculating `totals.net_realized_income_usd`, return:

```js
philanthropic_designation: buildPhilanthropicDesignation(
  totals.net_realized_income_usd
),
```

alongside `summary`, `realized_by_category_usd`, and the existing output blocks. Do not alter existing accounting totals or recognition rules.

- [ ] **Step 3: Run the ledger tests and verify GREEN**

Run:

```powershell
pnpm run revenue:ledger:test
```

Expected: all existing and new tests pass.

- [ ] **Step 4: Commit the implementation**

```powershell
git add lib/skygrid-revenue-ledger.mjs tests/skygrid-revenue-ledger.test.mjs
git commit -m "feat: add HRJ2 philanthropic designation metadata"
```

---

### Task 3: Document and production-verify the designation boundary

**Files:**
- Modify: `docs/accounting/skygrid-verified-infrastructure-revenue-ledger.md`
- Verify: `api/skygrid/revenue.mjs`
- Verify: `.github/workflows/skygrid-revenue-ledger-ci.yml`

**Interfaces:**
- Consumes: `report.philanthropic_designation` from the ledger.
- Produces: documented accounting contract and CI evidence that no payment side effect was introduced.

- [ ] **Step 1: Document the designation block**

Add an `HRJ=2 philanthropic designation` section stating:

```text
hrj=2 is designation-only accounting metadata.
It earmarks 100% of positive evidence-backed net realized income for philanthropic debt-relief purposes.
It does not create a beneficiary claim, payment instruction, wallet authority, custody authority, or automatic disbursement.
```

Include the formula:

```text
eligible_net_usd = max(net_realized_income_usd, 0)
hrj2_earmarked_usd = eligible_net_usd
```

- [ ] **Step 2: Confirm the API remains side-effect free**

Inspect `api/skygrid/revenue.mjs` and preserve its current contract: it only calls `summarizeRevenueLedger(records)` and returns JSON. Do not add signing, payment, transfer, persistence, or beneficiary-selection code.

- [ ] **Step 3: Run production verification commands**

Run:

```powershell
pnpm run revenue:ledger:test
node --check .\lib\skygrid-revenue-ledger.mjs
node --check .\api\skygrid\revenue.mjs
pnpm run pnpk:validate
```

Expected: all commands exit zero.

- [ ] **Step 4: Commit documentation**

```powershell
git add docs/accounting/skygrid-verified-infrastructure-revenue-ledger.md
git commit -m "docs: define HRJ2 designation-only accounting boundary"
```

- [ ] **Step 5: Open a pull request and require green CI before promotion**

PR title:

```text
feat: add HRJ2 philanthropic designation
```

PR body must explicitly state:

```text
- 100% of positive evidence-backed net realized income is designated under hrj=2.
- hrj=2 is designation-only and creates no automatic obligation or payout claim.
- no wallet signing, transaction broadcast, payment execution, custody, beneficiary-selection, or production-failover authority is added.
- realized income still requires settlement evidence.
```

Merge only after revenue-ledger CI and applicable fail-closed/PNPK checks are green. After merge, verify the production-branch workflow run on the merge SHA before calling the promotion complete.
