import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as agents from './agents/index.js';
import * as contracts from './contracts/mock.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.get('/health', (_, res) => {
  res.json({
    status: 'online',
    agent:  'FORGE-AGENT-001',
    model:  'llama-3.3-70b-versatile (Groq)',
    mode:   contracts.isLive ? 'LIVE on Mantle' : 'MOCK',
    contracts: {
      talentRegistry: contracts.CONTRACT_ADDRESSES.talentRegistry || 'MOCK',
      decisionLog:    contracts.CONTRACT_ADDRESSES.decisionLog    || 'MOCK',
      escrow:         contracts.CONTRACT_ADDRESSES.escrow         || 'MOCK',
      reputation:     contracts.CONTRACT_ADDRESSES.reputation     || 'MOCK',
      agentRegistry:  contracts.CONTRACT_ADDRESSES.agentRegistry  || 'MOCK',
    },
    timestamp: new Date().toISOString(),
  });
});

app.post('/agent/orchestrate', async (req, res) => {
  try {
    const { command, context = {} } = req.body;
    if (!command) return res.status(400).json({ error: 'command is required' });
    const result = await agents.orchestrate({ command, context });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/agent/evaluate', async (req, res) => {
  try {
    const { project, contributors } = req.body;
    if (!project || !contributors) return res.status(400).json({ error: 'project and contributors required' });
    const result = await agents.evaluate({ project, contributors });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/agent/negotiate', async (req, res) => {
  try {
    const { project, contributor, clientOffer, contributorOffer } = req.body;
    if (!project || !contributor || !clientOffer || !contributorOffer) return res.status(400).json({ error: 'missing fields' });
    const result = await agents.negotiate({ project, contributor, clientOffer, contributorOffer });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/agent/verify', async (req, res) => {
  try {
    const { project, milestone, submission, escrowId } = req.body;
    if (!project || !milestone || !submission) return res.status(400).json({ error: 'missing fields' });
    const result = await agents.verifyMilestone({ project, milestone, submission, escrowId });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/agent/reputation', async (req, res) => {
  try {
    const { project, contributor, client, outcome, feedback } = req.body;
    if (!project || !contributor || !client || !outcome) return res.status(400).json({ error: 'missing fields' });
    const result = await agents.updateReputation({ project, contributor, client, outcome, feedback });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/talent/register', async (req, res) => {
  try {
    const { address, profileHash } = req.body;
    if (!address) return res.status(400).json({ error: 'address required' });
    const result = await contracts.registerContributor(address, profileHash || '0x00');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/escrow/lock', async (req, res) => {
  try {
    const { projectId, clientAddress, amount, milestones } = req.body;
    if (!projectId || !clientAddress || !amount || !milestones) return res.status(400).json({ error: 'missing fields' });
    const result = await contracts.lockEscrow({ projectId, clientAddress, amount, milestones });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/escrow/release', async (req, res) => {
  try {
    const { escrowId, milestoneIndex, contributorAddress } = req.body;
    if (!escrowId || milestoneIndex === undefined || !contributorAddress) return res.status(400).json({ error: 'missing fields' });
    const result = await contracts.releaseMilestonePayment({ escrowId, milestoneIndex, contributorAddress });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Local dev only — Vercel uses the default export
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════╗
║  Forge AI Agent Server — ONLINE      ║
║  Port   : ${PORT}                       ║
║  Model  : llama-3.3-70b (Groq)       ║
║  Chain  : ${contracts.isLive ? 'Mantle LIVE ✓         ' : 'Mantle (mock)         '}║
╚══════════════════════════════════════╝
    `);
  });
}

export default app;