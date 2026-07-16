# SKYGRID Milestone Funding Vault

`SkygridMilestoneVault` is the first contract in the SKYGRID funding layer. It accepts one approved ERC-20 payment asset for one defined pilot, holds the complete pilot budget, and resolves each milestone through either:

- release after approval by the configured approval Safe, or
- refund to the sponsor after the milestone deadline.

It does **not** issue a token, promise returns, price SKYGRID work autonomously, or move emergency data. The SKYGRID Emergency Data On-Ramp remains operationally separate from financial execution.

## Security model

Use contract addresses controlled by multisignature wallets for:

- `governance`: contract administration and emergency pause
- `approver`: milestone review and release authorization
- `beneficiaryTreasury`: net pilot proceeds
- `platformTreasury`: disclosed SKYGRID platform fees

The sponsor is the only account permitted to fund or claim expired milestone refunds.

Important properties:

- full budget must be funded in one transaction
- fee-on-transfer payment assets are rejected during funding
- milestone evidence is stored only as a hash
- sensitive reports remain encrypted and off-chain
- releases stop after each milestone deadline
- unresolved milestones become refundable after their deadlines
- emergency pause blocks funding and release, but never blocks expired refunds
- payment-token recovery by governance is prohibited
- native currency deposits are rejected
- platform fee is disclosed at deployment and capped at 10%

The intended initial SKYGRID fee is `350` basis points, or **3.5%**, paid to the configured platform treasury. Any founder or contractor allocation should be handled under a separately reviewed treasury policy or revenue-router contract rather than a personal withdrawal path in this vault.

## Project structure

```text
contracts/skygrid-funding/
├── foundry.toml
├── remappings.txt
├── src/
│   └── SkygridMilestoneVault.sol
└── test/
    └── SkygridMilestoneVault.t.sol
```

## Install and test — PowerShell

Install Foundry first, then run:

```powershell
cd .\contracts\skygrid-funding

New-Item -ItemType Directory -Force -Path .\lib | Out-Null

git clone --depth 1 --branch v5.4.0 `
  https://github.com/OpenZeppelin/openzeppelin-contracts.git `
  .\lib\openzeppelin-contracts

git clone --depth 1 --branch v1.10.0 `
  https://github.com/foundry-rs/forge-std.git `
  .\lib\forge-std

forge fmt --check
forge test -vvv
```

To rerun without recloning dependencies:

```powershell
cd .\contracts\skygrid-funding
forge test -vvv
```

## Constructor inputs

| Input | Purpose |
|---|---|
| `projectId` | Hash identifying the signed pilot agreement |
| `paymentToken` | Approved standard ERC-20 stablecoin |
| `sponsor` | Account funding the pilot and receiving eligible refunds |
| `beneficiaryTreasury` | Safe receiving net milestone proceeds |
| `platformTreasury` | Safe receiving disclosed platform fees |
| `governance` | Safe holding admin and pause authority |
| `approver` | Safe authorized to validate and release milestones |
| `platformFeeBps` | Fee in basis points; `350` = 3.5% |
| `fundingDeadline` | Last timestamp at which initial funding is accepted |
| `milestoneAmounts` | Gross payment assigned to each milestone |
| `milestoneDeadlines` | Strictly increasing release/refund boundaries |

## Evidence procedure

For every release:

1. Build the PNPK or pilot evidence package off-chain.
2. Remove or encrypt operationally sensitive information.
3. Hash the final evidence package.
4. Record the approval decision through the approval Safe.
5. Call `releaseMilestone()` with the evidence hash and approval reference.

The contract records integrity proofs, amounts, and resolution status—not emergency payload contents.

## Deployment gate

Do not deploy this vault with real funds until all of the following are recorded:

- signed pilot agreement
- approved stablecoin and chain
- sponsor address
- beneficiary, platform, governance, and approval Safe addresses
- milestone amounts and deadlines
- refund language matching the signed agreement
- independent contract review
- testnet deployment and end-to-end rehearsal

The contract is EVM-compatible and intentionally chain-neutral. SKYGRID can select Scroll for canonical treasury/ledger use or Base USDC for an approved payment rail without changing the vault logic. No production deployment is included in this change.
