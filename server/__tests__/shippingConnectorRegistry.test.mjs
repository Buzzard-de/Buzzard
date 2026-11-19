import { describe, expect, it } from "vitest";

const { snapshot, createShippingConnector } = require("../lib/logistics/shippingConnectorRegistry.js");

describe("shipping connector registry", () => {
  it("lists dry-run carriers", () => {
    const snap = snapshot();
    expect(snap.liveShipment).toBe(false);
    expect(snap.carrierCount).toBeGreaterThan(5);
    expect(snap.matrixRows).toBeGreaterThan(100);
  });

  it("blocks live shipment on DHL adapter", () => {
    const dhl = createShippingConnector("DHL");
    const shipment = dhl.createShipment({ orderId: "T-1", postalCode: "10115" });
    expect(shipment.liveShipment).toBe(false);
  });
});