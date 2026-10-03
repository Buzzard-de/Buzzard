import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createExternalIntegrationRegistry } = require("../lib/externalIntegrationRegistry.js");
const { createMarketplaceVerification } = require("../lib/external/marketplaceVerification.js");

describe("marketplace verification", () => {
  it("maps orders/stock/price without overwriting Price SoT", () => {
    const registry = createExternalIntegrationRegistry({
      listSuppliers: () => [],
      listMarketplaces: () => [{ code: "amazon", name: "Amazon" }],
    });
    const verify = createMarketplaceVerification({ registry, audit: { record: () => {} } });
    expect(verify.verifyMarketplaceConnector({ marketplaceId: "missing" }).status).toBe("FAIL");
    const result = verify.verifyMarketplaceConnector({ marketplaceId: "amazon", correlationId: "corr_m" });
    expect(result.status).toBe("CONDITIONAL");
    expect(result.writesExecuted).toBe(false);
    expect(result.mapping.order.owner).toBe("order_engine");
    expect(result.mapping.stock.owner).toBe("availability_engine");
    expect(result.mapping.price.observedPrice).toBe(99);
    expect(result.mapping.price.canonicalPrice).toBe(94);
    expect(result.mapping.price.overwritesCanonical).toBe(false);
    expect(result.correlationId).toBe("corr_m");
    expect(result.capabilities.PRICE_WRITE).toBe(false);
    expect(result.layers.PRODUCTION_WRITE_VERIFICATION).toBe("NOT_EXECUTED");
  });
});
