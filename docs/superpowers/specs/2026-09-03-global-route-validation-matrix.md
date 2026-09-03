# Global Route Validation Matrix Specification

## Goal
Build a worldwide, fail-closed route-validation matrix for SKYGRID Emergency Data On-Ramp that evaluates finance/data routes over a rolling 24-hour window, normalizes only measured inflation/FX margin, records statistically abnormal verified losses, and calculates a proposed SKYGRID support fee without rewriting provider transactions or recognizing forecast income as realized revenue.

## Approved policy
- Worldwide scope; Taiwan → New York is the first named corridor, not the only corridor.
- Rolling validation window: 24 hours.
- Proposed SKYGRID support fee: 3% of adjusted eligible value.
- Payment execution eligibility requires a route verification confidence of at least 98% (0.98).
- A score below 0.98 is not execution-eligible and must fail closed into deferred or blocked status.
- The 98% gate is an eligibility/control signal only; this feature does not itself call a live payment processor, sign a wallet transaction, broadcast a transaction, move funds, activate devices, move private data, or trigger production failover.
- Any future provider-side payment execution still requires the existing authenticated operator boundary, explicit amount, verified destination, idempotency protection, and separately configured provider execution capability.
- Existing linked-bank/provider transactions remain authoritative and are never rewritten by this matrix.
- Proposed fees, exception-loss reserves, and unverified settlement amounts remain contingent until evidence exists.

## Route identity
One matrix row represents a unique route tuple:

`origin_jurisdiction + destination_jurisdiction + provider + asset + network + settlement_destination`

Each row records:
- route_id
- origin_jurisdiction
- destination_jurisdiction
- provider
- asset
- network
- settlement_destination
- window_started_at
- evidence_timestamp
- route_health
- auth_scope_ok
- deposit_available
- withdrawal_available
- destination_verified
- quote_value
- fee_spread_bps
- inflation_fx_margin_24h
- verification_confidence
- normal_loss_threshold
- verified_loss
- exception_loss
- adjusted_eligible_value
- support_fee_rate
- proposed_support_fee
- settlement_status
- state
- failure_reasons

## States
- `verified`: all mandatory checks pass and verification_confidence >= 0.98.
- `deferred`: temporarily unavailable, stale, rate-limited, or confidence below 0.98 without a hard safety mismatch.
- `blocked`: wrong network, destination mismatch, authorization failure, unsupported rail, malformed evidence, or other hard guardrail failure.
- `settled`: verified route with independently evidenced settlement completion.
- `exception`: settled or otherwise evidence-complete route with verified loss above the statistical normal-loss threshold.

## Statistical policy
The normal-loss threshold is derived from comparable verified route observations using robust statistics:

`normal_loss_threshold = median(losses) + 1.5 * IQR(losses)`

`exception_loss = max(0, verified_loss - normal_loss_threshold)`

No missing, inferred, forecast, or anecdotal loss amount may be substituted for verified loss evidence.

## 24-hour inflation/FX normalization
Only measured price-level / FX margin attributable to the route during the rolling 24-hour window may adjust eligible value.

`inflation_adjusted_value = verified_settlement_value * (1 + inflation_fx_margin_24h)`

`adjusted_eligible_value = inflation_adjusted_value + exception_loss`

The margin must be represented as a decimal and must be sourced from configured, timestamped reference observations. Short-lived unverified market spikes are not treated as inflation.

## Fee policy
`proposed_support_fee = adjusted_eligible_value * 0.03`

The fee remains contingent until the route is settled or an enforceable receivable/payment obligation is independently evidenced. A verified but unsettled route may display the proposed fee but must not label it realized income.

## 98% execution-eligibility gate
Payment execution eligibility is true only when all of the following hold:
1. verification_confidence >= 0.98
2. state is `verified` or `settled`
3. destination_verified is true
4. auth_scope_ok is true
5. route_health is passing
6. required network/asset checks pass
7. evidence is inside the active 24-hour window
8. no hard failure reason exists

The matrix returns an eligibility decision; it does not perform the payment.

## Fail-closed behavior
Any missing mandatory field, stale evidence, non-finite numeric input, unsupported route, confidence below 0.98, destination mismatch, or contradictory evidence prevents execution eligibility. Hard safety mismatches produce `blocked`; temporary or statistical insufficiency produces `deferred`.

## Output contract
The implementation must expose a deterministic evaluator that accepts route observations and returns the complete normalized matrix row, including `payment_execution_eligible`, without side effects.

A read-only API route may return matrix rows and summary counts. POST/GET behavior must not create transfers, sign transactions, broadcast, or mutate financial-provider records.

## Accounting boundary
Provider transactions are authoritative. Matrix outputs are analytical/control records only. Proposed fee and exception-loss values are contingent. Realized income requires settlement evidence or an enforceable receivable recognized under a separately approved accounting process.

## Security boundary
The feature must preserve OWNER/operator authentication, request-signing boundaries, idempotency controls for any future execution adapter, PNPK fail-closed semantics, and existing wallet/broadcast restrictions. It must not silently weaken canonical runtime controls.

## Acceptance criteria
- Deterministic route row evaluation.
- 0.98 verification threshold enforced exactly.
- Below-threshold rows are never execution-eligible.
- Destination mismatch is blocked.
- 24-hour stale evidence is not eligible.
- Robust exception-loss calculation uses median + 1.5×IQR.
- 3% fee calculation is based only on adjusted eligible value.
- Proposed fee is never labeled realized income without settlement evidence.
- No live processor call, wallet signing, transaction broadcast, or funds movement is introduced.
- Tests cover verified, deferred, blocked, stale, exception-loss, and settled cases.
