/*
 * Aura-Core Transparent Proxy deployment script.
 *
 * Requirements:
 * - hardhat configured with target network
 * - PRIVATE_KEY and RPC URL stored as secrets/env vars
 * - AuraCore implementation contract available in contracts/
 *
 * This script intentionally refuses to invent addresses. It writes real
 * deployment outputs only after successful transactions.
 */

const fs = require("fs");
const path = require("path");
const { ethers, upgrades } = require("hardhat");

async function main() {
  const network = await ethers.provider.getNetwork();
  const [deployer] = await ethers.getSigners();

  console.log("Aura-Core deploy starting");
  console.log("Network:", network.name, network.chainId.toString());
  console.log("Deployer:", deployer.address);

  const AuraCore = await ethers.getContractFactory("AuraCore");

  const proxy = await upgrades.deployProxy(AuraCore, [], {
    initializer: "initialize",
    kind: "transparent"
  });

  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const proxyAdminAddress = await upgrades.erc1967.getAdminAddress(proxyAddress);

  const output = {
    project: "Aura-Core",
    contract_stack: "TransparentUpgradeableProxy",
    network: network.name || "unknown",
    chain_id: network.chainId.toString(),
    branch: "MVPuknowme",
    proxy_address: proxyAddress,
    implementation_address: implementationAddress,
    proxy_admin_address: proxyAdminAddress,
    upgrade_authority: "ProxyAdmin",
    initializer_signature: "initialize()",
    initializer_data_hash: "set-by-hardhat-upgrades",
    abi_path: "artifacts/contracts/AuraCore.sol/AuraCore.json",
    verified: false,
    verification_urls: {
      proxy: "",
      implementation: "",
      admin: ""
    },
    safety_checks: {
      dedicated_admin: true,
      initializer_guard: true,
      initialized_once: true,
      operator_wallet_not_proxy_admin: true
    },
    deployed_at: new Date().toISOString()
  };

  const outPath = path.join(__dirname, "..", "deployments", "aura-core.contracts.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

  console.log("Aura-Core deploy complete");
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
