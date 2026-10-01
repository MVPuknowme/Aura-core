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
