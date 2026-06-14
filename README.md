# Forge AI 🔥

> **The Operating System for Autonomous Hiring on Mantle**

Forge AI is a RealClaw-powered talent orchestration network that autonomously discovers, evaluates, negotiates with, and manages contributors while securing payments, reputation, and agent accountability on Mantle.

**Live Demo:** https://forgenetwork.vercel.app

---

## Architecture

```
Frontend (HTML/JS/Tailwind)
    ↓
Vercel Serverless API
    ↓
Groq AI (llama-3.3-70b-versatile)  ←→  Mantle Smart Contracts
```

---

## 5 Agent Roles

| Agent | Role |
|-------|------|
| **ATLAS** (Evaluator) | Scores & ranks contributors against project requirements |
| **VECTOR** (Negotiator) | Generates structured agreements between parties |
| **NEXUS** (Verifier) | Reviews milestone submissions, triggers escrow release |
| **ORACLE** (Reputation Manager) | Updates rep scores for contributors, clients, and agents on-chain |
| **FORGE-AGENT-001** (Orchestrator) | Routes free-form commands to the right sub-agent |

---

## Smart Contracts (Mantle Sepolia Testnet)

| Contract | Address |
|----------|---------|
| TalentRegistry | `0x870DcC88a1dCafca357D0635b77F07Df900CbeE9` |
| DecisionLog | `0x312320C074B4d5423334E468b834B559435d86a3` |
| EscrowContract | `0x651e333813c88357194319C404eE5B7D0A7D81B8` |
| ReputationContract | `0x185C130B3559C8b33492003378BD33b1c234c466` |
| AgentRegistry | `0xBE61Fbd302417ecfD27AAfe340D1Ee339b28c039` |

---

## Tech Stack

- **Frontend:** HTML, Tailwind CSS, Vanilla JS
- **AI Agent:** Groq API (llama-3.3-70b-versatile) — free tier
- **Backend:** Vercel Serverless Functions (Node.js ESM)
- **Blockchain:** Mantle Sepolia Testnet
- **Smart Contracts:** Solidity 0.8.20, Hardhat
- **Wallet:** MetaMask, WalletConnect, Coinbase Wallet

---

## Local Setup

### Prerequisites
- Node.js v18+
- MetaMask wallet
- Free Groq API key from [console.groq.com](https://console.groq.com)

### Run locally

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/forge-ai
cd forge-ai

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your GROQ_API_KEY and DEPLOYER_PRIVATE_KEY to .env

# Start agent server
node server.js

# Open public/index.html in browser
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add environment variables on Vercel dashboard:
- `GROQ_API_KEY`
- `DEPLOYER_PRIVATE_KEY`
- `MANTLE_RPC`
- `TALENT_REGISTRY_ADDRESS`
- `DECISION_LOG_ADDRESS`
- `ESCROW_ADDRESS`
- `REPUTATION_ADDRESS`
- `AGENT_REGISTRY_ADDRESS`

---

## Deploy Contracts

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat run scripts/deploy.mjs --network mantle_testnet
```

---

## User Flow

1. **Connect Wallet** → Choose role (Founder or Contributor) — one wallet, one role
2. **Founder** → Post project with skills, budget, milestones
3. **Agent Evaluates** → ATLAS scores all contributors, logs decision hash to Mantle
4. **Negotiate** → VECTOR generates structured agreement
5. **Escrow** → Client locks MNT, funds held until milestones approved
6. **Verify** → NEXUS reviews submissions, releases payment on approval
7. **Reputation** → ORACLE updates all parties on-chain, including agent rep

---

## Track

**Agentic Economy Track — RealClaw Real-Life Expansion**

Forge AI takes RealClaw beyond DeFi into a real-world hiring ecosystem, creating verifiable AI reputation and autonomous talent management on Mantle.
