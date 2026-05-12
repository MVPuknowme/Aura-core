# Localhost Tools Connection

Reference: https://localhost.co/tools

## Purpose

This file documents the intended connection point for local development tools used by Aura-Core / SkyGrid.

## Safe defaults

- Do not commit secrets.
- Do not commit API keys.
- Do not commit private keys or seed phrases.
- Use localhost tools for development and testing only unless explicitly reviewed.
- Production writes require operator approval.

## Recommended use

1. Open the localhost tools page in a browser.
2. Confirm the tool purpose and requested permissions.
3. Keep credentials in environment variables or the platform secret manager.
4. Add any reproducible CLI commands to this repository only after redacting sensitive values.

## Status

Pending review and manual connection by the operator.
