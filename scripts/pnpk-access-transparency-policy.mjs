const REQUIRED_EVENTS = [
  "tamper_detected",
  "access_pre_requested",
  "access_requested",
  "access_approved",
  "access_denied",
  "access_activated",
  "access_modified",
  "access_expired",
  "access_revoked",
  "interception_requested",
  "interception_approved",
  "interception_activated",
  "interception_ended",
  "notification_delayed",
  "subject_notified"
];

const REQUIRED_AUTHORITY_FIELDS = [
  "authority_type",
  "issuing_authority",
  "jurisdiction",
  "legal_process_identifier",
  "target_scope",
  "data_categories",
  "service_account_facility_or_place",
  "start_at",
  "expires_at",
  "minimization_or_handling_rule",
  "approver_identity",
  "notification_status",
  "delayed_notice_basis",
  "delayed_notice_expires_or_review_at"
];

function requirePolicy(condition, message) {
  if (!condition) {
    throw new Error(`access transparency policy: ${message}`);
  }
}

export function validateAccessTransparencyPolicy(pnpk) {
  const policy = pnpk?.access_transparency;

  requirePolicy(policy?.enabled === true, "must be enabled");
  requirePolicy(
    policy.mode === "receipt_only_no_interception_authority",
    "must remain receipt-only and grant no interception authority"
  );
  requirePolicy(
    policy.instrumented_boundary_only === true,
    "must acknowledge that detection is limited to instrumented trust boundaries"
  );
  requirePolicy(
    policy.tamper_evident_not_tamper_proof === true,
    "must be described as tamper-evident, not tamper-proof"
  );
  requirePolicy(policy.content_capture_default === false, "content capture must be disabled by default");
  requirePolicy(policy.interception_execution_allowed === false, "interception execution must remain disabled");
  requirePolicy(
    policy.no_auto_acceptance_from_document_label === true,
    "a warrant, order, subpoena, or request label must not automatically authorize access"
  );
  requirePolicy(policy.legal_review_required === true, "jurisdiction-specific legal review is required");
  requirePolicy(policy.warrant_particularity_required === true, "warrant particularity is required");

  const eventSet = new Set(policy.receipt_events ?? []);
  for (const event of REQUIRED_EVENTS) {
    requirePolicy(eventSet.has(event), `missing required receipt event ${event}`);
  }

  const fieldSet = new Set(policy.required_authority_fields ?? []);
  for (const field of REQUIRED_AUTHORITY_FIELDS) {
    requirePolicy(fieldSet.has(field), `missing required authority field ${field}`);
  }

  requirePolicy(
    policy.ambiguous_or_overbroad_behavior === "fail_closed_no_access",
    "ambiguous or overbroad authority must fail closed"
  );
  requirePolicy(
    policy.expired_or_revoked_behavior === "fail_closed_no_access",
    "expired or revoked authority must fail closed"
  );
  requirePolicy(
    policy.notification_policy?.notify_when_lawfully_permitted === true,
    "subject notification must occur when lawfully permitted"
  );
  requirePolicy(
    policy.notification_policy?.delayed_notice_requires_basis === true,
    "delayed notice requires a recorded legal basis"
  );
  requirePolicy(
    policy.notification_policy?.delayed_notice_requires_expiration_or_review_at === true,
    "delayed notice requires an expiration or review date"
  );
  requirePolicy(
    policy.receipt_content_policy?.metadata_and_hashes_only === true,
    "receipts must default to metadata and hashes only"
  );
  requirePolicy(
    policy.receipt_content_policy?.call_or_message_content_allowed === false,
    "call or message content must not be stored in receipts"
  );
  requirePolicy(
    policy.receipt_content_policy?.secrets_or_protected_details_allowed === false,
    "secrets or protected details must not be stored in receipts"
  );

  const grades = new Set(policy.grade_outcomes ?? []);
  for (const grade of [
    "verified_current",
    "verified_delayed_notice",
    "incomplete_fail_closed",
    "conflicted_fail_closed",
    "tamper_alert"
  ]) {
    requirePolicy(grades.has(grade), `missing evidence grade ${grade}`);
  }

  return policy;
}

export { REQUIRED_AUTHORITY_FIELDS, REQUIRED_EVENTS };
