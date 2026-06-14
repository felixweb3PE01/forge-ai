import 'dotenv/config';
import { ethers } from 'ethers';

export const CONTRACT_ADDRESSES = {
  talentRegistry: process.env.TALENT_REGISTRY_ADDRESS || null,
  decisionLog:    process.env.DECISION_LOG_ADDRESS    || null,
  escrow:         process.env.ESCROW_ADDRESS          || null,
  reputation:     process.env.REPUTATION_ADDRESS      || null,
  agentRegistry:  process.env.AGENT_REGISTRY_ADDRESS  || null,
};

const MANTLE_RPC  = process.env.MANTLE_RPC || 'https://rpc.sepolia.mantle.xyz';
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || null;
export const isLive = Object.values(CONTRACT_ADDRESSES).every(Boolean) && !!PRIVATE_KEY;

const ABIS = {
  talentRegistry: [
    "function register(string profileHash, string name, string role, uint8 experienceYears) external",
    "function isRegistered(address wallet) external view returns (bool)",
  ],
  decisionLog: [
    "function record(string agentId, uint256 projectId, uint8 action, bytes32 dataHash, uint8 matchScore) external returns (uint256)",
  ],
  escrow: [
    "function createEscrow(address contributor, string[] milestoneTitles, uint256[] milestonePayments) external payable returns (uint256)",
    "function approveMilestone(uint256 escrowId, uint256 milestoneIndex) external",
  ],
  reputation: [
    "function initialize(address subject, uint8 role) external",
    "function update(address subject, int256 delta, uint256 projectId, string reason) external",
    "function isRegistered(address subject) external view returns (bool)",
  ],
  agentRegistry: [
    "function recordAction(string agentId, uint8 actionType, uint256 projectId, uint8 outcome) external",
  ],
};

let provider, signer, contracts = {};
if (isLive) {
  provider = new ethers.JsonRpcProvider(MANTLE_RPC);
  signer   = new ethers.Wallet(PRIVATE_KEY, provider);
  for (const [key, abi] of Object.entries(ABIS)) {
    contracts[key] = new ethers.Contract(CONTRACT_ADDRESSES[key], abi, signer);
  }
  console.log('[Contracts] LIVE — connected to Mantle ✓');
} else {
  console.log('[Contracts] MOCK mode');
}

function randomHex(len) { return [...Array(len)].map(()=>Math.floor(Math.random()*16).toString(16)).join(''); }
function mockTx() { return { txHash:'0x'+randomHex(64), block:4821033+Math.floor(Math.random()*1000) }; }

const ActionType = { EVALUATE:0, NEGOTIATE:1, VERIFY_MILESTONE:2, UPDATE_REPUTATION:3, ORCHESTRATE:4 };
const RoleEnum   = { CONTRIBUTOR:0, CLIENT:1, AGENT:2 };

export async function registerContributor(address, profileHash, name='Unknown', role='Contributor', years=1) {
  if (isLive) {
    const tx = await contracts.talentRegistry.register(profileHash, name, role, years);
    const r  = await tx.wait();
    return { success:true, txHash:tx.hash, block:r.blockNumber, contractAddress:CONTRACT_ADDRESSES.talentRegistry };
  }
  return { success:true, ...mockTx(), contractAddress:'MOCK_TALENT_REGISTRY' };
}

export async function getContributorProfile(address) {
  return { address, profileHash:'0x'+randomHex(32), repScore:(4+Math.random()).toFixed(1), projectsCompleted:Math.floor(Math.random()*20), verified:true };
}

export async function logDecision({ agentId, projectId, action, data, matchScore=0 }) {
  if (isLive) {
    const payload  = JSON.stringify({ agentId, projectId, action, data, ts:Date.now() });
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(payload));
    const aNum     = ActionType[action] ?? 4;
    const score    = Math.min(Math.max(Math.round(matchScore||0),0),100);
    const tx = await contracts.decisionLog.record(agentId, projectId||0, aNum, dataHash, score);
    const r  = await tx.wait();
    return { success:true, txHash:tx.hash, block:r.blockNumber, decisionHash:dataHash, contractAddress:CONTRACT_ADDRESSES.decisionLog };
  }
  const hash = '0x'+randomHex(64);
  return { success:true, decisionHash:hash, ...mockTx(), contractAddress:'MOCK_DECISION_LOG' };
}

export async function lockEscrow({ projectId, clientAddress, amount, milestones }) {
  if (isLive) {
    const titles   = milestones.map(m=>m.title||m);
    const perMs    = (parseFloat(amount)/milestones.length).toFixed(6);
    const payments = milestones.map(()=>ethers.parseEther(perMs));
    const value    = ethers.parseEther(String(amount));
    const tx = await contracts.escrow.createEscrow(clientAddress, titles, payments, { value });
    const r  = await tx.wait();
    return { success:true, escrowId:r.logs?.[0]?.args?.[0]?.toString()||'1', txHash:tx.hash, block:r.blockNumber };
  }
  return { success:true, escrowId:'ESC-'+randomHex(8).toUpperCase(), ...mockTx() };
}

export async function releaseMilestonePayment({ escrowId, milestoneIndex }) {
  if (isLive) {
    const tx = await contracts.escrow.approveMilestone(escrowId, milestoneIndex);
    const r  = await tx.wait();
    return { success:true, txHash:tx.hash, block:r.blockNumber };
  }
  return { success:true, ...mockTx() };
}

export async function updateReputation({ address, role, delta, projectId, reason }) {
  if (isLive) {
    const registered = await contracts.reputation.isRegistered(address).catch(()=>false);
    if (!registered) { const t = await contracts.reputation.initialize(address, RoleEnum[role]??0); await t.wait(); }
    const scaledDelta = Math.round((delta||0)*100);
    const tx = await contracts.reputation.update(address, scaledDelta, projectId||0, reason||'');
    const r  = await tx.wait();
    return { success:true, txHash:tx.hash, block:r.blockNumber };
  }
  return { success:true, ...mockTx() };
}

export async function recordAgentAction({ agentId, actionType, projectId, outcome }) {
  if (isLive) {
    const a = ActionType[actionType]??4;
    const o = ['SUCCESS','RANKED','APPROVE','AGREEMENT_GENERATED'].includes(outcome)?0:outcome==='FAILURE'?1:2;
    const tx = await contracts.agentRegistry.recordAction(agentId, a, projectId||0, o);
    const r  = await tx.wait();
    return { success:true, txHash:tx.hash, block:r.blockNumber };
  }
  return { success:true, ...mockTx() };
}
