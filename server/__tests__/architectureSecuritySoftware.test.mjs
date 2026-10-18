import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("central architecture and security — established fail-closed", () => {
  it("inventory keeps a single Pusat, inactive SoT, and sales off", () => {
    const software = require("../lib/software");
    const inv = software.architectureInventory.inspect();
    expect(inv.orchestrator).toBe("pusat");
    expect(inv.duplicateOrchestrator).toBe(false);
    expect(inv.duplicateApprovalCenter).toBe(false);
    expect(inv.salesEnabled).toBe(false);
    expect(inv.productSourceOfTruthActive).toBe(false);
    expect(inv.livePayments).toBe(false);
    expect(software.architectureInventory.confirmProduction().liveVerified).toBe(false);
  });

  it("Pusat memory, agents, health, and Guardian never go live remotely", () => {
    const pusat = require("../lib/pusat");
    pusat.initialize(require("../lib/db").db);
    expect(pusat.memory.syncRemote().reason).toBe("MEMORY_REMOTE_BLOCKED");
    expect(pusat.memory.confirmCrossProcess().proven).toBe(false);
    expect(pusat.agents.sendLiveMessage().reason).toBe("INTER_AGENT_BUS_BLOCKED");
    expect(pusat.agents.executeAgent("price_ai", {}).commercialSideEffects).toBe(false);
    expect(pusat.confirmLive().reason).toBe("PUSAT_LIVE_BLOCKED");
    expect(pusat.guardian.confirmRemoteLive().httpAttempted).toBe(false);
    const denied = pusat.guardian.evaluate({
      agentId: "price_ai",
      action: "purchase",
    });
    expect(denied.allowed).toBe(false);
  });

  it("Human Approval Center still cannot self-approve and SIEM is not exported", () => {
    const pusat = require("../lib/pusat");
    const controlCenter = require("../lib/controlCenter");
    pusat.initialize(require("../lib/db").db);
    const asked = pusat.approval.requestApproval({
      requestingAgent: "price_ai",
      action: "prices.update",
      reason: "self-approve check",
      input: { sku: "ARCH-SEC-1" },
    });
    const self = pusat.approval.decide(asked.id, "approve", "price_ai");
    expect(self.rejected).toBe(true);
    expect(self.code).toBe("ai_cannot_self_approve");
    expect(controlCenter.exportAuditToSiem().reason).toBe("SIEM_EXPORT_BLOCKED");
    expect(controlCenter.exportAuditToSiem().exported).toBe(false);
  });
});
