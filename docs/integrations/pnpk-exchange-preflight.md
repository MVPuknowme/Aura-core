# PNPK exchange preflight

Every supported currency-exchange intent should pass a deterministic PNPK
preflight before it is eligible for a separate execution layer.

The preflight consumes already-observed health evidence. It does not scan
unknown networks, reconfigure a VPN, sign a wallet, or broadcast a transaction.

Required evidence includes:

- network reachability;
- DNS and TLS validity;
- clock synchronization;
- provider health;
- VPN presence, route validity, and DNS-leak result when VPN policy requires it;
- asset and venue support;
- liquidity sufficiency;
- quote freshness;
- slippage and price-impact limits.

Any failed required check yields `FAIL_CLOSED`.

## What this can guarantee

When the evaluator and its inputs are valid, PNPK can guarantee that a route
which violates a declared check will not be approved by this preflight.

## What this cannot guarantee

It cannot prove that every possible failure mode has been discovered. It also
cannot guarantee profit, a loss-free exchange, future liquidity, future price,
or the honesty/availability of systems outside the measured trust boundary.

That distinction is important for users with limited market or networking
experience: the system should prevent known unsafe execution conditions rather
than manufacture certainty.
