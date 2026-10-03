import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createGoLiveActivation } = require("../lib/goLiveActivation.js");
const { CHECK_IDS } = require("../lib/goLiveGate.js");

describe("goLiveRollback", () => {
  it("suspends sales without deleting order history", () => {
    const env = {
      BUZZARD_SALES_ENABLED: "0",
      BUZZARD_SUPPLIER_ORDERS_ENABLED: "0",
      BUZZARD_PAYMENT_LIVE: "0",
    };
    const audits = [];
    const activation = createGoLiveActivation({
      env,
      mutateEnv: false,
      productionSafetyLock: false,
      killSwitch: () => false,
      checks: ({ correlationId }) =>
        CHECK_IDS.map((id) => ({
          id,
          category: "TEST",
          status: "PASS",
          critical: true,
          evidence: {},
          checkedAt: new Date().toISOString(),
          correlationId,
          reason: "ok",
        })),
      getIncidents: () => ({ overall: "OK", critical: 0 }),
      getApproval: () => ({ id: "appr_ok", status: "APPROVED", resourceType: "GO_LIVE_PRODUCTION" }),
      logAudit: (row) => audits.push(row),
    });
    activation.activateProduction({ approvalId: "appr_ok", correlationId: "corr_rb" });
    const result = activation.deactivateProduction({
      reason: "incident",
      actor: "admin@example.com",
      correlationId: "corr_rb",
    });
    expect(result.state).toBe("SUSPENDED");
    expect(result.salesEnabled).toBe(false);
    expect(result.ordersPreserved).toBe(true);
    expect(result.destructiveRollback).toBe(false);
    expect(result.marketplaceWrites).toBe(false);
    expect(env.BUZZARD_SALES_ENABLED).toBe("0");
    expect(audits.some((row) => row.action === "GO_LIVE_DEACTIVATED")).toBe(true);
  });
});
