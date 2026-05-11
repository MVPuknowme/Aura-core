# SKYGRID / Aura-Core Website Functionality Map

Issue: #67
Operator: Michael Vincent Patrick / MVPuknowme
Status: Tester-ready planning artifact

## Objective

Prepare the SKYGRID / Aura-Core website for a five-person feedback test by ensuring every visible interaction has a purpose, safe routing, fallback behavior, and proof signal.

## Tester Goal

A tester should be able to visit the site and answer:

1. What is SKYGRID?
2. What can I click?
3. What happens when I click it?
4. How do I request pilot access or give feedback?
5. What proof shows the system is active or under development?

## Core User Flows

### Flow 1: Visitor understands the offer

- Entry point: Homepage hero
- User action: Reads headline and clicks primary CTA
- Primary CTA label: Join Pilot / Request Access
- Expected result: Opens pilot intake form or contact route
- Fallback: mailto link or static feedback form
- Proof: tester can describe the offer in one sentence

### Flow 2: Visitor checks system status

- Entry point: Status or Health section
- User action: Clicks Test Health Check / View Status
- Expected result: Opens a public-safe status panel or endpoint response
- Fallback: static status note with last manually verified timestamp
- Proof: visible timestamp, status label, or GitHub issue/commit link

### Flow 3: Visitor reviews credibility

- Entry point: Docs / Proof / GitHub section
- User action: Clicks Review Docs or Proof Trail
- Expected result: Opens GitHub documentation, issue, commit, or public artifact
- Fallback: static documentation page
- Proof: GitHub URL, commit SHA, issue number, or docs page

### Flow 4: Visitor expresses partner interest

- Entry point: Partner / Lease Node / Edge Space CTA
- User action: Clicks Partner With Us / Lease Node Interest
- Expected result: Opens pilot intake form with partner context
- Fallback: mailto subject line prefilled with "SKYGRID Pilot Interest"
- Proof: confirmation message or feedback record ID

### Flow 5: Tester gives feedback

- Entry point: Feedback CTA or invitation link
- User action: Completes feedback form
- Expected result: Confirmation message and feedback saved to Airtable/GitHub issue/manual inbox
- Fallback: email feedback template
- Proof: submitted timestamp or copied feedback template

## Required Buttons and Routes

| Button / Link | Purpose | Preferred Route | Fallback | Public-safe? |
| --- | --- | --- | --- | --- |
| Join Pilot | Capture early tester / pilot interest | Form endpoint or Airtable-backed form | mailto link | Yes |
| Test Health Check | Show basic service status | Public `/health` endpoint or static status page | GitHub status issue | Yes, if no secrets |
| Review Docs | Show evidence trail | GitHub docs folder | Static docs page | Yes |
| View Proof Trail | Show commits/issues | GitHub issue #66/#67 and commit links | Static proof section | Yes |
| Lease Node Interest | Capture server/edge-space partner interest | Pilot form with node interest field | mailto link | Yes |
| Contact Operator | Direct contact | Contact form or mailto | mailto | Yes |
| Give Feedback | Collect beta tester feedback | Feedback form | email template | Yes |

## Pilot Intake Form Spec

### Fields

- Name
- Email
- Organization or group, optional
- Location / region, optional
- Interest type:
  - General tester
  - Tech group
  - Edge/server-space partner
  - Investor/partner
  - Other
- What did you click first?
- What confused you?
- What felt useful?
- Would you recommend testing this to someone else?
- Consent checkbox: "I agree to be contacted about SKYGRID / Aura-Core pilot testing."

### Success Message

```text
Thank you — your SKYGRID pilot feedback was received. We are reviewing early tester responses to improve reliability, clarity, and safe functionality.
```

### Data Safety

- Do not collect private keys.
- Do not collect seed phrases.
- Do not request wallet signing for this test.
- Do not expose API keys or Airtable tokens in frontend code.
- Store only voluntary contact and feedback information.

## Public Status Panel Spec

### Display Fields

- Site status: Demo / Pilot / Live Preview
- Last checked timestamp
- Health endpoint result, if available
- GitHub proof link
- Known limitations
- Feedback CTA

### Safe Copy

```text
SKYGRID is in pilot/demo validation. Status indicators show test and preview availability, not guaranteed production uptime.
```

## Five-Person Feedback Test Plan

### Invite Message

```text
Hey, I’m testing an early SKYGRID / Aura-Core website flow. Could you spend 3–5 minutes clicking through it and tell me what is clear, what is confusing, and whether the buttons do what you expect? Please do not enter private keys, passwords, seed phrases, or sensitive financial information. This is only a website usability/pilot test.
```

### Tester Questions

1. What do you think SKYGRID does after 30 seconds?
2. Which button did you click first?
3. Did any button feel broken, unclear, or risky?
4. What information would make you trust the project more?
5. Would you sign up for pilot updates?
6. What should be removed or simplified?
7. Rate clarity from 1 to 5.
8. Rate trust from 1 to 5.
9. Rate visual appeal from 1 to 5.
10. Any final note?

## Launch Checklist Before Sending to Five Testers

- [ ] Every visible button routes somewhere real.
- [ ] Contact/pilot form has consent language.
- [ ] Feedback route exists.
- [ ] Health/status language says demo/pilot unless production is verified.
- [ ] No secrets in frontend code.
- [ ] No wallet signing prompts.
- [ ] GitHub proof links open correctly.
- [ ] Mobile view works on iPhone/iPad.
- [ ] Fallback mailto works if backend/API is not ready.
- [ ] Feedback is collected in one place.

## Recommended Implementation Order

1. Add or verify visible CTAs.
2. Wire all CTAs to safe destinations.
3. Add pilot intake/feedback route.
4. Add public status/proof section.
5. Run five-person test.
6. Collect feedback.
7. Open review issue with results.
8. Patch site copy/functionality.

## Review Gate

Before public expansion, review for:

- broken links,
- overclaims,
- privacy issues,
- unclear CTAs,
- unsupported production-readiness claims,
- secret exposure,
- and mobile usability.
