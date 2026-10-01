import assert from "node:assert/strict";
import test from "node:test";

import { estimateTaiwanRoutingRevenue } from "../lib/thorium-taiwan-economics.mjs";

const input = {
  market: {
    name: "Taiwan launch reference",
    observedAt: "2026-10-01",
    registeredVaspCount: 10,
    visibleVenueCount: 2,
    visibleDailyVolumeUsd: 36035253.22
  },
  tiers: [
    { name: "pilot", captureBps: 25, takeRateBps: 3 },
    { name: "scaled", captureBps: 200, takeRateBps: 5 },
    { name: "best", captureBps: 1000, takeRateBps: 8 }
  ]
};

test("computes the three Taiwan routing scenarios", () => {
  const report = estimateTaiwanRoutingRevenue(input);

  assert.deepEqual(
    report.tiers.map((tier) => tier.revenue.daily_usd),
    [27.03, 360.35, 2882.82]
  );
  assert.deepEqual(
    report.tiers.map((tier) => tier.revenue.annual_usd),
    [9864.65, 131528.67, 1052229.39]
  );
});

test("does not classify modeled revenue as realized", () => {
  const report = estimateTaiwanRoutingRevenue(input);
  assert.equal(report.accounting.realized_income_usd, 0);
  assert.equal(report.accounting.recognition, "projected");
  assert.equal(report.execution_boundary.acts_as_exchange, false);
});

test("rejects capture above 100 percent", () => {
  assert.throws(
    () =>
      estimateTaiwanRoutingRevenue({
        ...input,
        tiers: [{ name: "bad", captureBps: 10001, takeRateBps: 1 }]
      }),
    /capture_bps_above_100pct/
  );
});

test("does not invent unobserved VASP volume", () => {
  const report = estimateTaiwanRoutingRevenue(input);
  assert.equal(report.market.registered_vasp_count, 10);
  assert.equal(report.market.visible_venue_count, 2);
  assert.equal(report.market.visible_daily_volume_usd, 36035253.22);
  assert.match(report.market.note, /not imputed/);
});
