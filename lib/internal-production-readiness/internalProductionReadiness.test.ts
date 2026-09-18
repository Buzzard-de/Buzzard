import { describe, it, expect, beforeEach } from "vitest";
import { buildReadinessMatrix } from "./readinessMatrix";
import { buildEngineIntegrityAudit } from "./engineIntegrityAudit";
import { buildClassifiedBlockers, buildWarnings } from "./blockerClassification";
import { buildNextActions } from "./nextActions";
import { buildInternalProductionReadinessAudit } from "./auditReport";
import { captureSideEffectCounters, assertZeroSideEffects } from "./sideEffects";
import { resetEvidenceStoreForTests } from "@/lib/production-access/evidenceStore";

describe("Internal Production Readiness Audit", () => {
  beforeEach(() => {
    resetEvidenceStoreForTests();
    delete process.env.SUPPLIER_LIVE_CREDENTIALS;
    delete process.env.SUPPLIER_LIVE_CREDENTIALS_SECRET_REF;
    process.env.SALES_ENABLED = "0";
    process.env.SUPPLIER_NETWORK_ENABLED = "0";
    process.env.SUPPLIER_ORDER_NETWORK_ENABLED = "0";
    process.env.PAYMENT_PRODUCTION_ENABLED = "0";
    process.env.CARRIER_PRODUCTION_ENABLED = "0";
    process.env.RETURNS_PRODUCTION_ENABLED = "0";
    process.env.MARKETING_SPEND_ENABLED = "0";
    process.env.AI_PRODUCTION_ENABLED = "0";
  });

  it("builds readiness matrix for all required areas", () => {
    const matrix = buildReadinessMatrix();
    const areas = matrix.map((e) => e.area);
    expect(areas).toContain("PRODUCT");
    expect(areas).toContain("SUPPLIER");
    expect(areas).toContain("TRADE_ROUTE");
    expect(areas).toContain("CUSTOMS");
    expect(areas).toContain("35_MARKETS");
    expect(areas).toContain("EXTERNAL_ACCESS");
    expect(areas).toContain("PRODUCTION_FLAGS");
    expect(matrix.length).toBeGreaterThanOrEqual(24);
  });

  it("audits core engine chain without duplicate primary engines", () => {
    const engines = buildEngineIntegrityAudit();
    expect(engines.find((e) => e.engine === "Product")?.exists).toBe(true);
    expect(engines.find((e) => e.engine === "Order")?.tests).toBe("PASS");
    expect(engines.find((e) => e.engine === "Pricing")?.duplicateEngine).toBe(false);
  });

  it("classifies external credential blockers separately from software", () => {
    const blockers = buildClassifiedBlockers();
    expect(blockers.some((b) => b.category === "EXTERNAL_CREDENTIAL" || b.category === "EXTERNAL_ACCESS")).toBe(true);
    expect(blockers.some((b) => b.category === "MANUAL_DEPLOYMENT")).toBe(true);
  });

  it("builds ordered next actions with SALES_ENABLED last", () => {
    const actions = buildNextActions();
    expect(actions).toHaveLength(10);
    expect(actions[9]?.label).toContain("SALES_ENABLED");
    expect(actions[9]?.status).toBe("BLOCKED");
  });

  it("full audit keeps SALES_ENABLED at 0 and zero side effects", () => {
    const start = captureSideEffectCounters();
    const audit = buildInternalProductionReadinessAudit({ sideEffectStart: start, sideEffectEnd: start });
    expect(audit.scoreboard.SALES_ENABLED).toBe("0");
    expect(audit.scoreboard.SOFTWARE_COMPLETE).toBe("YES");
    expect(audit.scoreboard.EXTERNAL_ACCESS).toBe("BLOCKED");
    expect(audit.scoreboard.PRODUCTION_READY).toBe("NO");
    expect(audit.auditFailure).toBe(false);
    expect(assertZeroSideEffects(audit.sideEffectCounters.end)).toHaveLength(0);
  });

  it("marks supplier and external access as blocked without credentials", () => {
    const matrix = buildReadinessMatrix();
    const supplier = matrix.find((e) => e.area === "SUPPLIER");
    expect(supplier?.status).toBe("BLOCKED");
    const external = matrix.find((e) => e.area === "EXTERNAL_ACCESS");
    expect(external?.status).toBe("BLOCKED");
  });

  it("collects warnings without claiming production ready", () => {
    const warnings = buildWarnings();
    expect(Array.isArray(warnings)).toBe(true);
    const audit = buildInternalProductionReadinessAudit();
    expect(audit.scoreboard.GO_LIVE_READY).toBe("NO");
  });
});
