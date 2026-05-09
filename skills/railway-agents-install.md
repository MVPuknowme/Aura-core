# Skill: Install Railway CLI with Agents

## Purpose

Install the Railway CLI and enable Railway Agents for Aura-Core/SKYGRID deployment work.

## Command

```bash
bash <(curl -fsSL railway.com/install.sh) --agents -y
```

## Safety Notes

This command downloads and executes a remote shell installer. Use it only in a trusted development shell where you are comfortable installing the Railway CLI.

Before running, prefer inspecting the installer:

```bash
curl -fsSL railway.com/install.sh -o /tmp/railway-install.sh
less /tmp/railway-install.sh
bash /tmp/railway-install.sh --agents -y
```

## Post-install verification

```bash
railway --version
railway login
railway whoami
```

## Aura-Core Usage

Use this skill when preparing Railway-backed deployments, agent-capable environments, staging previews, and lightweight infrastructure demos.

## Do Not

- Do not commit Railway tokens.
- Do not paste secrets into logs.
- Do not run the installer inside production without a maintenance window.
- Do not assume this command deploys the app by itself; it only installs tooling.
