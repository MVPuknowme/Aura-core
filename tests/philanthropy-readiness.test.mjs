import assert from "node:assert/strict";
import test from "node:test";

import { buildPhilanthropyReadiness } from "../lib/philanthropy-readiness.mjs";

test("preserves HRJ2 at 100 percent until medical allocation is explicitly set", () => {
  const out = buildPhilanthropyReadiness({ netRealizedIncomeUsd: 1000 });

  assert.equal(out.current_hrj2.earmarked_usd, 1000);
  assert.equal(out.current_hrj2.preserved, true);
  assert.equal(out.medical_foundation.earmarked_usd, 0);
  assert.equal(
    out.medical_foundation.requires_owner_allocation_decision,
    true
  );
});

test("supports a future explicit split without double counting", () => {
  const out = buildPhilanthropyReadiness({
    netRealizedIncomeUsd: 1000,
    debtReliefPercent: 75,
    medicalFoundationPercent: 25
  });

  assert.equal(out.current_hrj2.earmarked_usd, 750);
  assert.equal(out.medical_foundation.earmarked_usd, 250);
  assert.equal(
    out.current_hrj2.earmarked_usd + out.medical_foundation.earmarked_usd,
    1000
  );
});

test("rejects allocations above 100 percent", () => {
  assert.throws(
    () =>
      buildPhilanthropyReadiness({
        netRealizedIncomeUsd: 100,
        debtReliefPercent: 80,
        medicalFoundationPercent: 30
      }),
    /philanthropy_allocation_exceeds_100_percent/
  );
});

test("never allocates projected or negative economics by inference", () => {
  const out = buildPhilanthropyReadiness({
    netRealizedIncomeUsd: -10,
    debtReliefPercent: 75,
    medicalFoundationPercent: 25
  });

  assert.equal(out.eligible_net_realized_income_usd, 0);
  assert.equal(out.current_hrj2.earmarked_usd, 0);
  assert.equal(out.medical_foundation.earmarked_usd, 0);
  assert.equal(out.controls.projected_income_eligible, false);
});
