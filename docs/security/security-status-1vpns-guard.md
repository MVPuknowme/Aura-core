# SKYGRID Security Status — 1VPNS IOC Guard

Status: Deployed

Protection layers active:
- IOC vault entry added.
- Repo scanner added.
- GitHub Actions IOC Watch added.
- Local block guidance added.
- Production smoke test required after deployment.

Rule:
1VPNS / First VPN / Operation Saffron indicators are allowed only in approved security documentation and IOC vault files.

Public exposure:
These indicators should not appear in public UI, public routes, client bundles, app config, secrets, or runtime routes.

Next review:
Re-check after major deployments, dependency updates, or incident-response work.
