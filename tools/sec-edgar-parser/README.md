# SKYGRID SEC EDGAR evidence parser

This isolated Rust utility parses SEC EDGAR submissions JSON from:

`https://data.sec.gov/submissions/CIK##########.json`

## Safety boundary

This tool is read-only. It does not create, sign, transmit, or submit SEC filings.
It converts an SEC response into a typed SHA-256-bound observation and fails
closed when the CIK or recent-filings column layout is invalid.

The SKYGRID profile in `skygrid-profile.json` intentionally leaves legal SEC
identity fields unset until a real legal entity name and CIK are verified.

## Test

```powershell
Set-Location tools/sec-edgar-parser
cargo test
```

## Evidence flow

```text
SEC HTTPS response
  -> raw bytes
  -> SHA-256
  -> serde parse
  -> schema/invariant validation
  -> normalized filing rows
  -> PNPK provenance receipt
  -> AURA/SKYGRID evidence plane
```

No wallet signing, settlement, transaction broadcast, or SEC filing-submission
authority is granted by this adapter.
