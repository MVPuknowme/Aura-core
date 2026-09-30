use super::*;

const FIXTURE: &str = r#"{
  "cik": "0001769628",
  "entityType": "operating",
  "sic": "7372",
  "sicDescription": "Services-Prepackaged Software",
  "ownerOrg": "06 Technology",
  "insiderTransactionForOwnerExists": 0,
  "insiderTransactionForIssuerExists": 1,
  "name": "CoreWeave, Inc.",
  "tickers": ["CRWV"],
  "exchanges": ["Nasdaq"],
  "ein": "823060021",
  "lei": null,
  "description": "",
  "website": "",
  "investorWebsite": "",
  "category": "Non-accelerated filer",
  "fiscalYearEnd": "1231",
  "stateOfIncorporation": "DE",
  "stateOfIncorporationDescription": "DE",
  "addresses": {
    "mailing": {
      "street1": "290 W. MT. PLEASANT AVENUE, SUITE 4100",
      "street2": null,
      "city": "LIVINGSTON",
      "stateOrCountry": "NJ",
      "zipCode": "07039",
      "stateOrCountryDescription": "NJ",
      "isForeignLocation": 0,
      "foreignStateTerritory": null,
      "country": null,
      "countryCode": null
    },
    "business": {
      "street1": "290 W. MT. PLEASANT AVENUE, SUITE 4100",
      "street2": null,
      "city": "LIVINGSTON",
      "stateOrCountry": "NJ",
      "zipCode": "07039",
      "stateOrCountryDescription": "NJ",
      "isForeignLocation": 0,
      "foreignStateTerritory": null,
      "country": null,
      "countryCode": null
    }
  },
  "phone": "",
  "flags": "",
  "formerNames": [],
  "filings": {
    "recent": {
      "accessionNumber": ["0001769628-26-000432"],
      "filingDate": ["2026-09-22"],
      "reportDate": ["2026-09-22"],
      "acceptanceDateTime": ["2026-09-22T00:00:00.000Z"],
      "act": ["34"],
      "form": ["8-K"],
      "fileNumber": ["001-42655"],
      "filmNumber": [""],
      "items": ["1.01,3.02,8.01,9.01"],
      "size": [123456],
      "isXBRL": [1],
      "isInlineXBRL": [1],
      "primaryDocument": ["crwv-20260922.htm"],
      "primaryDocDescription": ["8-K"]
    },
    "files": []
  }
}"#;

#[test]
fn parses_identity_and_recent_filing() {
    let submission = parse_submission(FIXTURE).expect("fixture should parse");

    assert_eq!(submission.cik, "0001769628");
    assert_eq!(submission.name, "CoreWeave, Inc.");
    assert_eq!(submission.tickers, vec!["CRWV"]);
    assert_eq!(submission.exchanges, vec!["Nasdaq"]);

    let filing = submission
        .filings
        .recent
        .get(0)
        .expect("expected first filing");

    assert_eq!(filing.accession_number, "0001769628-26-000432");
    assert_eq!(filing.form, "8-K");
    assert!(filing.is_xbrl);
    assert!(filing.is_inline_xbrl);
}

#[test]
fn creates_hash_bound_observation() {
    let observation = parse_observation(FIXTURE.as_bytes()).expect("observation should validate");

    assert_eq!(
        observation.source_url,
        "https://data.sec.gov/submissions/CIK0001769628.json"
    );
    assert_eq!(observation.sha256.len(), 64);
}

#[test]
fn generates_archive_url() {
    let submission = parse_submission(FIXTURE).unwrap();
    let filing = submission.filings.recent.get(0).unwrap();

    assert_eq!(
        submission.filing_url(&filing),
        "https://www.sec.gov/Archives/edgar/data/1769628/000176962826000432/crwv-20260922.htm"
    );
}

#[test]
fn fails_closed_on_column_length_mismatch() {
    let malformed = FIXTURE.replace(
        "\"filingDate\": [\"2026-09-22\"]",
        "\"filingDate\": []"
    );

    let error = parse_submission(&malformed).expect_err("mismatch must fail closed");
    assert!(matches!(
        error,
        ValidationError::ColumnLengthMismatch {
            column: "filing_date",
            ..
        }
    ));
}

#[test]
fn fails_closed_on_invalid_cik() {
    let malformed = FIXTURE.replace("\"0001769628\"", "\"1769628\"");
    let error = parse_submission(&malformed).expect_err("invalid CIK must fail closed");

    assert!(matches!(error, ValidationError::InvalidCik(_)));
}
