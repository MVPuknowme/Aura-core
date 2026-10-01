function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function percentOrNull(value, field) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    throw new Error(`${field}_invalid`);
  }
  return parsed;
}

export function buildPhilanthropyReadiness({
  netRealizedIncomeUsd = 0,
  debtReliefPercent = 100,
  medicalFoundationPercent = null,
  legalEntityStatus = "not_established"
} = {}) {
  const net = Number(netRealizedIncomeUsd);
  if (!Number.isFinite(net)) throw new Error("net_realized_income_invalid");

  const eligible = roundMoney(Math.max(net, 0));
  const debt = percentOrNull(debtReliefPercent, "debt_relief_percent");
  const medical = percentOrNull(
    medicalFoundationPercent,
    "medical_foundation_percent"
  );

  if (medical !== null && debt + medical > 100) {
    throw new Error("philanthropy_allocation_exceeds_100_percent");
  }

  const medicalReady = medical !== null;
  const debtAmount = roundMoney(eligible * ((debt ?? 0) / 100));
  const medicalAmount = medicalReady
    ? roundMoney(eligible * (medical / 100))
    : 0;

  return {
    schema: "skygrid.philanthropy-readiness.v1",
    basis: "positive_net_realized_income_only",
    eligible_net_realized_income_usd: eligible,
    current_hrj2: {
      purpose: "philanthropic_debt_relief",
      allocation_percent: debt,
      earmarked_usd: debtAmount,
      preserved: debt === 100 && medical === null
    },
    medical_foundation: {
      legal_entity_status: String(legalEntityStatus),
      allocation_percent: medical,
      earmarked_usd: medicalAmount,
      allocation_ready: medicalReady,
      requires_owner_allocation_decision: !medicalReady,
      requires_legal_formation_before_external_representation: true
    },
    controls: {
      designation_only: true,
      payment_authority: false,
      wallet_signing_allowed: false,
      transaction_broadcast_allowed: false,
      automatic_disbursement_allowed: false,
      projected_income_eligible: false,
      contracted_income_eligible: false,
      accrued_income_eligible: false
    }
  };
}
