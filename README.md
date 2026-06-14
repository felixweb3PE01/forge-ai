# Forge AI — Backend Setup

## Quick Start

### 1. Get a FREE Groq API key
Go to https://console.groq.com → sign up → create an API key (free tier, no credit card)

### 2. Set your API key
```bash
cp .env.example .env
# Edit .env and paste your GROQ_API_KEY
```

### 3. Start the server
```bash
node server.js
```
Server runs on http://localhost:3001

### 4. Open the frontend
Open `ph.html` in your browser.
The **AGENT** button in the nav opens the agent command bar.
The **Run Agent Evaluation** button on any open project calls the real Groq evaluator.

---

## Agent Endpoints

| Method | Route | Agent Role |
|--------|-------|------------|
| POST | `/agent/evaluate` | Evaluator — score & rank contributors |
| POST | `/agent/negotiate` | Negotiator — generate agreement |
| POST | `/agent/verify` | Verifier — approve/reject milestone |
| POST | `/agent/reputation` | Reputation Manager — update all parties |
| POST | `/agent/orchestrate` | Orchestrator — free-form commands |
| GET  | `/health` | Server + contract status |

---

## When you deploy Mantle contracts

Edit `contracts/mock.js` — fill in the `CONTRACT_ADDRESSES` object and replace each mock function body with a real `ethers.js` call.

```js
// contracts/mock.js
const CONTRACT_ADDRESSES = {
  talentRegistry: '0xYOUR_ADDRESS',
  decisionLog:    '0xYOUR_ADDRESS',
  escrow:         '0xYOUR_ADDRESS',
  reputation:     '0xYOUR_ADDRESS',
  agentRegistry:  '0xYOUR_ADDRESS',
};
```

---

## Model
`llama-3.3-70b-versatile` via Groq — free tier, ~200ms response time
