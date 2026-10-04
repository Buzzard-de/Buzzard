import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createProductionGoLiveClosure, CLOSURE_CHECKS } = require("../lib/productionGoLiveClosure.js");
const { createCanonicalOrderFacade } = require("../lib/canonicalOrderFacade.js");
const { assertSalesEnabled, isSalesEnabled } = require("../lib/salesMode.js");
const { EXACT } = require("../lib/routePermissions.js");

const locked = {
  BUZZARD_PRODUCT_SOT_ACTIVE: "0",
  BUZZARD_SALES_ENABLED: "0",
  BUZZARD_SUPPLIER_ORDERS_ENABLED: "0",
  BUZZARD_PAYMENT_LIVE: "0",
};

describe("production go-live closure", () => {
  it("keeps sales off when the flag is 1 but the gate is not eligible", () => {
    const prevBypass = process.env.BUZZARD_SALES_GATE_BYPASS;
    const prevSales = process.env.BUZZARD_SALES_ENABLED;
    const prevNode = process.env.NODE_ENV;
    delete process.env.BUZZARD_SALES_GATE_BYPASS;
    process.env.NODE_ENV = "production";
    process.env.BUZZARD_SALES_ENABLED = "1";
    expect(isSalesEnabled()).toBe(false);
    expect(assertSalesEnabled().code).toBe("SALES_BLOCKED_BY_GO_LIVE_GATE");
    process.env.BUZZARD_SALES_ENABLED = prevSales;
    process.env.NODE_ENV = prevNode;
    if (prevBypass == null) delete process.env.BUZZARD_SALES_GATE_BYPASS;
    else process.env.BUZZARD_SALES_GATE_BYPASS = prevBypass;
  });

  it("reports honest FAIL checks and never auto-enables sales", () => {
    const closure = createProductionGoLiveClosure({ env: locked });
    const report = closure.evaluate();
    expect(CLOSURE_CHECKS).toHaveLength(13);
    expect(report.eligible).toBe(false);
    expect(report.salesEnabled).toBe(false);
    expect(report.failedChecks.length).toBeGreaterThan(0);
    expect(report.checks.safety_flags).toBe("PASS");
    expect(report.checks.order_sot).toBe("PASS");
    expect(report.checks.product_sot).toBe("PASS");
    expect(report.checks.persistence).toBe("FAIL");
    expect(report.checks.production_config).toBe("FAIL");
    expect(report.checks.build).toBe("FAIL");
    expect(createCanonicalOrderFacade({ env: locked }).usesLegacyJson()).toBe(false);
    expect(EXACT["GET /api/admin/system/go-live/closure"]).toBe("system.read");
  });
});
