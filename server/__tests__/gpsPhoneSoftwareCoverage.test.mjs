import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("GPS / phone software — established fail-closed (not live GPS or Twilio)", () => {
  let software;
  let db;

  beforeAll(() => {
    software = require("../lib/software");
    db = require("../lib/db").db;
    software.initialize(db);
  });

  it("synthetic map fixtures stay simulated and confirmLiveGps never invents a fix", () => {
    expect(software.liveMap.telematicsFeedConfigured()).toBe(false);
    expect(software.liveMap.confirmLiveGps().reason).toBe("LIVE_GPS_BLOCKED");
    expect(software.liveMap.confirmLiveGps().coordinates).toBeNull();
    expect(software.liveMap.ingestGpsFix().reason).toBe("GPS_INGEST_BLOCKED");
    expect(software.liveMap.ingestGpsFix().ingested).toBe(false);
    expect(software.liveMap.fixturePoint({ latitude: 41.0, longitude: 29.0 }).reason).toBe("SIMULATED_FLAG_REQUIRED");
    const point = software.liveMap.fixturePoint({ latitude: 41.0, longitude: 29.0, simulated: true });
    expect(point.ok).toBe(true);
    expect(point.liveGps).toBe(false);
    expect(point.telematics).toBe(false);
    const projected = software.liveMap.projectShipment({
      status: "IN_TRANSIT",
      location: { type: "carrier_gps", gpsInvented: false, latitude: 52.5, longitude: 13.4 },
    });
    expect(projected.liveGps).toBe(false);
    expect(projected.latitude).toBeNull();
    expect(projected.longitude).toBeNull();
    expect(projected.points).toEqual([]);
    const customer = software.liveMap.customerProjection({ status: "IN_TRANSIT" });
    expect(customer.coordinatesHidden).toBe(true);
    expect(customer.liveGps).toBe(false);
  });

  it("ETA GPS claims fail closed even when telematicsAuthorized is set", () => {
    const without = software.eta.evaluateShipment({
      status: "IN_TRANSIT",
      lastUpdate: new Date().toISOString(),
      latitude: 52.5,
      longitude: 13.4,
    });
    expect(without.ok).toBe(false);
    expect(without.reason).toBe("GPS_CLAIM_WITHOUT_TELEMATICS");
    expect(without.gps).toBe(false);

    const flagged = software.eta.evaluateShipment({
      status: "IN_TRANSIT",
      lastUpdate: new Date().toISOString(),
      latitude: 52.5,
      longitude: 13.4,
      telematicsAuthorized: true,
    });
    expect(flagged.ok).toBe(false);
    expect(flagged.reason).toBe("LIVE_GPS_FEED_NOT_CONFIGURED");
    expect(flagged.gps).toBe(false);
    expect(flagged.live).toBe(false);

    const schedule = software.eta.scheduleEta({ methodId: "standard", country: "DE" });
    expect(schedule.gps).toBe(false);
    expect(schedule.liveMap).toBe(false);
  });

  it("tracking events with GPS claims are not stored as carrier GPS", () => {
    const created = software.tracking.createShipment(db, {
      orderId: `ord-gps-${Date.now()}`,
      customerId: "cust-gps",
      trackingNumber: `DHL-GPS-${Date.now()}`,
      carrier: "dhl",
    });
    expect(created.ok).toBe(true);
    expect(created.shipment.liveGps).toBe(false);

    const gpsEvent = software.tracking.appendEvent(db, created.shipment.id, {
      status: "IN_TRANSIT",
      latitude: 52.5,
      longitude: 13.4,
      carrierGps: true,
    });
    expect(gpsEvent.ok).toBe(false);
    expect(gpsEvent.reason).toBe("GPS_CLAIM_WITHOUT_TELEMATICS");
    expect(gpsEvent.statusAdvanced).toBe(false);

    const scan = software.tracking.appendEvent(db, created.shipment.id, {
      status: "IN_TRANSIT",
      description: "departed depot",
      occurredAt: "2026-10-17T12:00:00.000Z",
    });
    expect(scan.ok).toBe(true);
    expect(scan.liveGps).toBe(false);
    expect(scan.carrierGps).toBe(false);
    expect(scan.locationType).toBe("carrier_event");

    const view = software.tracking.customerView(db, {
      shipmentId: created.shipment.id,
      customerId: "cust-gps",
    });
    expect(view.ok).toBe(true);
    expect(view.liveGps).toBe(false);
    expect(view.shipment.location.latitude).toBeNull();
    expect(view.shipment.location.longitude).toBeNull();
    expect(view.shipment.location.liveGps).toBe(false);
  });

  it("shipmentGate rejects GPS location even with a telematics flag", () => {
    const gate = require("../lib/software/shipmentGate");
    const unauthorized = gate.evaluate(db, {
      locationType: "carrier_gps",
      telematicsAuthorized: false,
      confirmationRequired: false,
    });
    expect(unauthorized.allowed).toBe(false);
    expect(unauthorized.reasons).toContain("GPS_NOT_AUTHORITATIVE");
    expect(unauthorized.shipmentCreated).toBe(false);

    const flagged = gate.evaluate(db, {
      locationType: "carrier_gps",
      telematicsAuthorized: true,
      confirmationRequired: false,
    });
    expect(flagged.allowed).toBe(false);
    expect(flagged.reasons).toContain("TELEMATICS_FEED_NOT_CONFIGURED");
    expect(flagged.shipmentCreated).toBe(false);

    const fabricated = gate.evaluate(db, {
      gpsInvented: true,
      confirmationRequired: false,
    });
    expect(fabricated.reasons).toContain("GPS_FABRICATION_REJECTED");
  });

  it("carrier lookup and GPS poll stay scan-only", () => {
    const lookup = software.carriers.lookup({ carrier: "dhl", trackingNumber: "1Z999" });
    expect(lookup.liveGps).toBe(false);
    expect(lookup.latitude).toBeNull();
    expect(lookup.note).toMatch(/not live GPS/i);
    const poll = software.carriers.pollGps();
    expect(poll.reason).toBe("CARRIER_GPS_POLL_BLOCKED");
    expect(poll.liveGps).toBe(false);
    expect(software.carriers.health().liveGps).toBe(false);
    expect(software.carrierWebhooks.pollCarrierTracking().liveGps).toBe(false);
  });

  it("voice/phone adapters never start a call even when probe env is set", () => {
    const prev = process.env.BUZZARD_VOICE_LIVE_PROBE;
    const sid = process.env.TWILIO_ACCOUNT_SID;
    process.env.BUZZARD_VOICE_LIVE_PROBE = "1";
    process.env.TWILIO_ACCOUNT_SID = "ACpresence-only";
    try {
      expect(software.voice.startCall().reason).toBe("CALL_START_BLOCKED");
      expect(software.voice.startCall().callStarted).toBe(false);
      expect(software.voice.inboundWebhook().reason).toBe("TWILIO_INBOUND_BLOCKED");
      expect(software.voice.inboundWebhook().mediaOpen).toBe(false);
      expect(software.voice.confirmLiveCall().liveVerified).toBe(false);
      expect(software.voice.sttTranscribe().transcript).toBeNull();
      expect(software.voice.ttsSpeak().audio).toBeNull();
      expect(software.voice.webrtcSignal().webrtcConnected).toBe(false);
      expect(software.voice.iceConfig().urlsExposed).toBe(false);
      expect(software.voice.health().callStarted).toBe(false);
      expect(software.voice.health().twilioLive).toBe(false);
      expect(software.voice.adapterStatus("twilio").live).toBe(false);
      expect(software.voice.adapterStatus("twilio").callStarted).toBe(false);
      const text = software.voice.handoffToPusat({ text: "kargo nerede" });
      expect(text.pusat).toBe(true);
      expect(text.callStarted).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.BUZZARD_VOICE_LIVE_PROBE;
      else process.env.BUZZARD_VOICE_LIVE_PROBE = prev;
      if (sid === undefined) delete process.env.TWILIO_ACCOUNT_SID;
      else process.env.TWILIO_ACCOUNT_SID = sid;
    }
  });
});
