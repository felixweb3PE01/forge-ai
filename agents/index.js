import Groq from 'groq-sdk';
import * as contracts from '../contracts/mock.js';

const groq    = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL   = 'llama-3.3-70b-versatile';
const AGENT_ID = 'FORGE-AGENT-001';

async function chat(systemPrompt, userPrompt) {
  const res = await groq.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    max_tokens: 1024,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
  });
  return res.choices[0].message.content.trim();
}

function parseJSON(text) {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ||
                  text.match(/```\s*([\s\S]*?)```/)     ||
                  [null, text];
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

export async function evaluate({ project, contributors }) {
  const system = `You are the Forge AI Evaluator Agent (ID: ${AGENT_ID}).
Score and rank contributors for a project. Respond ONLY with valid JSON, no markdown.
JSON shape: {"rankings":[{"contributorId":"string","name":"string","matchScore":number,"strengths":["string"],"weaknesses":["string"],"recommendation":"string"}],"topPick":"contributorId","agentReasoning":"string"}`;

  const raw  = await chat(system, `PROJECT:\n${JSON.stringify(project,null,2)}\n\nCONTRIBUTORS:\n${JSON.stringify(contributors,null,2)}`);
  const data = parseJSON(raw) || { raw };

  const log = await contracts.logDecision({ agentId: AGENT_ID, projectId: project.id, action: 'EVALUATE', data: { topPick: data.topPick }, matchScore: data.rankings?.[0]?.matchScore || 0 });
  await contracts.recordAgentAction({ agentId: AGENT_ID, actionType: 'EVALUATE', projectId: project.id, outcome: 'RANKED' });

  return { agent: 'EVALUATOR', result: data, onChain: log };
}

export async function negotiate({ project, contributor, clientOffer, contributorOffer }) {
  const system = `You are the Forge AI Negotiator Agent (ID: ${AGENT_ID}).
Mediate between client and contributor to produce a fair agreement. Respond ONLY with valid JSON, no markdown.
JSON shape: {"agreedTerms":{"budget":"string","currency":"MNT","timeline":"string","deliverables":["string"],"milestones":[{"id":"M1","title":"string","deliverable":"string","payment":"string","deadline":"string"}]},"agreementText":"string","negotiationNotes":"string"}`;

  const raw  = await chat(system, `PROJECT:${JSON.stringify(project)}\nCONTRIBUTOR:${JSON.stringify(contributor)}\nCLIENT OFFER:${JSON.stringify(clientOffer)}\nCONTRIBUTOR OFFER:${JSON.stringify(contributorOffer)}`);
  const data = parseJSON(raw) || { raw };

  const log = await contracts.logDecision({ agentId: AGENT_ID, projectId: project.id, action: 'NEGOTIATE', data: { agreedBudget: data.agreedTerms?.budget }, matchScore: 0 });
  await contracts.recordAgentAction({ agentId: AGENT_ID, actionType: 'NEGOTIATE', projectId: project.id, outcome: 'AGREEMENT_GENERATED' });

  return { agent: 'NEGOTIATOR', result: data, onChain: log };
}

export async function verifyMilestone({ project, milestone, submission, escrowId }) {
  const system = `You are the Forge AI Verifier Agent (ID: ${AGENT_ID}).
Review a milestone submission and decide APPROVE or REJECT. Respond ONLY with valid JSON, no markdown.
JSON shape: {"decision":"APPROVE"|"REJECT","confidence":number,"checklist":[{"criterion":"string","passed":boolean,"note":"string"}],"feedback":"string","escrowAction":"RELEASE"|"HOLD"}`;

  const raw  = await chat(system, `PROJECT:${JSON.stringify(project)}\nMILESTONE:${JSON.stringify(milestone)}\nSUBMISSION:${JSON.stringify(submission)}`);
  const data = parseJSON(raw) || { raw };

  let escrowResult = null;
  if (data.escrowAction === 'RELEASE' && escrowId) {
    escrowResult = await contracts.releaseMilestonePayment({ escrowId, milestoneIndex: milestone.index || 0, contributorAddress: submission.contributorAddress || '0x0000' });
  }

  const log = await contracts.logDecision({ agentId: AGENT_ID, projectId: project.id, action: 'VERIFY_MILESTONE', data: { milestoneId: milestone.id, decision: data.decision }, matchScore: data.confidence });
  await contracts.recordAgentAction({ agentId: AGENT_ID, actionType: 'VERIFY', projectId: project.id, outcome: data.decision });

  return { agent: 'VERIFIER', result: data, escrow: escrowResult, onChain: log };
}

export async function updateReputation({ project, contributor, client, outcome, feedback }) {
  const system = `You are the Forge AI Reputation Manager Agent (ID: ${AGENT_ID}).
Calculate fair reputation deltas for all parties after project completion. Respond ONLY with valid JSON, no markdown.
JSON shape: {"contributorDelta":number,"clientDelta":number,"agentDelta":number,"contributorSummary":"string","clientSummary":"string","agentSummary":"string","badges":["string"]}`;

  const raw  = await chat(system, `PROJECT:${JSON.stringify(project)}\nCONTRIBUTOR:${JSON.stringify(contributor)}\nCLIENT:${JSON.stringify(client)}\nOUTCOME:${outcome}\nFEEDBACK:${JSON.stringify(feedback)}`);
  const data = parseJSON(raw) || { raw };

  const [contribRep, clientRep, agentRep] = await Promise.all([
    contracts.updateReputation({ address: contributor.address, role: 'CONTRIBUTOR', delta: data.contributorDelta, projectId: project.id, reason: data.contributorSummary }),
    contracts.updateReputation({ address: client.address,      role: 'CLIENT',      delta: data.clientDelta,      projectId: project.id, reason: data.clientSummary }),
    contracts.updateReputation({ address: AGENT_ID,            role: 'AGENT',       delta: data.agentDelta,       projectId: project.id, reason: data.agentSummary }),
  ]);

  const log = await contracts.logDecision({ agentId: AGENT_ID, projectId: project.id, action: 'UPDATE_REPUTATION', data: { outcome, badges: data.badges }, matchScore: 0 });

  return { agent: 'REPUTATION_MANAGER', result: data, onChain: { log, contribRep, clientRep, agentRep } };
}

export async function orchestrate({ command, context }) {
  const system = `You are the Forge AI Orchestrator (ID: ${AGENT_ID}).
Given a user command, decide which sub-agent to invoke. Respond ONLY with valid JSON, no markdown.
JSON shape: {"intent":"EVALUATE|NEGOTIATE|VERIFY|REPUTATION|GENERAL","response":"string","suggestedAction":"string","confidence":number}`;

  const raw  = await chat(system, `COMMAND: ${command}\nCONTEXT: ${JSON.stringify(context)}`);
  const data = parseJSON(raw) || { raw };

  return { agent: 'ORCHESTRATOR', result: data };
}
