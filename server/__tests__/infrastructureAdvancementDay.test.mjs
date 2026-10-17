import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("infrastructure advancement day — local fixtures only", () => {
  let software;
  let db;

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    software.initialize(db);
  });

  it("carrier lookup handles timeout, unavailable, unknown, and never books a label", () => {
    expect(software.carriers.lookup({ forceError: "timeout" }).reason).toBe("CARRIER_TIMEOUT");
    expect(software.carriers.lookup({ forceError: "unavailable" }).reason).toBe("CARRIER_UNAVAILABLE");
    expect(software.carriers.lookup({ carrier: "fedex" }).reason).toBe("CARRIER_UNKNOWN");
    const label = software.carriers.purchaseLabel({ carrier: "dhl" });
    expect(label.purchased).toBe(false);
    expect(label.reason).toBe("LABEL_PURCHASE_BLOCKED");
    expect(software.carrierWebhooks.pollCarrierTracking().reason).toBe("CARRIER_POLL_BLOCKED");
  });

  it("schedule ETA and delay evaluation never invent GPS", () => {
    const eta = software.eta.scheduleEta({ methodId: "express", country: "AT" });
    expect(eta.gps).toBe(false);
    expect(eta.liveMap).toBe(false);
    expect(eta.source).toBe("schedule_fixture");
    expect(eta.estimatedDelivery).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const delayed = software.eta.evaluateShipment({
      status: "DELAYED",
      lastUpdate: new Date().toISOString(),
      estimatedDelivery: eta.estimatedDelivery,
    });
    expect(delayed.delayed).toBe(true);
    expect(delayed.gps).toBe(false);
    const failed = software.eta.evaluateShipment({ status: "FAILED_DELIVERY", lastUpdate: new Date().toISOString() });
    expect(failed.failedDelivery).toBe(true);
  });

  it("live map accepts only simulated fixtures and projects no customer GPS", () => {
    expect(software.liveMap.fixturePoint({ latitude: 52.5, longitude: 13.4 }).reason).toBe("SIMULATED_FLAG_REQUIRED");
    const point = software.liveMap.fixturePoint({ latitude: 52.5, longitude: 13.4, simulated: true });
    expect(point.ok).toBe(true);
    expect(point.liveGps).toBe(false);
    expect(point.gpsInvented).toBe(false);
    const req = software.liveMap.describeRequirement();
    expect(req.configured).toBe(false);
    expect(req.requiredSource).toMatch(/telematics/i);
  });

  it("verified webhook ingest maps delay and rejects unsigned payloads", () => {
    const created = software.tracking.createShipment(db, {
      orderId: `ord-adv-${Date.now()}`,
      customerId: "cust-adv",
      trackingNumber: `DHL-ADV-${Date.now()}`,
      carrier: "dhl",
    });
    const unsigned = software.tracking.ingestVerifiedCarrierEvent(db, {
      shipmentId: created.shipment.id,
      verification: software.carrierWebhooks.verifyCarrierWebhook({ carrier: "dhl", rawBody: "{}", signature: "nope" }),
      mappedEvent: { status: "IN_TRANSIT" },
    });
    expect(unsigned.ok).toBe(false);
    expect(unsigned.reason).toBe("NOT_CONFIGURED");

    const prev = process.env.DHL_WEBHOOK_SECRET;
    process.env.DHL_WEBHOOK_SECRET = "unit-secret";
    try {
      const rawBody = JSON.stringify({ event: "delayed", id: "evt-1" });
      const signature = require("node:crypto").createHmac("sha256", "unit-secret").update(rawBody).digest("hex");
      const verification = software.carrierWebhooks.verifyCarrierWebhook({
        carrier: "dhl",
        rawBody,
        signature,
      });
      expect(verification.verified).toBe(true);
      const mapped = software.carrierWebhooks.mapCarrierEvent({ event: "delayed", eventId: "evt-1" });
      expect(mapped.status).toBe("DELAYED");
      const first = software.tracking.ingestVerifiedCarrierEvent(db, {
        shipmentId: created.shipment.id,
        verification,
        mappedEvent: mapped,
        occurredAt: "2026-10-17T08:00:00.000Z",
      });
      expect(first.ok).toBe(true);
      expect(first.duplicate).toBe(false);
      const dup = software.tracking.ingestVerifiedCarrierEvent(db, {
        shipmentId: created.shipment.id,
        verification,
        mappedEvent: mapped,
        occurredAt: "2026-10-17T09:00:00.000Z",
      });
      expect(dup.duplicate).toBe(true);
      const denied = software.tracking.getForCustomer(db, {
        shipmentId: created.shipment.id,
        customerId: "someone-else",
      });
      expect(denied.denied).toBe(true);
    } finally {
      if (prev === undefined) delete process.env.DHL_WEBHOOK_SECRET;
      else process.env.DHL_WEBHOOK_SECRET = prev;
    }
  });

  it("voice STT/TTS/WebRTC/Realtime/digital-human stay blocked and can hand off text to Pusat", () => {
    expect(software.voice.sttTranscribe().live).toBe(false);
    expect(software.voice.ttsSpeak().audio).toBeNull();
    expect(software.voice.webrtcSignal().webrtcConnected).toBe(false);
    expect(software.voice.iceConfig().urlsExposed).toBe(false);
    expect(software.voice.realtimeSession().reason).toMatch(/REALTIME_/);
    expect(software.voice.digitalHumanSession().videoOpen).toBe(false);
    const handoff = software.voice.handoffToPusat({ text: "siparis durumu" });
    expect(handoff.pusat).toBe(true);
    expect(handoff.callStarted).toBe(false);
    expect(software.voice.mockSession({ adapter: "nope" }).reason).toBe("UNKNOWN_ADAPTER");
  });

  it("marketplace transform is local-only and publish stays blocked", () => {
    const missing = software.marketplace.transformListing({ channel: "amazon" });
    expect(missing.ok).toBe(false);
    const transformed = software.marketplace.transformListing({
      channel: "amazon",
      sku: "SKU-ADV-1",
      price: 12.5,
      category: "auto",
    });
    expect(transformed.ok).toBe(true);
    expect(transformed.published).toBe(false);
    expect(transformed.live).toBe(false);
    expect(software.marketplace.publishListing({ channel: "amazon", sku: "SKU-ADV-1", price: 12.5 }).reason).toBe(
      "PUBLISH_BLOCKED"
    );
  });

  it("pricing floor remains €0.50 and undercut is not implemented", () => {
    const quote = software.pricing.quote({
      supplierCost: 10,
      shippingCost: 2,
      paymentFee: 0,
      taxRate: 0.19,
      marketplaceCommissionRate: 0,
      returnReserve: 0,
    });
    expect(quote.minNetProfitEur).toBe(0.5);
    expect(quote.saleApproved).toBe(true);
    expect(quote.netProfit + 1e-9).toBeGreaterThanOrEqual(0.5);
    const { MARKET_UNDERCUT_IMPLEMENTED } = require("../lib/pusat/constants");
    expect(MARKET_UNDERCUT_IMPLEMENTED).toBe(false);
  });
});
