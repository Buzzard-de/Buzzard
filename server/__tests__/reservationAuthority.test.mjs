import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("WMS and software reservation authorities stay isolated", () => {
  it("does not mint a commerce reservation from a WMS location reserve", () => {
    const wms = require("../lib/wmsInventory.js");
    const result = wms.reserveInventory({
      warehouseId: 1,
      locationId: 1,
      productSku: "AUTHORITY-ISOLATION",
      quantity: 1,
      orderNumber: "not-live",
    });
    if (result.error) {
      expect(result.commerceReservation).not.toBe(true);
      return;
    }
    expect(result.authority).toBe("wms_location");
    expect(result.commerceReservation).toBe(false);
    expect(result.liveFulfillment).toBe(false);
    expect(result.softwareReservationId).toBeNull();
  });
});
