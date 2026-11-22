import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runSyntheticCustomerJourney, STEP_IDS } = require("../lib/commerce/syntheticCustomerJourney.js");
const { WORKFLOW_IDS, runPhase21Evidence } = require("../lib/commerce/phase21Evidence.js");
const { evaluatePhase21E2eAutomation } = require("../lib/platform/phase21E2eAutomation.js");

describe("phase 21 synthetic integration", () => {
  it("executes the locked customer workflow with recorded inputs and outputs", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const journey = runSyntheticCustomerJourney();
    expect(journey.stepCount).toBe(STEP_IDS.length);
    expect(journey.failedSteps).toEqual([]);
    expect(journey.workflowFailed).toEqual([]);
    expect(journey.workflow.map((step) => step.id)).toEqual([...WORKFLOW_IDS]);
    for (const step of journey.workflow) {
      expect(step.ok, step.id).toBe(true);
      expect(step.live, step.id).toBe(false);
      expect(step.input, step.id).toBeTypeOf("object");
      expect(step.output, step.id).toBeTypeOf("object");
    }
    const payment = journey.workflow.find((step) => step.id === "payment_gate");
    expect(payment.output.captured).toBe(false);
    expect(payment.output.moneyMoved).toBe(false);
    const note = journey.workflow.find((step) => step.id === "customer_notification");
    expect(note.output.sent).toBe(false);
    const refund = journey.workflow.find((step) => step.id === "refund_gate");
    expect(refund.output.refundIssued).toBe(false);
    expect(journey.supplierPurchase).toBe(false);
  });

  it("proves orchestration, isolation, recovery and persistence without a live side effect", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const evidence = runPhase21Evidence();
    expect(evidence.workflow.failed).toEqual([]);
    expect(evidence.automation.executed).toBe(true);
    expect(evidence.automation.denied).toBe(true);
    expect(evidence.automation.recovered).toBe(true);
    expect(evidence.automation.persisted).toBe(true);
    expect(evidence.automation.output.state).toBe("QUEUED");
    expect(evidence.memory.ok).toBe(true);
    expect(evidence.memory.crossCode).toBe("MEMORY_ISOLATION_DENIED");
    expect(evidence.vat.ok).toBe(true);
    expect(evidence.vat.deRate).not.toBe(evidence.vat.frRate);
    expect(evidence.locale.ok).toBe(true);
    expect(evidence.supplier.ok).toBe(true);
    expect(evidence.supplier.applied).toBe(false);
    expect(evidence.supplier.liveImport).toBe(false);
    expect(evidence.carrier.ok).toBe(true);
    expect(evidence.carrier.from).not.toBe(evidence.carrier.to);
    expect(evidence.security.ok).toBe(true);
    expect(evidence.security.egress).toBe("EXTERNAL_AI_EGRESS_DENIED");
    expect(evidence.payment.captured).toBe(false);
    expect(evidence.refund.issued).toBe(false);
    expect(evidence.notification.sent).toBe(false);
    expect(evidence.live).toBe(false);
    expect(evidence.productionReady).toBe(false);
  });

  it("does not treat a boolean flag as automation", () => {
    const report = evaluatePhase21E2eAutomation();
    expect(report.checks.map((check) => check.id)).not.toContain("E2E_ORDER_AUTO");
    expect(report.checks.find((check) => check.id === "E2E_AUTOMATION_EXECUTED").ok).toBe(true);
    expect(report.checks.find((check) => check.id === "E2E_PRODUCTION_RUN").status).toBe("BLOCKED_EXTERNAL");
    expect(report.completeClaim).toBe(false);
    expect(report.live).toBe(false);
  });
});
