import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createExternalIntegrationVerification } = require("../lib/externalIntegrationVerification.js");
const { createSourceOfTruthRegistry, ENTITIES, ACTORS } = require("../lib/sot/sourceOfTruthRegistry.js");
const { PUBLIC_ROUTES, EXACT } = require("../lib/routePermissions.js");

describe("external integration verification", () => {
  const env = {
    BUZZARD_PRODUCT_SOT_ACTIVE: "0",
    BUZZARD_SALES_ENABLED: "0",
    BUZZARD_SUPPLIER_ORDERS_ENABLED: "0",
    BUZZARD_PAYMENT_LIVE: "0",
  };
  const service = createExternalIntegrationVerification({
    env,
    logAudit: () => {},
    listSuppliers: () => [
      { id: "mock", name: "Mock Supplier", format: "mock", credentialsConfigured: false },
    ],
    listMarketplaces: () => [{ code: "ebay", name: "eBay" }],
  });

  it("keeps SoT ownership and blocks supplier/marketplace/Pusat writes and live side effects", () => {
    const report = service.getVerificationReport();
    expect(report.ownership).toEqual({
      product: "product_engine",
      order: "order_engine",
      availability: "availability_engine",
      price: "pricing_engine",
    });
    expect(report.safety.supplierOrders).toBe(false);
    expect(report.safety.payments).toBe(false);
    expect(report.safety.marketplaceWrites).toBe(false);
    expect(report.safety.productionWrites).toBe("NOT_EXECUTED");
    expect(report.layers.LIVE_READ_VERIFICATION).toBe("NOT_EXECUTED");
    const sot = createSourceOfTruthRegistry({ env });
    expect(() => sot.assertWriteAuthority({ entity: ENTITIES.PRODUCT, actor: ACTORS.SUPPLIER })).toThrow();
    expect(() => sot.assertWriteAuthority({ entity: ENTITIES.PRICE, actor: ACTORS.MARKETPLACE })).toThrow();
    expect(() => sot.assertWriteAuthority({ entity: ENTITIES.ORDER, actor: ACTORS.PUSAT })).toThrow();
    const admin = service.adminReport();
    expect(JSON.stringify(admin)).not.toMatch(/api[_-]?key|password|Bearer /i);
    expect(service.publicHealth().status).toBe("conditional");
    expect(PUBLIC_ROUTES.has("GET /api/admin/system/external-integrations")).toBe(false);
    expect(EXACT["GET /api/admin/system/external-integrations"]).toBe("system.read");
    expect(service.safety()).toMatchObject({
      productSotActive: false,
      salesLocked: true,
      supplierOrders: false,
      payments: false,
    });
  });
});
