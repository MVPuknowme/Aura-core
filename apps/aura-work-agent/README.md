# Aura Work Agent

Aura Work Agent connects Discord to an OpenAI Agents SDK runtime with narrowly scoped GitHub tools for **SKYGRID Emergency Data On-Ramp** and Aura-Core.

The Discord server invite is for people. Bots cannot accept normal server invitations; the bot must be installed through the Discord Developer Portal using its application install link.

## Capabilities

- `/aura` — general operational assistance
- `/github` — repository overview, open-issue review, approved issue creation, and approved issue/PR comments
- `/skygrid` — probes the configured SKYGRID status endpoint
- Direct messages and `@Aura` mentions through the Discord Gateway
- Explicit human approval for all GitHub writes
- Repository allowlist enforced by `GITHUB_ALLOWED_REPOS`
- Discord operator allowlist enforced by `DISCORD_OPERATOR_USER_IDS`

The first release intentionally does **not** merge pull requests, alter repository settings, change workflow permissions, delete content, or write repository files.

## Approval contract

Read operations may be requested normally:

```text
/github task: Summarize open issues in MVPuknowme/Aura-core
```

A write runs only when both conditions are true:

1. The invoking Discord user ID appears in `DISCORD_OPERATOR_USER_IDS`.
2. The request begins exactly with `APPROVE WRITE:`.

Example:

```text
/github task: APPROVE WRITE: Create an issue in MVPuknowme/Aura-core titled "Validate Discord agent deployment" with a verification checklist.
```

The OpenAI Agents SDK pauses sensitive tool calls and the runtime approves them only when those two conditions have already been satisfied.

## 1. Create the Discord application

1. Open the Discord Developer Portal and create an application named **Aura Work Agent**.
2. On **General Information**, copy the Application ID and Public Key.
3. On **Bot**, reset/copy the bot token. Treat it as a password.
4. Enable **Message Content Intent** only when you want normal mentions and direct-message text. Slash commands do not require the Gateway.
5. Under **Installation**, enable Guild Install with `applications.commands` and `bot` scopes.
6. Grant only the needed bot permissions: View Channels, Send Messages, Send Messages in Threads, Read Message History, Embed Links, Attach Files, and Add Reactions.
7. Use Discord's generated installation link to add the application to the work server.

Do not grant Administrator unless a future feature has a documented requirement for it.

## 2. Configure locally

PowerShell:

```powershell
Set-Location .\apps\aura-work-agent
Copy-Item .env.example .env.local
pnpm install
```

Fill `.env.local` with the existing server-side `OPENAI_API_KEY` and the Discord/GitHub credentials. Never commit `.env.local`.

Recommended GitHub fine-grained token scope:

- Repository access: only `MVPuknowme/Aura-core` and any deliberately added repositories
- Metadata: read
- Issues: read and write
- Pull requests: read and write only if PR comments are required
- Contents: read-only is sufficient for this release

Add your Discord numeric user ID to `DISCORD_OPERATOR_USER_IDS`. Enable Discord Developer Mode, right-click your user, and choose **Copy User ID**.

## 3. Register slash commands

For immediate testing, set `DISCORD_GUILD_ID` to the numeric server ID. Guild commands update immediately. Leaving it blank registers global commands, which may take longer to propagate.

```powershell
node --env-file=.env.local .\scripts\register-commands.mjs
```

## 4. Run locally

```powershell
pnpm dev
```

Check:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Discord must reach a public HTTPS webhook. For deployed testing, configure the Discord **Interactions Endpoint URL** as:

```text
https://YOUR-DEPLOYMENT/api/webhooks/discord
```

## 5. Deploy on Vercel

Create a separate Vercel project from the Aura-Core repository and set its **Root Directory** to:

```text
apps/aura-work-agent
```

Add all production environment variables from `.env.example`. Reuse the existing OpenAI key through the `OPENAI_API_KEY` environment variable; do not copy the key into code or Discord.

Set `REDIS_URL` for durable production state. Without Redis, the app intentionally falls back to in-memory state suitable only for local testing and one-shot interactions.

The included nine-minute Gateway cron supports mentions and regular messages on serverless infrastructure. The long-running cron route requires a Vercel plan that supports the configured function duration. Slash commands continue to work through HTTP Interactions even when the Gateway cron is disabled.

After deployment:

1. Set Discord's Interactions Endpoint URL to the production webhook.
2. Register commands using the production application credentials.
3. Open `/api/health` and confirm `ok: true`.
4. Run `/skygrid` and a read-only `/github` request.
5. Test a write with a harmless issue only after verifying the operator allowlist.

## Security boundaries

- Secrets are environment variables only.
- Discord requests are signature-verified by the Discord Chat SDK adapter.
- GitHub repository access is deny-by-default outside `GITHUB_ALLOWED_REPOS`.
- GitHub writes require the SDK approval interruption plus the local operator gate.
- The health endpoint reports missing variable names, never values.
- Responses are truncated for Discord's message limits.
