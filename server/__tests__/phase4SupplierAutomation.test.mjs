import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { evaluatePhase4SupplierAutomation } = require("../lib/platform/phase4SupplierAutomation.js");
const { selectSupplierForOrder } = require("../lib/supplier/supplierSelectionEngine.js");

describe("phase 4 — supplier automation", () => {
  it("reaches 100% on dry-run supplier scope", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    process.env.BUZZARD_SUPPLIER_ORDERS_ENABLED = "0";
    const report = evaluatePhase4SupplierAutomation();
    expect(report.percentComplete).toBe(100);
    expect(report.ok).toBe(true);
    const live = report.checks.find((c) => c.id === "SUP_LIVE_API");
    expect(live.status).toBe("BLOCKED_EXTERNAL");
    expect(live.ok).toBe(false);
  });

  it("selects fallback supplier without pre-buy", () => {
    const picked = selectSupplierForOrder({
      lineItems: [{ sku: "DRY-SKU-001", quantity: 1 }],
      offersBySku: {
        "DRY-SKU-001": [
          { supplierId: "api-supplier-dry", unitCost: 40, stock: 8, reliabilityScore: 0.95 },
          { supplierId: "xml-supplier-dry", unitCost: 35, stock: 2, reliabilityScore: 0.5 },
        ],
      },
    });
    expect(picked.ok).toBe(true);
    expect(picked.preBuyBlocked).toBe(true);
    expect(picked.lines[0].primary.supplierId).toBe("api-supplier-dry");
    expect(picked.lines[0].fallback.supplierId).toBe("xml-supplier-dry");
  });
});