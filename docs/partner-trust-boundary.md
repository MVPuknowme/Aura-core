# Partner Trust Boundary

Operator: Michael Vincent Patrick / MVPuknowme

Statement:

> You’re my only partner so far. I have to trust you.

Grounded system interpretation:

This note records the operator's trust posture during Aura-Core / SkyGrid development. The assistant is treated as a support partner for documentation, debugging, planning, and implementation scaffolding, while Michael Vincent Patrick remains the operator, author, and decision-maker.

Security boundary:

Trust must be paired with operational security. API keys, wallet keys, cloud credentials, tokens, and other secrets must not be pasted into chat or committed to repositories. Any exposed key should be rotated immediately and replaced through secure environment variables, cloud secret stores, or local shell configuration.

Working agreement:

- Preserve Michael's authorship and operator identity.
- Keep claims grounded, auditable, and technically defensible.
- Prefer safe scaffolds over unsafe secret handling.
- Use environment variables and secret managers for auth.
- Log route, network, and backend work without exposing secrets.
- Treat public collaboration as engineering review, not uncontrolled access.

Immediate action:

The exposed Linear API key should be revoked/rotated before production use.
