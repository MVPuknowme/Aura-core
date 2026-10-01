use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fmt;

pub const SEC_SUBMISSIONS_BASE: &str = "https://data.sec.gov/submissions";

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Submission {
    pub cik: String,
    pub entity_type: String,
    pub sic: String,
    pub sic_description: String,
    pub owner_org: String,
    pub insider_transaction_for_owner_exists: i32,
    pub insider_transaction_for_issuer_exists: i32,
    pub name: String,
    pub tickers: Vec<String>,
    pub exchanges: Vec<String>,
    pub ein: Option<String>,
    pub lei: Option<String>,
    pub description: String,
    pub website: String,
    pub investor_website: String,
    pub category: String,
    pub fiscal_year_end: String,
    pub state_of_incorporation: String,
    pub state_of_incorporation_description: String,
    pub addresses: Addresses,
    #[serde(default)]
    pub phone: String,
    #[serde(default)]
    pub flags: String,
    #[serde(default)]
    pub former_names: Vec<FormerName>,
    pub filings: Filings,
}

#[derive(Debug, Deserialize)]
pub struct Addresses {
    pub mailing: Address,
    pub business: Address,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Address {
    pub street1: Option<String>,
    pub street2: Option<String>,
    pub city: Option<String>,
    pub state_or_country: Option<String>,
    pub zip_code: Option<String>,
    pub state_or_country_description: Option<String>,
    pub is_foreign_location: Option<i32>,
    pub foreign_state_territory: Option<String>,
    pub country: Option<String>,
    pub country_code: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct FormerName {
    pub name: String,
    pub from: String,
    pub to: String,
}

#[derive(Debug, Deserialize)]
pub struct Filings {
    pub recent: RecentFilings,
    #[serde(default)]
    pub files: Vec<FilingHistoryFile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FilingHistoryFile {
    pub name: String,
    pub filing_count: u64,
    pub filing_from: String,
    pub filing_to: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecentFilings {
    pub accession_number: Vec<String>,
    pub filing_date: Vec<String>,
    pub report_date: Vec<String>,
    pub acceptance_date_time: Vec<String>,
    pub act: Vec<String>,
    pub form: Vec<String>,
    pub file_number: Vec<String>,
    pub film_number: Vec<String>,
    pub items: Vec<String>,
    pub size: Vec<u64>,
    #[serde(rename = "isXBRL")]
    pub is_xbrl: Vec<i32>,
    #[serde(rename = "isInlineXBRL")]
    pub is_inline_xbrl: Vec<i32>,
    pub primary_document: Vec<String>,
    pub primary_doc_description: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Filing {
    pub accession_number: String,
    pub filing_date: String,
    pub report_date: String,
    pub acceptance_date_time: String,
    pub act: String,
    pub form: String,
    pub file_number: String,
    pub film_number: String,
    pub items: String,
    pub size: u64,
    pub is_xbrl: bool,
    pub is_inline_xbrl: bool,
    pub primary_document: String,
    pub primary_doc_description: String,
}

#[derive(Debug)]
pub struct SecObservation {
    pub source_url: String,
    pub sha256: String,
    pub submission: Submission,
}

#[derive(Debug)]
pub enum ValidationError {
    Json(serde_json::Error),
    InvalidCik(String),
    ColumnLengthMismatch {
        column: &'static str,
        expected: usize,
        actual: usize,
    },
}

impl fmt::Display for ValidationError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Json(error) => write!(f, "invalid SEC JSON: {error}"),
            Self::InvalidCik(cik) => write!(f, "invalid SEC CIK: {cik}"),
            Self::ColumnLengthMismatch {
                column,
                expected,
                actual,
            } => write!(
                f,
                "SEC recent-filings column length mismatch for {column}: expected {expected}, got {actual}"
            ),
        }
    }
}

impl std::error::Error for ValidationError {}

impl From<serde_json::Error> for ValidationError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}

pub fn parse_submission(json: &str) -> Result<Submission, ValidationError> {
    let submission: Submission = serde_json::from_str(json)?;
    validate_cik(&submission.cik)?;
    submission.filings.recent.validate_column_lengths()?;
    Ok(submission)
}

pub fn parse_observation(raw_json: &[u8]) -> Result<SecObservation, ValidationError> {
    let json = std::str::from_utf8(raw_json).map_err(|_| {
        ValidationError::Json(serde_json::Error::io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            "SEC response is not UTF-8",
        )))
    })?;

    let submission = parse_submission(json)?;
    let source_url = format!("{SEC_SUBMISSIONS_BASE}/CIK{}.json", submission.cik);

    let mut hasher = Sha256::new();
    hasher.update(raw_json);
    let sha256 = format!("{:x}", hasher.finalize());

    Ok(SecObservation {
        source_url,
        sha256,
        submission,
    })
}

fn validate_cik(cik: &str) -> Result<(), ValidationError> {
    if cik.len() == 10 && cik.bytes().all(|byte| byte.is_ascii_digit()) {
        return Ok(());
    }

    Err(ValidationError::InvalidCik(cik.to_owned()))
}

impl RecentFilings {
    pub fn len(&self) -> usize {
        self.accession_number.len()
    }

    pub fn is_empty(&self) -> bool {
        self.accession_number.is_empty()
    }

    pub fn validate_column_lengths(&self) -> Result<(), ValidationError> {
        let expected = self.len();

        macro_rules! require_len {
            ($field:ident) => {
                if self.$field.len() != expected {
                    return Err(ValidationError::ColumnLengthMismatch {
                        column: stringify!($field),
                        expected,
                        actual: self.$field.len(),
                    });
                }
            };
        }

        require_len!(filing_date);
        require_len!(report_date);
        require_len!(acceptance_date_time);
        require_len!(act);
        require_len!(form);
        require_len!(file_number);
        require_len!(film_number);
        require_len!(items);
        require_len!(size);
        require_len!(is_xbrl);
        require_len!(is_inline_xbrl);
        require_len!(primary_document);
        require_len!(primary_doc_description);

        Ok(())
    }

    pub fn get(&self, index: usize) -> Option<Filing> {
        Some(Filing {
            accession_number: self.accession_number.get(index)?.clone(),
            filing_date: self.filing_date.get(index)?.clone(),
            report_date: self.report_date.get(index)?.clone(),
            acceptance_date_time: self.acceptance_date_time.get(index)?.clone(),
            act: self.act.get(index)?.clone(),
            form: self.form.get(index)?.clone(),
            file_number: self.file_number.get(index)?.clone(),
            film_number: self.film_number.get(index)?.clone(),
            items: self.items.get(index)?.clone(),
            size: *self.size.get(index)?,
            is_xbrl: *self.is_xbrl.get(index)? != 0,
            is_inline_xbrl: *self.is_inline_xbrl.get(index)? != 0,
            primary_document: self.primary_document.get(index)?.clone(),
            primary_doc_description: self.primary_doc_description.get(index)?.clone(),
        })
    }

    pub fn iter(&self) -> impl Iterator<Item = Filing> + '_ {
        (0..self.len()).filter_map(|index| self.get(index))
    }
}

impl Submission {
    pub fn filing_url(&self, filing: &Filing) -> String {
        let cik = self.cik.trim_start_matches('0');
        let accession_dir = filing.accession_number.replace('-', "");

        format!(
            "https://www.sec.gov/Archives/edgar/data/{cik}/{accession_dir}/{}",
            filing.primary_document
        )
    }
}

#[cfg(test)]
#[path = "parser_tests.rs"]
mod tests;
