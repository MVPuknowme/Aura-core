function finiteNonnegative(value, field) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field}_invalid`);
  }
  return value;
}

function text(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field}_required`);
  }
  return value.trim();
}

function bpsToFraction(bps, field) {
  return finiteNonnegative(bps, field) / 10000;
}

export function estimateTaiwanRoutingRevenue(input = {}) {
  const market = input.market ?? {};
  const marketName = text(market.name, "market_name");
  const observedAt = text(market.observedAt, "market_observed_at");
  const visibleDailyVolumeUsd = finiteNonnegative(
    market.visibleDailyVolumeUsd,
    "visible_daily_volume_usd"
  );
  const registeredVaspCount = finiteNonnegative(
    market.registeredVaspCount,
    "registered_vasp_count"
  );
  const visibleVenueCount = finiteNonnegative(
    market.visibleVenueCount,
    "visible_venue_count"
  );

  if (!Array.isArray(input.tiers) || input.tiers.length === 0) {
    throw new Error("tiers_required");
  }

  const tiers = input.tiers.map((tier) => {
    const name = text(tier.name, "tier_name");
    const captureBps = finiteNonnegative(tier.captureBps, "capture_bps");
    const takeRateBps = finiteNonnegative(tier.takeRateBps, "take_rate_bps");
    if (captureBps > 10000) throw new Error("capture_bps_above_100pct");

    const capturedDailyVolumeUsd =
      visibleDailyVolumeUsd * bpsToFraction(captureBps, "capture_bps");
    const dailyRevenueUsd =
      capturedDailyVolumeUsd * bpsToFraction(takeRateBps, "take_rate_bps");

    return {
      name,
      capture_bps: captureBps,
      capture_percent: captureBps / 100,
      take_rate_bps: takeRateBps,
      captured_daily_volume_usd: Number(capturedDailyVolumeUsd.toFixed(2)),
      revenue: {
        daily_usd: Number(dailyRevenueUsd.toFixed(2)),
        monthly_usd: Number((dailyRevenueUsd * 30.44).toFixed(2)),
        annual_usd: Number((dailyRevenueUsd * 365).toFixed(2))
      }
    };
  });

  return {
    schema: "thorium.taiwan-launch-economics.v1",
    market: {
      name: marketName,
      observed_at: observedAt,
      registered_vasp_count: registeredVaspCount,
      visible_venue_count: visibleVenueCount,
      visible_daily_volume_usd: visibleDailyVolumeUsd,
      note:
        "Revenue estimates use only observed venue volume supplied in this snapshot. Unobserved VASP volume is not imputed."
    },
    tiers,
    accounting: {
      realized_income_usd: 0,
      recognition: "projected",
      commercial_contracts_required: true,
      settlement_evidence_required_for_realized_income: true
    },
    execution_boundary: {
      acts_as_exchange: false,
      custody: false,
      wallet_signing: false,
      transaction_broadcast: false,
      purpose: "B2B routing, quote optimization, evidence, and PNPK receipts."
    }
  };
}
