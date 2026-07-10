# Contributing to Aura-Core / SKYGRID Emergency Data On-Ramp

This repository uses a lightweight task-branch workflow so SKYGRID work can move quickly without breaking the deployable `MVPuknowme` branch.

## Operating rule

`MVPuknowme` is the stable deployment branch. Do not do feature work directly on it. Create a task branch, commit small verified changes, open a pull request, review it, then merge after checks pass.

## Branching strategy

Use short task branches named by purpose:

- `feature/<short-name>` for new runtime, dashboard, or ramp capability
- `fix/<short-name>` for bug fixes
- `docs/<short-name>` for documentation-only changes
- `test/<short-name>` for Postman, smoke, or CI test changes
- `hotfix/<short-name>` for urgent production repair

Examples:

```powershell
git checkout MVPuknowme
git pull origin MVPuknowme
git checkout -b fix/vercel-health-route
```

Merge direction:

```text
feature/fix/docs/test branch -> pull request -> MVPuknowme -> Vercel/AWS/Postman validation
```

## Small-change cadence

Keep each pull request focused on one operational outcome. A good SKYGRID PR should be easy to answer in one sentence, for example:

- "Restore `/api/health` response for Vercel smoke checks."
- "Add Postman validation for emergency intake acceptance."
- "Document Vercel protection bypass secret setup."

Commit whenever you have a working set of code and tests. Push task branches early so progress is visible and duplicate work is avoided.

## Commit message convention

Commit messages must explain intent, not just file movement.

Preferred pattern:

```text
<area>: <why this change exists>
```

Areas may include `api`, `vercel`, `aws`, `postman`, `docs`, `ci`, `security`, `web3`, or `runtime`.

Good examples:

```text
api: restore health route for protected Vercel smoke checks
postman: add emergency intake acceptance proof request
docs: explain SKYGRID Emergency Data On-Ramp deployment split
ci: fail smoke workflow when deployment protection blocks public routes
```

Avoid vague messages such as:

```text
fix stuff
update files
improve code
changes
```

## Pull request rules

Every pull request should include:

1. What changed.
2. Why it changed.
3. How it was tested.
4. Any deployment, secret, domain, or protection setting affected.
5. Whether it touches B12 frontend, Vercel API/Web3 proxy, Postman tests, or AWS emergency backend.

Use draft pull requests for work in progress. Mark ready for review only after local checks pass.

## Review checklist

Before merge, check:

- The PR targets `MVPuknowme` unless there is a documented reason not to.
- The branch name matches its purpose.
- The commit messages explain intent.
- The change is small enough to review without guesswork.
- API routes preserve the SKYGRID Emergency Data On-Ramp language.
- No secrets, private keys, seed phrases, tokens, or raw credentials are committed.
- Postman or smoke checks are updated when routes change.
- Deployment-impacting changes mention Vercel, AWS, B12, or DNS implications.

## Suggested local PowerShell flow

```powershell
cd E:\Aura-core

git status
git checkout MVPuknowme
git pull origin MVPuknowme

git checkout -b fix/short-operational-name
# edit files

git status
git add <files>
git commit -m "api: explain why this fix exists"
git push -u origin fix/short-operational-name
```

Then open a pull request into `MVPuknowme`, run checks, review, and merge.

## Emergency hotfix rule

For urgent production repair, use `hotfix/<short-name>`, keep the diff minimal, test the exact failing endpoint, and include rollback notes in the pull request.
