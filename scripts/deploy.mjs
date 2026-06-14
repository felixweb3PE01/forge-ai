import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MNT");

  const addresses = {};

  console.log("\n[1/5] Deploying TalentRegistry...");
  const TalentRegistry = await hre.ethers.getContractFactory("TalentRegistry");
  const talentRegistry = await TalentRegistry.deploy();
  await talentRegistry.waitForDeployment();
  addresses.talentRegistry = await talentRegistry.getAddress();
  console.log("TalentRegistry:", addresses.talentRegistry);

  console.log("\n[2/5] Deploying DecisionLog...");
  const DecisionLog = await hre.ethers.getContractFactory("DecisionLog");
  const decisionLog = await DecisionLog.deploy();
  await decisionLog.waitForDeployment();
  addresses.decisionLog = await decisionLog.getAddress();
  console.log("DecisionLog:", addresses.decisionLog);

  console.log("\n[3/5] Deploying EscrowContract...");
  const EscrowContract = await hre.ethers.getContractFactory("EscrowContract");
  const escrow = await EscrowContract.deploy();
  await escrow.waitForDeployment();
  addresses.escrow = await escrow.getAddress();
  console.log("EscrowContract:", addresses.escrow);

  console.log("\n[4/5] Deploying ReputationContract...");
  const ReputationContract = await hre.ethers.getContractFactory("ReputationContract");
  const reputation = await ReputationContract.deploy();
  await reputation.waitForDeployment();
  addresses.reputation = await reputation.getAddress();
  console.log("ReputationContract:", addresses.reputation);

  console.log("\n[5/5] Deploying AgentRegistry...");
  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy();
  await agentRegistry.waitForDeployment();
  addresses.agentRegistry = await agentRegistry.getAddress();
  console.log("AgentRegistry:", addresses.agentRegistry);

  console.log("\nRegistering FORGE-AGENT-001...");
  await agentRegistry.registerAgent("FORGE-AGENT-001", deployer.address, "TIER_1");
  console.log("Agent registered.");

  const output = {
    network:   hre.network.name,
    deployer:  deployer.address,
    timestamp: new Date().toISOString(),
    contracts: addresses,
  };

  const outPath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log("\nAddresses saved to deployed-addresses.json");

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
