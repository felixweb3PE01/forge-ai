// scripts/deploy.js
// Run: npx hardhat run scripts/deploy.js --network mantle_testnet

const hre = require("hardhat");
const fs  = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "MNT");

  const addresses = {};

  // 1. TalentRegistry
  console.log("\n[1/5] Deploying TalentRegistry...");
  const TalentRegistry = await hre.ethers.getContractFactory("TalentRegistry");
  const talentRegistry = await TalentRegistry.deploy();
  await talentRegistry.waitForDeployment();
  addresses.talentRegistry = await talentRegistry.getAddress();
  console.log("TalentRegistry:", addresses.talentRegistry);

  // 2. DecisionLog
  console.log("\n[2/5] Deploying DecisionLog...");
  const DecisionLog = await hre.ethers.getContractFactory("DecisionLog");
  const decisionLog = await DecisionLog.deploy();
  await decisionLog.waitForDeployment();
  addresses.decisionLog = await decisionLog.getAddress();
  console.log("DecisionLog:", addresses.decisionLog);

  // 3. EscrowContract
  console.log("\n[3/5] Deploying EscrowContract...");
  const EscrowContract = await hre.ethers.getContractFactory("EscrowContract");
  const escrow = await EscrowContract.deploy();
  await escrow.waitForDeployment();
  addresses.escrow = await escrow.getAddress();
  console.log("EscrowContract:", addresses.escrow);

  // 4. ReputationContract
  console.log("\n[4/5] Deploying ReputationContract...");
  const ReputationContract = await hre.ethers.getContractFactory("ReputationContract");
  const reputation = await ReputationContract.deploy();
  await reputation.waitForDeployment();
  addresses.reputation = await reputation.getAddress();
  console.log("ReputationContract:", addresses.reputation);

  // 5. AgentRegistry
  console.log("\n[5/5] Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  addresses.agentRegistry = await agentRegistry.getAddress();
  console.log("AgentRegistry:", addresses.agentRegistry);

  // Register the default Forge agent
  console.log("\nRegistering FORGE-AGENT-001...");
  await agentRegistry.registerAgent("FORGE-AGENT-001", deployer.address, "TIER_1");
  console.log("Agent registered.");

  // Save addresses to file
  const output = {
    network:   hre.network.name,
    deployer:  deployer.address,
    timestamp: new Date().toISOString(),
    contracts: addresses,
  };

  const outPath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log("\nAddresses saved to deployed-addresses.json");

  // Print .env lines to copy
  console.log("\n─────────────────────────────────────────");
  console.log("Add these to your .env file:");
  console.log("─────────────────────────────────────────");
  console.log(`TALENT_REGISTRY_ADDRESS=${addresses.talentRegistry}`);
  console.log(`DECISION_LOG_ADDRESS=${addresses.decisionLog}`);
  console.log(`ESCROW_ADDRESS=${addresses.escrow}`);
  console.log(`REPUTATION_ADDRESS=${addresses.reputation}`);
  console.log(`AGENT_REGISTRY_ADDRESS=${addresses.agentRegistry}`);
  console.log("─────────────────────────────────────────\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
