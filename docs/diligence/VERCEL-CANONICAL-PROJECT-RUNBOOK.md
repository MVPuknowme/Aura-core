# Vercel canonical-project recovery runbook

Snapshot date: 2026-08-29

## Verified state

Five Vercel projects are linked to the same GitHub repository. All report `live: false`, and none lists `aurcore.skygrid-protocol.net` among its project domains.

| Candidate | Project ID | Latest artifact state | Listed project domains |
|---|---|---|---|
| `aura-core` | `prj_z9Ker7gTAPdyFyO4n6y4aPJL4KZ8` | READY preview; not production | Two generated `vercel.app` aliases |
| `aura-core-t2t5` | `prj_iMZIpijJ1qrxOHRnqYE5e0fGwv2b` | READY preview; not production | Three generated `vercel.app` aliases |
| `aura-core-yvov` | `prj_1hRrQ6FpODiHBT1ROgj63jbt4fx3` | CANCELED preview | Two generated `vercel.app` aliases |
| `aura-core-pv66` | `prj_L3GH6JVtzP8qsh6l7VYCS3laVAHW` | READY preview; not production | None |
| `aura-core-xvbn` | `prj_JlNtzYiJztrw8WcO6j0cdkB9A1XQ` | READY preview; not production | None |

The latest READY artifact on `aura-core` was created on 2026-07-11 from commit `053eca629b321feccf60420e6c6e611254f4f781`. It is not evidence that the current default commit is deployed.

At 2026-08-29 10:26 UTC:

- the newest `aura-core` preview health URL returned HTTP 402 with `DEPLOYMENT_DISABLED`;
- `https://aurcore.skygrid-protocol.net/api/health` returned the same HTTP 402;
- default commit `5bf88b9a3f0d834201c4df48613e7f4890b5f9d5` had five failed Vercel status contexts, one per duplicate project.

## Canonical target

Use `aura-core` as the candidate canonical project because it is the plainly named project and already owns stable generated aliases. This is a proposed operational choice, not proof that it currently owns the custom domain.

Do not delete projects, move domains, or disconnect Git integrations until the account owner confirms the canonical choice and the replacement production path passes the gates below.

## Recovery sequence

1. **Clear the account-level deployment block.** An authorized Vercel owner must inspect billing/account restrictions and settle or appeal them if necessary. Automation must not make a payment.
2. **Confirm the canonical project.** Record the selected project ID and environment owners in the private operations register.
3. **Attach and verify the custom domain.** Confirm DNS ownership and bind `aurcore.skygrid-protocol.net` to the canonical project.
4. **Deploy the current default commit.** The production deployment must identify the exact Git SHA. Do not promote the old July preview as current.
5. **Run smoke gates.**
   - `GET /api/health` returns 200;
   - response content type and product identity are correct;
   - receipt records UTC time, URL, deployment ID, commit SHA, status, and selected non-secret headers;
   - protected write routes still fail closed when credentials are absent;
   - no private value appears in logs or client output.
6. **Run feature-specific smoke tests.** PR #175 requires its own protected-environment Etherscan test before it can leave draft; do not use the general health check as substitute evidence.
7. **Reduce status noise.** After production passes and rollback is recorded, disconnect the duplicate projects from the GitHub repository or remove their GitHub status integrations. Deletion requires an explicit, reviewed decision.
8. **Preserve rollback.** Keep the last known-good production deployment ID and a tested rollback procedure.

## Production receipt template

```text
checked_at_utc:
domain:
path:
http_status:
content_type:
project_id:
deployment_id:
commit_sha:
environment:
identity_assertion:
fail_closed_checks:
operator:
evidence_location:
```

## Stop conditions

Stop promotion if the commit is not current, the domain maps to a different project, required environment values are missing, protected routes fail open, the response cannot identify the intended product, or billing/account state remains unresolved.
