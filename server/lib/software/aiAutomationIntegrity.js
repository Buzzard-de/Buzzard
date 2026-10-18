/**
 * AI assistants and automation integrity — local software only.
 * Software facade is not a second orchestrator.
 * Agents stay recommendation-only. Self-approve is denied.
 * Remote memory, live message bus, live Pusat, and live calls stay blocked.
 *
 * Band 35–55 and 168–182 are already established-scope 100% (182 HUMAN).
 * This module closes leftover facade + human-approval-test software (30, 208)
 * without live agent execution.
 */

const { isSalesEnabled } = require("../salesMode");
const architectureInventory = require("./architectureInventory");
const gatedActions = require("./gatedActions");
const workflow = require("./workflow");
const voice = require("./voice");
const phoneAssistant = require("../phoneAssistantService");
const pusat = require("../pusat");

function inspect() {
  const inv = architectureInventory.inspect();
  const roster = pusat.agents.specialistRosterStatus();
  return {
    ok: true,
    live: false,
    liveVerified: false,
    salesEnabled: isSalesEnabled() === true,
    orchestrator: inv.orchestrator,
    duplicateOrchestrator: inv.duplicateOrchestrator,
    duplicateApprovalCenter: inv.duplicateApprovalCenter,
    secondOrchestrator: false,
    productSourceOfTruthActive: inv.productSourceOfTruthActive === true,
    recommendationOnly: roster.recommendationOnly === true,
    liveMutations: roster.liveMutations === true,
    rosterComplete: roster.complete === true,
  };
}

function confirmLive() {
  return pusat.confirmLive();
}

function syncRemoteMemory() {
  return pusat.memory.syncRemote();
}

function sendLiveMessage() {
  return pusat.agents.sendLiveMessage();
}

function executeAssistant(code, input = {}) {
  return pusat.agents.executeAgent(code, input);
}

function selfApprove(input = {}) {
  const asked = pusat.approval.requestApproval({
    requestingAgent: input.requestingAgent || "price_ai",
    action: input.action || "prices.update",
    reason: input.reason || "ai-automation self-approve check",
    input: input.payload || { sku: "AI-AUTO-1" },
  });
  return pusat.approval.decide(asked.id, "approve", input.requestingAgent || "price_ai");
}

function guardianMissingIdentity() {
  return pusat.guardian.evaluate({
    agentId: "price_ai",
    action: "purchase",
  });
}

function gatedExecute(input = {}) {
  return gatedActions.execute(input);
}

function startCall() {
  return phoneAssistant.startCall();
}

function startVoiceCall() {
  return voice.startCall();
}

function digitalHuman() {
  return phoneAssistant.digitalHumanSession();
}

function runSafeWorkflow(software, db, input = {}) {
  return workflow.runSafeCustomerWorkflow(software, db, input);
}

module.exports = {
  inspect,
  confirmLive,
  syncRemoteMemory,
  sendLiveMessage,
  executeAssistant,
  selfApprove,
  guardianMissingIdentity,
  gatedExecute,
  startCall,
  startVoiceCall,
  digitalHuman,
  runSafeWorkflow,
};
