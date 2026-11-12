import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createAdapter } = require("../lib/logistics/v5/adapterFramework.js");
const { carriers } = require("../lib/commercialIntegrations.js");
const { recordShipmentCreated } = require("../lib/orderAutomation.js");
const { createReturnLabel } = require("../lib/returnsRma.js");
const { updateLabelResult, handleCarrierWebhook } = require("../lib/logisticsFulfillment.js");
const { deliverNotification } = require("../lib/notificationHub.js");

const blocked = {
  ok: false,
  live: false,
  mock: false,
  status: "BLOCKED_EXTERNAL",
  trackingNumber: null,
  events: [],
};

function expectBlocked(result) {
  expect(result.ok).toBe(blocked.ok);
  expect(result.live).toBe(blocked.live);
  expect(result.mock).toBe(blocked.mock);
  expect(result.status).toBe(blocked.status);
  expect(result.trackingNumber).toBeNull();
  expect(result.events).toEqual([]);
  expect(result.delivered).toBe(false);
}

describe("carrier tracking stays blocked without a live connection", () => {
  const adapter = createAdapter({ carrierId: "dhl-parcel-de" });

  it("does not turn a known carrier id into a live scan", () => {
    const track = adapter.trackShipment("AB123456");
    const events = adapter.getTrackingEvents("AB123456");
    expectBlocked(track);
    expectBlocked(events);
    expect(track.code).toBe("LIVE_CONNECTION_ABSENT");
    expect(JSON.stringify(track)).not.toContain("DELIVERED");
  });

  it("rejects an unknown carrier", () => {
    const unknown = createAdapter({ carrierId: "not-a-carrier" });
    expect(unknown.trackShipment("AB123456").code).toBe("CARRIER_UNKNOWN");
    expectBlocked(unknown.getTrackingEvents("AB123456"));
  });

  it("rejects a missing tracking number", () => {
    expect(adapter.trackShipment("").code).toBe("MISSING_TRACKING_NUMBER");
    expect(adapter.getTrackingEvents().code).toBe("MISSING_TRACKING_NUMBER");
  });

  it("rejects an invalid tracking number", () => {
    expect(adapter.trackShipment("bad!!").code).toBe("INVALID_TRACKING_NUMBER");
    expectBlocked(adapter.getTrackingEvents("!!!"));
  });

  it("rejects a mock payload instead of storing it as a scan", () => {
    const mock = adapter.trackShipment({ mock: true, trackingNumber: "AB123456", status: "DELIVERED" });
    expect(mock.code).toBe("MOCK_REJECTED");
    expectBlocked(mock);
  });

  it("recognizes a carrier response shape and still requires a live connection", () => {
    const shaped = adapter.getTrackingEvents({
      carrierResponse: {
        trackingNumber: "AB123456",
        carrier: "DHL",
        receivedAt: "2026-11-11T20:00:00Z",
        events: [{ code: "IN_TRANSIT", at: "2026-11-11T20:00:00Z" }],
      },
    });
    expect(shaped.contract).toBe("VALID_SHAPE");
    expect(shaped.code).toBe("LIVE_CONNECTION_REQUIRED");
    expectBlocked(shaped);
  });

  it("reports timeout and network error without a delivery", () => {
    const slow = createAdapter({ carrierId: "ups-developer", forceTimeout: true });
    const down = createAdapter({ carrierId: "gls-shipit", networkError: true });
    expect(slow.trackShipment("AB123456").code).toBe("TIMEOUT");
    expect(down.getTrackingEvents("AB123456").code).toBe("NETWORK_ERROR");
    expectBlocked(slow.trackShipment("AB123456"));
    expectBlocked(down.getTrackingEvents("AB123456"));
  });

  it("rejects duplicate events and an unconfirmed delivery", () => {
    const duplicate = adapter.trackShipment({
      trackingNumber: "AB123456",
      events: [
        { code: "IN_TRANSIT", at: "2026-11-11T20:00:00Z" },
        { code: "IN_TRANSIT", at: "2026-11-11T20:00:00Z" },
      ],
    });
    const delivered = adapter.getTrackingEvents({ trackingNumber: "AB123456", status: "DELIVERED" });
    expect(duplicate.code).toBe("DUPLICATE_TRACKING_EVENT");
    expect(delivered.code).toBe("DELIVERY_UNCONFIRMED");
    expectBlocked(duplicate);
    expectBlocked(delivered);
  });

  it("does not let a stored key, label write, webhook, return, or notice become a shipment", async () => {
    const previous = process.env.DHL_API_KEY;
    process.env.DHL_API_KEY = "present-not-live";
    try {
      const label = await carriers.dhl({ orderNumber: "BZ-1", countryCode: "DE" });
      expect(label.status).toBe("BLOCKED_EXTERNAL");
      expect(label.trackingNumber).toBeNull();
      expect(label.shipmentCreated).toBe(false);
      for (const name of ["dpd", "gls", "hermes", "ups"]) {
        const row = await carriers[name]({ orderNumber: "BZ-1" });
        expect(row.status).not.toBe("configured");
        expect(row.live).toBe(false);
      }
    } finally {
      if (previous == null) delete process.env.DHL_API_KEY;
      else process.env.DHL_API_KEY = previous;
    }
    expect(recordShipmentCreated({ orderNumber: "BZ-1", carrier: "dhl", trackingNumber: "AB123456" }).shipped).toBe(false);
    expect(createReturnLabel("rma-1", { trackingNumber: "AB123456" }).created).toBe(false);
    expect(updateLabelResult("ship-1", { status: "shipped", trackingNumber: "AB123456" }).code).toBe("LABEL_NOT_CREATED");
    expect(handleCarrierWebhook({ orderNumber: "BZ-1", status: "DELIVERED" }).accepted).toBe(false);
    expect(deliverNotification({ kind: "delivery", channel: "email" }).status).toBe("BLOCKED_EXTERNAL");
    expect(deliverNotification({ kind: "delivery" }).sent).toBe(false);
  });
});
