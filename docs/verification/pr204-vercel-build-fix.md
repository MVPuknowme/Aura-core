# PR #204 primary Vercel build repair

## Reproduced failure

Primary Vercel project `aura-core` failed after PR #204 because its project-level build path invoked `xmcp build --vercel`. XMCP then required `/vercel/path0/src/tools`, which Aura-Core does not use.

## Repair

Repository-level `vercel.json` pins the deployment to the existing Aura-Core build contract:

- install: `pnpm install --frozen-lockfile`
- build: `pnpm run build`

This does not alter Speak research boundaries, PNPK execution authority, payment controls, production failover controls, or runtime routing policy.

## Green criteria

The primary `Vercel – aura-core` check must complete successfully and its build log must show `pnpm run build` rather than `xmcp build --vercel`.
