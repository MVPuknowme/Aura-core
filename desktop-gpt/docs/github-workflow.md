# Aura GitHub Workflow

Repository: MVPuknowme/Aura-core  
Local root: E:\Aura-core  
Primary branch: MVPuknowme  
Development branch: dev/aura-shield-ios-blocker  

## Safe rules

- Never force push.
- Never commit `.env.local`, `.runtime`, logs, private keys, API keys, seed phrases, wallet files, or payment secrets.
- Use `git status -sb` before every commit.
- Use `git pull --rebase --autostash` when remote changed.
- Push feature/dev work with `git push -u origin HEAD`.
- Merge into `MVPuknowme` only after branch status is clean.

## Proof cycle

1. Generate Postman collection from Aura Desktop.
2. Run Newman.
3. Confirm all approved SKYGRID routes are HTTP 200.
4. Commit generated proof collection/artifact.
5. Push dev branch.
6. Merge after review.
7. Deploy production.
8. Verify `/api/health`, `/api/compat/ios`, `/api/panels/summary`, and Newman.
