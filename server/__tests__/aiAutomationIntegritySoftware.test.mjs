import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("AI assistants and automation — established fail-closed", () => {
  let software;
  let db;

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    require("../lib/pusat").initialize(db);
    software.initialize(db);
  });

  it("keeps a single Pusat facade and never opens live automation", () => {
    const inspect = software.aiAutomationIntegrity.inspect();
    expect(inspect.orchestrator).toBe("pusat");
    expect(inspect.duplicateOrchestrator).toBe(false);
    expect(inspect.secondOrchestrator).toBe(false);
    expect(inspect.duplicateApprovalCenter).toBe(false);
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.productSourceOfTruthActive).toBe(false);
    expect(inspect.recommendationOnly).toBe(true);
    expect(inspect.liveMutations).toBe(false);
    expect(software.aiAutomationIntegrity.confirmLive().reason).toBe("PUSAT_LIVE_BLOCKED");
    expect(software.aiAutomationIntegrity.syncRemoteMemory().reason).toBe("MEMORY_REMOTE_BLOCKED");
    expect(software.aiAutomationIntegrity.sendLiveMessage().reason).toBe("INTER_AGENT_BUS_BLOCKED");
    expect(software.aiAutomationIntegrity.startCall().reason).toBe("CALL_START_BLOCKED");
    expect(software.aiAutomationIntegrity.startVoiceCall().callStarted).toBe(false);
    expect(software.aiAutomationIntegrity.digitalHuman().reason).toBe("DIGITAL_HUMAN_LIVE_BLOCKED");
  });

  it("keeps assistants recommendation-only and denies AI self-approval", () => {
    const priced = software.aiAutomationIntegrity.executeAssistant("price_ai", { supplierCost: 10, salePrice: 20 });
    expect(priced.recommendationOnly).toBe(true);
    expect(priced.commercialSideEffects).toBe(false);
    expect(priced.liveMutations).toBe(false);
    const missing = software.aiAutomationIntegrity.executeAssistant("not_a_real_agent", {});
    expect(missing.commercialSideEffects).toBe(false);
    const self = software.aiAutomationIntegrity.selfApprove({ requestingAgent: "price_ai" });
    expect(self.rejected).toBe(true);
    expect(self.code).toBe("ai_cannot_self_approve");
    expect(software.aiAutomationIntegrity.guardianMissingIdentity().allowed).toBe(false);
    expect(software.aiAutomationIntegrity.gatedExecute({ action: "sales_enable", actor: "pusat" }).reason).toBe(
      "SELF_APPROVE_DENIED"
    );
    expect(software.aiAutomationIntegrity.gatedExecute({ action: "sales_enable", actor: "operator" }).reason).toBe(
      "HUMAN_APPROVAL_REQUIRED"
    );
    expect(software.aiAutomationIntegrity.gatedExecute({ action: "sales_enable" }).executed).toBe(false);
  });

  it("runs the safe customer workflow without commercial side effects", () => {
    const run = software.aiAutomationIntegrity.runSafeWorkflow(software, db, {
      sku: `AI-WF-${Date.now()}`,
      customerId: "cust_ai_auto",
    });
    expect(run.commercialOrders).toBe(0);
    expect(run.paymentExecuted).toBe(false);
    expect(run.refundExecuted).toBe(false);
    expect(run.supplierOrderSent).toBe(false);
    expect(run.listingPublished).toBe(false);
    expect(run.customerMessageSent).toBe(false);
    expect(run.carrierAction).toBe(false);
    expect(run.steps.approvalRequired.pass).toBe(true);
    expect(run.steps.communicationsBlocked.pass).toBe(true);
    expect(run.steps.marketplaceUnpublished.pass).toBe(true);
  });
});
