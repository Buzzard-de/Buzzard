import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createGoLiveActivation } = require("../lib/goLiveActivation.js");
const { CHECK_IDS } = require("../lib/goLiveGate.js");

function allPass(correlationId) {
  return CHECK_IDS.map((id) => ({
    id,
    category: "TEST",
    status: "PASS",
    critical: true,
    evidence: {},
    checkedAt: new Date().toISOString(),
    correlationId,
    reason: "injected_pass",
  }));
}

const env = {
  BUZZARD_PRODUCT_SOT_ACTIVE: "0",
  BUZZARD_SALES_ENABLED: "0",
  BUZZARD_SUPPLIER_ORDERS_ENABLED: "0",
  BUZZARD_PAYMENT_LIVE: "0",
};

describe("goLiveActivation", () => {
  it("stays locked without approval and does not mutate sales env", () => {
    const activation = createGoLiveActivation({
      env,
      mutateEnv: false,
      productionSafetyLock: false,
      killSwitch: () => false,
      checks: ({ correlationId }) => allPass(correlationId),
      getIncidents: () => ({ overall: "OK", critical: 0 }),
    });
    expect(activation.getState().state).toBe("LOCKED");
    const blocked = activation.activateProduction({ approvalId: null, correlationId: "corr_a" });
    expect(blocked.ok).toBe(false);
    expect(blocked.salesEnabled).toBe(false);
    expect(env.BUZZARD_SALES_ENABLED).toBe("0");
  });

  it("activates idempotently when gates pass, approval exists, and kill switch is off", () => {
    const audits = [];
    const activation = createGoLiveActivation({
      env,
      mutateEnv: false,
      productionSafetyLock: false,
      killSwitch: () => false,
      checks: ({ correlationId }) => allPass(correlationId),
      getIncidents: () => ({ overall: "OK", critical: 0 }),
      getApproval: () => ({ id: "appr_ok", status: "APPROVED", resourceType: "GO_LIVE_PRODUCTION" }),
      logAudit: (row) => audits.push(row),
    });
    const first = activation.activateProduction({ approvalId: "appr_ok", correlationId: "corr_act" });
    const second = activation.activateProduction({ approvalId: "appr_ok", correlationId: "corr_act" });
    expect(first.ok).toBe(true);
    expect(first.replayed).toBe(false);
    expect(second.ok).toBe(true);
    expect(second.replayed).toBe(true);
    expect(first.salesEnabled).toBe(false);
    expect(env.BUZZARD_SALES_ENABLED).toBe("0");
    expect(audits.some((row) => row.action === "GO_LIVE_ACTIVATION_COMPLETED")).toBe(true);
    expect(audits.some((row) => row.metadata?.correlationId === "corr_act")).toBe(true);
  });

  it("allows only one successful concurrent transition", async () => {
    const activation = createGoLiveActivation({
      env,
      mutateEnv: false,
      productionSafetyLock: false,
      killSwitch: () => false,
      checks: ({ correlationId }) => allPass(correlationId),
      getIncidents: () => ({ overall: "OK", critical: 0 }),
      getApproval: () => ({ id: "appr_ok", status: "APPROVED", resourceType: "GO_LIVE_PRODUCTION" }),
    });
    const raced = await activation.activateConcurrent([
      { approvalId: "appr_ok", correlationId: "corr_1" },
      { approvalId: "appr_ok", correlationId: "corr_2" },
    ]);
    expect(raced.uniqueTransitions).toBe(true);
    expect(env.BUZZARD_SALES_ENABLED).toBe("0");
  });
});
