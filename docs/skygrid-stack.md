# SkyGrid Platinum Stack

Operator: Michael Vincent Patrick / MVPuknowme  
System: SkyGrid powered by Aura-Core™  
Mode: staged infrastructure / manual-signing-only wallet operations

## 1. Public Presentation Layer

**B12**
- Public marketing site
- Funding narrative
- Idle Capacity Marketplace copy
- Node leasing and partner onboarding

**Vercel**
- Static public site
- `/api/health`
- `/api/rev/status` target
- Proof links and share routes

## 2. Application Layer

**Node.js 20**
- Primary runtime
- GitHub Actions runner compatibility
- AWS validator staging runtime

**Express**
- Local ETH dashboard
- Health route
- Future telemetry API surface

Current local entrypoint:

```bash
node dashboard/eth-dashboard-local.js
```

Local routes:

```text
/              -> Express localhost test
/eth-dashboard -> SkyGrid ETH Dashboard
/health        -> JSON health check
```

## 3. Wallet / Web3 Layer

**Rainbow Wallet**
- Operator wallet connection
- Manual signing only
- No custody
- No seed phrase collection
- No private key collection

Configured destination:

```text
0xbAA5A03bC268546194550a427d3F1d5787c15403
```

Dependencies:

```bash
npm install ethers wagmi viem @rainbow-me/rainbowkit
```

Roles:
- `@rainbow-me/rainbowkit` -> wallet UI
- `wagmi` -> wallet hooks/session logic
- `viem` -> typed EVM RPC/client layer
- `ethers` -> EVM utility compatibility

Supported EVM lanes:
- Ethereum
- Scroll
- Base
- Arbitrum
- Optimism

## 4. AWS Validator Layer

**AWS Region**
- Primary staging: `us-east-1`
- Optional west lane: `us-west-2`

Recommended services:

```text
EC2 or ECS -> validator runner
SSM -> remote command execution
CloudWatch -> logs and metrics
DynamoDB -> nonce/state replay protection
S3 -> append-only reports and artifacts
IAM/OIDC -> least-privilege deployment boundary
```

GitHub workflow:

```text
.github/workflows/aws-skygrid-validator-clone.yml
```

Purpose:
- Clone `MVPuknowme/Aura-core`
- Install dependencies
- Run validator checks
- Verify production state
- Verify Postman integration reference
- Generate AWS validator plan artifact

## 5. Validator / Revenue Proof Layer

Klamath validator source verification:

```bash
node scripts/verify-klamath-validator-profit.mjs
```

Current verified gross output:

```text
Weekly USDC: $945.00
Weekly ETH: 0.317940 ETH
Monthly USDC projection: $4,095.00
Annualized USDC projection: $49,140.00
Annualized ETH projection: 16.532880 ETH
```

Accounting status:

```text
gross-output-only
net profit pending expense reconciliation
```

## 6. Integration / Proof Layer

**GitHub**
- Source control
- CI proof
- Issues
- Deployment workflows
- Audit trail

**Postman**
- API route testing
- Control-layer request reference
- Route validation

Configured reference:

```text
config/integrations/postman-skygrid-control.json
```

Verifier:

```bash
node scripts/verify-postman-integration.mjs
```

## 7. Safety Boundary

Required rules:

```text
No private keys in GitHub
No seed phrases in chat, GitHub, AWS, Postman, Airtable, or Linear
No auto-transfer
No auto-approve
No blind signing
Manual wallet signature required
Verify chain ID before transaction
Verify token contract before transfer
Record transaction hash after manual transfer
```

## 8. Operating Model

Priority stack:

```text
1. Emergency failover
2. Network health and telemetry
3. Validator/proof operations
4. Community support workloads
5. Idle compute and lease campaigns
```

Tagline:

```text
Emergency-first. Green by default. Productive when idle.
```

## 9. Current Status

```text
Public site: staged
AWS validator lane: staged
Rainbow wallet route: configured destination only
ETH dashboard: local staging
Postman reference: staged
Klamath validator gross output: verified from CSV
Transfers: not executed
Wallet signing: operator-only
```
