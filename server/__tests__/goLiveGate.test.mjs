import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createGoLiveGate, CHECK_IDS } = require("../lib/goLiveGate.js");

function allPass(correlationId) {
  return CHECK_IDS.map((id) => ({
    id,
    category: "TEST",
    status: "PASS",
    critical: true,
    evidence: { injected: true },
    checkedAt: new Date().toISOString(),
    correlationId,
    reason: "injected_pass",
  }));
}

function withStatus(id, status, extra = {}) {
  return ({ correlationId }) =>
    allPass(correlationId).map((row) => (row.id === id ? { ...row, status, ...extra } : row));
}

const lockedEnv = {
  BUZZARD_PRODUCT_SOT_ACTIVE: "0",
  BUZZARD_SALES_ENABLED: "0",
  BUZZARD_SUPPLIER_ORDERS_ENABLED: "0",
  BUZZARD_PAYMENT_LIVE: "0",
};

describe("goLiveGate", () => {
  it("defaults to BLOCKED/LOCKED and blocks each critical dependency", () => {
    const gate = createGoLiveGate({
      env: lockedEnv,
      listSuppliers: () => [{ id: "mock", name: "Mock", format: "mock", credentialsConfigured: false }],
      listMarketplaces: () => [{ code: "amazon", name: "Amazon" }],
      productionDbResult: { status: "FAIL", persistence: { persistent: false, mode: "development_default" }, database: {} },
      getIncidents: () => ({ overall: "OK", critical: 0 }),
    });
    const report = gate.evaluateGoLive();
    expect(report.status).toBe("BLOCKED");
    expect(report.decision).toBe("NO_GO");
    expect(report.lifecycle).toBe("LOCKED");
    expect(report.safety.SALES_LOCKED).toBe("YES");
    expect(report.safety.PRODUCT_SOT_ACTIVE).toBe("OFF");
    expect(report.correlationId).toMatch(/^corr_/);

    const cases = [
      ["productionDb", "CONDITIONAL"],
      ["productSot", "BLOCKED"],
      ["orderSot", "BLOCKED"],
      ["availabilitySot", "BLOCKED"],
      ["priceSot", "BLOCKED"],
      ["externalSuppliers", "BLOCKED"],
      ["externalMarketplaces", "BLOCKED"],
      ["payments", "BLOCKED"],
      ["tax", "BLOCKED"],
      ["shipping", "BLOCKED"],
      ["fulfillment", "BLOCKED"],
      ["security", "BLOCKED"],
      ["deployment", "BLOCKED"],
    ];
    for (const [id] of cases) {
      const isolated = createGoLiveGate({
        env: lockedEnv,
        checks: withStatus(id, "BLOCKED", { reason: `${id}_fail` }),
        getIncidents: () => ({ overall: "OK", critical: 0 }),
      });
      const result = isolated.evaluateGoLive();
      expect(result.status).toBe("BLOCKED");
      expect(result.blockers.some((row) => row.id === id)).toBe(true);
    }

    const supplier = createGoLiveGate({
      env: lockedEnv,
      checks: withStatus("externalSuppliers", "NOT_CONFIGURED"),
    });
    expect(supplier.evaluateGoLive().status).toBe("BLOCKED");

    const market = createGoLiveGate({
      env: lockedEnv,
      checks: withStatus("externalMarketplaces", "CONDITIONAL"),
    });
    expect(market.evaluateGoLive().status).toBe("BLOCKED");

    const incidents = createGoLiveGate({
      env: lockedEnv,
      checks: ({ correlationId }) => allPass(correlationId),
      getIncidents: () => ({ overall: "CRITICAL", critical: 1 }),
    });
    expect(incidents.evaluateGoLive().status).toBe("BLOCKED");
  });

  it("treats all-pass without approval as READY/NO_GO and with approval as APPROVED", () => {
    const ready = createGoLiveGate({
      env: lockedEnv,
      checks: ({ correlationId }) => allPass(correlationId),
      getIncidents: () => ({ overall: "OK", critical: 0 }),
      productionSafetyLock: true,
    });
    const noApproval = ready.evaluateGoLive();
    expect(noApproval.status).toBe("PASS");
    expect(noApproval.decision).toBe("NO_GO");
    expect(noApproval.lifecycle).toBe("READY");

    const approved = createGoLiveGate({
      env: lockedEnv,
      checks: ({ correlationId }) => allPass(correlationId),
      getIncidents: () => ({ overall: "OK", critical: 0 }),
      productionSafetyLock: true,
      approval: { id: "appr_1", status: "APPROVED", resourceType: "GO_LIVE_PRODUCTION" },
    });
    const withApproval = approved.evaluateGoLive();
    expect(withApproval.status).toBe("PASS");
    expect(withApproval.lifecycle).toBe("APPROVED");
    expect(withApproval.decision).toBe("CONDITIONAL_GO");
  });

  it("public health hides secrets and keeps salesEnabled false", () => {
    const gate = createGoLiveGate({ env: lockedEnv });
    const health = gate.publicHealth();
    expect(health.salesEnabled).toBe(false);
    expect(health).toEqual({ status: expect.any(String), salesEnabled: false });
    expect(JSON.stringify(health)).not.toMatch(/password|secret|api[_-]?key|Bearer /i);
    const admin = gate.adminReport();
    expect(JSON.stringify(admin)).not.toMatch(/password|secret|api[_-]?key|Bearer /i);
    expect(admin.safety.PRODUCTION_WRITES).toBe("NOT_EXECUTED");
  });
});
