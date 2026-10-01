# SKYGRID Validator Economics Evidence Model

This model separates **settled validator income** from **planning projections**.

## Current Klamath interpretation

The repository currently contains two incompatible planning families for
`klamath-falls-core`:

- approximately USD 134.63/day, tied to USD 945/week, USD 4,095/month,
  and USD 49,140/year;
- USD 1,463/day, carried as an operational ledger value.

Neither family is recognized as realized income. Current verified paid value is
USD 0 because no settlement evidence is attached.

Run:

```powershell
pnpm run validator:economics
pnpm run validator:economics:test
```

The command returns a planning range and a separate realized-income block.
Projected or unverified scenarios can never populate realized income.

## Promotion rule

Before a validator forecast can become realized income, attach qualifying
primary evidence such as a validator withdrawal, on-chain payout, service
payment, bank posting, or other accepted settlement record, then reconcile it
through the SKYGRID Verified Infrastructure Revenue Ledger.


## Klamath operating-history note

The operator reports that the Klamath Falls network switch and hub has been
operating for approximately one year.

Repository evidence corroborates the existence of `klamath-falls-core`, its
`west_resilience_anchor` role, validator-control configuration, and assigned
validation work. That supports a long-running operating-history claim, but the
repository does not yet prove 365 consecutive days of production uptime or 365
days of realized revenue.

For accounting:
- operating age is infrastructure evidence;
- validated work is service evidence;
- invoices are billing evidence;
- settlement records are realized-revenue evidence.

These evidence classes remain separate.
