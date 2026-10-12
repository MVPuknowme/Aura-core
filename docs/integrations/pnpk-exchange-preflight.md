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

## Operator configuration and public receipts

The evaluator now loads `config/pnpk-exchange-preflight.v1.json`. Its configured
limits are 5,000 ms quote age, 50 bps slippage and 100 bps price impact. Request
policy can tighten those limits but cannot raise them. When the operator sets
`vpn_required: true`, a request cannot switch off the VPN checks.

`approved_providers` and `approved_route_networks` are intentionally empty until
the owner identifies the actual venue and network. Empty lists hold all routes;
the caller cannot authorize a venue by placing an allowlist in its request.
The evaluator's third argument is reserved for trusted server configuration;
never populate it from a request. No exchange or bank credentials are stored
in this policy. The existing quote/network/market observations remain supplied
inputs, not independently authenticated exchange telemetry.

Receipts publicly identify Michael Vincent Patrick — MVPuknowme, the requested
provider, network and asset pair, measured quote conditions, effective limits,
check outcomes and a policy hash. They exclude arbitrary input fields such as
bank credentials. Put only public business identifiers in intent, provider,
network and pair fields. A receipt hash is an integrity fingerprint, not a
signature or an execution grant.

## Aura Recon payout workflow

The opt-in owner-dispatched assessment job now runs the exchange preflight
before founder payout assessment. Supply the observation object as the
`PNPK_EXCHANGE_PREFLIGHT_JSON` secret in the existing environment. It uses the
same input contract as `evaluateExchangePreflight`: `intentId`, `routeNetworkId`,
`assetPair`, `provider`, `network`, `vpn`, `market`, `quote`, and optional tighter
`policy` limits. Never put a private bank account or API key in an identifier.

The workflow publishes the generated `exchange-preflight-public.json` receipt
even when checks hold the route, and skips founder assessment when exchange
preflight fails. Missing/malformed observations produce a fixed public failure
record without logging the input. No secrets, environment settings or venue
allowlists have been configured remotely by this code change.

For an operator-supplied observation snapshot already loaded privately into the
environment, run with Node 24:

```bash
node scripts/exchange-preflight.mjs --output /private/exchange-preflight-public.json
```

Exit 0 means route checks passed; exit 1 means held or invalid input/output.
Reports refuse overwrite. A passing route does not establish a payout amount,
source balance, destination verification, payment, or permission to trade. Bank
payout integration still requires the provider and destination described in
[founder payout preparation](../accounting/founder-payout-preflight.md).

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
