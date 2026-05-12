# Wallet Connection Safety Gate

This document defines the safe wallet-connection posture for Aura-Core / SkyGrid.

## Status

Manual operator approval required before any live wallet connection, signing request, token transfer, allowance approval, bridge operation, or production write.

## Safe rules

- Never commit seed phrases, private keys, recovery words, wallet exports, or raw signing material.
- Never auto-sign wallet messages from localhost or browser tools.
- Never approve token allowances without showing spender, chain, token, amount, and revocation path.
- Use read-only wallet connection first.
- Use environment variables or platform secret managers only for non-custodial API keys.
- Treat all wallet signatures as sensitive authorization events.
- Record only safe metadata: chain ID, wallet public address, request ID, status code, timestamp, and transaction hash after confirmation.

## Recommended connection flow

1. Open the wallet connection page manually.
2. Confirm the URL and chain ID.
3. Connect wallet in read-only mode first.
4. Verify displayed public address.
5. Run health checks before any write operation.
6. Require explicit operator approval for signing.
7. Log transaction hash only after broadcast.
8. Confirm success on the block explorer.

## Localhost tooling boundary

Localhost tools may help test connection flows, but they must not receive seed phrases, private keys, wallet backups, or unrestricted signing permissions.

## Production checkpoint

Before production use, confirm:

- Target chain
- Contract address
- Function name
- Spender address, if allowance is involved
- Token and amount
- Gas estimate
- Reversal or revocation path
- Public transaction hash after completion
