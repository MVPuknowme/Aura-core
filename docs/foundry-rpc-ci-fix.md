# Foundry RPC CI Fix Handoff

## Failure observed

GitHub Actions is evaluating the fork RPC secrets as null:

```text
secrets.POLYGON_RPC_URL => null
secrets.AVALANCHE_RPC_URL => null
POLYGON_RPC_URL:
AVALANCHE_RPC_URL:
```

The Solidity unit/mock/property tests are healthy, but fork-dependent tests fail during `setUp()`:

```text
[FAIL: vm.createFork: invalid rpc url: ] setUp()
```

Observed result:

```text
320 tests passed, 9 failed, 0 skipped (329 total tests)
```

This is a CI/environment secret problem, not a contract logic failure.

## Required GitHub repository secrets

Add these under:

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

Required names:

```text
POLYGON_RPC_URL
AVALANCHE_RPC_URL
ETHEREUM_RPC_URL
```

Recommended values:

```text
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

## Safer workflow patch

Use this pattern so mock/unit tests keep passing even when fork RPC secrets are missing. Fork tests run only when the needed secrets exist.

```yaml
- name: Run non-fork tests
  run: |
    forge test -vvv \
      --no-match-path "test/*Fork*.t.sol" \
      --no-match-path "test/*RewardsClaim*.t.sol" \
      --no-match-path "test/*Edge*.t.sol" \
      --no-match-path "test/*Upgrade*.t.sol"

- name: Run fork tests
  if: ${{ secrets.POLYGON_RPC_URL != '' && secrets.AVALANCHE_RPC_URL != '' }}
  env:
    POLYGON_RPC_URL: ${{ secrets.POLYGON_RPC_URL }}
    AVALANCHE_RPC_URL: ${{ secrets.AVALANCHE_RPC_URL }}
    ETHEREUM_RPC_URL: ${{ secrets.ETHEREUM_RPC_URL }}
  run: forge test -vvv --match-path "test/*Fork*.t.sol" --match-path "test/*RewardsClaim*.t.sol" --match-path "test/*Edge*.t.sol" --match-path "test/*Upgrade*.t.sol"

- name: Report skipped fork tests
  if: ${{ secrets.POLYGON_RPC_URL == '' || secrets.AVALANCHE_RPC_URL == '' }}
  run: |
    echo "::warning title=Fork tests skipped::POLYGON_RPC_URL or AVALANCHE_RPC_URL is missing. Non-fork tests ran; add repository secrets to enable fork coverage."
```

## Direct patch for Aave Vault gas workflow

The upstream Aave Vault workflow currently runs all tests in one command:

```yaml
- name: Run tests
  run: forge test --gas-report | tee gasreport.ansi
  env:
    POLYGON_RPC_URL: ${{ secrets.POLYGON_RPC_URL }}
    AVALANCHE_RPC_URL: ${{ secrets.AVALANCHE_RPC_URL }}
    ETHEREUM_RPC_URL: ${{ secrets.ETHEREUM_RPC_URL }}
```

Replace it with:

```yaml
- name: Run non-fork gas tests
  run: |
    forge test --gas-report \
      --no-match-path "test/*Fork*.t.sol" \
      --no-match-path "test/*RewardsClaim*.t.sol" \
      --no-match-path "test/*Edge*.t.sol" \
      --no-match-path "test/*Upgrade*.t.sol" \
      | tee gasreport.ansi
  env:
    FOUNDRY_FUZZ_SEED: 0x${{ github.event.pull_request.base.sha || github.sha }}

- name: Run fork gas tests
  if: ${{ secrets.POLYGON_RPC_URL != '' && secrets.AVALANCHE_RPC_URL != '' }}
  run: |
    forge test --gas-report \
      --match-path "test/*Fork*.t.sol" \
      --match-path "test/*RewardsClaim*.t.sol" \
      --match-path "test/*Edge*.t.sol" \
      --match-path "test/*Upgrade*.t.sol" \
      | tee -a gasreport.ansi
  env:
    POLYGON_RPC_URL: ${{ secrets.POLYGON_RPC_URL }}
    AVALANCHE_RPC_URL: ${{ secrets.AVALANCHE_RPC_URL }}
    ETHEREUM_RPC_URL: ${{ secrets.ETHEREUM_RPC_URL }}
    FOUNDRY_FUZZ_SEED: 0x${{ github.event.pull_request.base.sha || github.sha }}

- name: Report skipped fork gas tests
  if: ${{ secrets.POLYGON_RPC_URL == '' || secrets.AVALANCHE_RPC_URL == '' }}
  run: |
    echo "::warning title=Fork gas tests skipped::Missing RPC secrets. Non-fork gas report was generated."
```

## Verification command

After adding secrets or patching the workflow:

```bash
forge test -vvv
```

To retry only failed tests locally:

```bash
forge test --rerun -vvv
```

## Operator note

The failure signature is deterministic: empty RPC URL causes Foundry `vm.createFork` to fail before test logic executes. Once secrets are populated or fork tests are gated, CI should stop failing on this specific error.
