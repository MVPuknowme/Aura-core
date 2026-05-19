# FEMA Registration and Submission Path for SkyGrid

## Current status

SkyGrid / Aura-Core has a FEMA preparedness grant proposal draft, but it is not submission-ready until the applicant entity, SAM.gov registration, Grants.gov access, and program-specific NOFO/manual requirements are confirmed.

## Recommended posture

```yaml
skygrid_role:
  preferred: technology_partner_or_pilot_vendor
  possible: subrecipient_if_program_allows
  not_recommended_without_verification: sole_direct_applicant

prime_applicant_options:
  - county emergency management office
  - city public safety office
  - fire protection district
  - tribal emergency management office
  - state administrative agency or pass-through partner
```

## Step-by-step path

### Step 1 — Pick the grant target and local applicant

Choose one jurisdiction and one applicant type first.

```yaml
candidate_pilots:
  - La Pine / Deschutes County emergency management or fire district
  - Klamath County emergency management or fire district
  - Silverton / Marion County emergency management or fire district
  - tribal emergency management partner
```

Output:

```text
Lead applicant selected
Point of contact identified
SkyGrid role defined as technology partner
```

### Step 2 — Confirm SAM.gov registration and UEI

The prime applicant must have an active SAM.gov registration if it wants to apply directly for federal assistance as a prime awardee. SAM.gov assigns the Unique Entity ID during registration.

Output:

```text
Applicant UEI confirmed
SAM.gov status active or renewal in progress
EBiz / authorized contact identified
```

### Step 3 — Confirm Grants.gov access

The organization must be registered in SAM.gov before it can apply through Grants.gov. The EBiz POC or authorized user must create or use a Grants.gov account and assign the correct application role.

Output:

```text
Grants.gov organization profile active
Authorized Organization Representative or Workspace Manager confirmed
```

### Step 4 — Select exact FEMA program or NOFO

Do not submit a generic proposal. Match SkyGrid to the specific FEMA opportunity.

Likely fit categories:

```yaml
fit_categories:
  preparedness:
    - planning
    - exercises
    - emergency technology
    - public education
    - continuity
  resilience:
    - outage readiness
    - community resilience hub support
    - wildfire or power-risk readiness
  responder_support:
    - fire-risk continuity
    - responder-adjacent technology
    - after-action reporting
```

Output:

```text
NOFO/program selected
Eligibility confirmed
Allowable activities confirmed
Cost-share/match rules confirmed
```

### Step 5 — Convert SkyGrid proposal into NOFO format

Use the existing hub draft:

```text
docs/grants/fema-preparedness-grant-proposal-skygrid.md
```

Convert it into the required sections:

```yaml
application_sections:
  - project title
  - applicant information
  - problem statement
  - project narrative
  - goals and objectives
  - scope of work
  - milestones
  - budget narrative
  - capability statement
  - privacy and cybersecurity controls
  - evaluation metrics
  - sustainability plan
```

Output:

```text
Grant narrative ready
Budget justification ready
Attachments list ready
```

### Step 6 — Prepare attachments

```yaml
attachments:
  - local partner letter or MOU
  - SkyGrid capability statement
  - budget worksheet
  - project timeline
  - privacy and consent framework
  - cybersecurity / fail-closed guardrails
  - proof logging architecture
  - emergency memory window service description
  - procurement statement if SkyGrid is vendor/subrecipient
```

Output:

```text
Attachment packet ready
```

### Step 7 — Submit through the eligible applicant

The prime applicant submits through Grants.gov, FEMA GO, ND Grants, or the state administrative agency process depending on the program.

Output:

```text
Application submitted
Confirmation number saved
Submission PDF exported
```

### Step 8 — Post-submission tracking

```yaml
tracking:
  - submission confirmation number
  - applicant contact
  - program name
  - deadline
  - review period
  - clarification requests
  - award or denial notice
  - next revision cycle
```

Output:

```text
Submission tracked in Airtable/GitHub
```

## Submission readiness checklist

```yaml
readiness:
  proposal_draft: done
  applicant_selected: needed
  SAM_UEI_confirmed: needed
  Grants_gov_role_confirmed: needed
  FEMA_program_selected: needed
  manual_review_completed: pending_uploaded_pdf
  local_partner_letter: needed
  budget_justification: draft_needed
  attachments: draft_needed
  submission: not_ready_yet
```

## Immediate next three actions

1. Choose the first local applicant target.
2. Confirm their SAM.gov/UEI status.
3. Prepare a one-page local partner letter requesting participation in the SkyGrid Emergency Memory Window pilot.
