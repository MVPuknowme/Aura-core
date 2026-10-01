# PNPK production operations preflight

SKYGRID now distinguishes two production activities from unrestricted failover.

## 1. Live validation work

Live validation may run continuously against SKYGRID-owned or explicitly
owner-authorized leased production targets when:

- the validation scope is approved;
- the validation plan is hash-bound;
- PNPK policy is current;
- audit writes are available;
- no private-data movement or third-party scanning is requested.

Validation output remains evidence. It cannot promote payout or revenue status by
itself.

## 2. Network relight

A network relight is a bounded recovery operation for an already-authorized
SKYGRID route or runtime after degradation. It is not permission for arbitrary
network reconfiguration or unrestricted production failover.

Allowed relight actions are:

- restart an approved runtime;
- re-enable an approved route;
- promote a route that has already passed the required health checks.

Before a relight becomes execution-eligible, PNPK requires:

- an attributable operator approval;
- a hash-bound activation grant;
- at least two agreeing health signals;
- confidence >= 0.90;
- verified rollback capability;
- hash-bound health evidence;
- a rollback receipt.

The preflight itself never performs the relight. A separate allowlisted
execution adapter must consume the receipt and remain bound to the exact target
and action.

## Always blocked

This policy does not enable unrestricted production failover, payment execution,
wallet signing, transaction broadcast, private-data movement, OS-level network
switching, scanning of third-party systems, or mutation outside the bound target.
