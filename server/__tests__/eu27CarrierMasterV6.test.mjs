import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { load } = require("../lib/logistics/carrierMaster.js");
const { loadV5 } = require("../lib/logistics/carrierMasterV5.js");
const { loadV6, uniqueIdsV6 } = require("../lib/logistics/carrierMasterV6.js");
const { createAdapter, CARRIER_ERRORS, priorityCatalog } = require("../lib/logistics/v5/adapterFramework.js");
const { selectCarrier } = require("../lib/logistics/v5/selectionEngine.js");
const { signPayload, receiveWebhook, resetWebhooks } = require("../lib/logistics/v5/webhookReceiver.js");
const { withIdempotency, resetIdempotency } = require("../lib/logistics/v5/idempotency.js");
const { startReturn } = require("../lib/logistics/v5/returnsEngine.js");
const { policy, locateNetworks, healthMonitor } = require("../lib/logistics/v5/securityPolicy.js");
const { requestSelectionHold } = require("../lib/logistics/pusatLogistics.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

describe("EU27 carrier master v6", () => {
  it("preserves v1-v5 and does not claim complete or live carriers", () => {
    expect(existsSync("data/logistics/eu27_carrier_master.v5.json")).toBe(true);
    expect(load().uniqueVerifiedLegal).toBe(43);
    expect(loadV5().schema).toBe("buzzard.eu27-carrier-master.v5");
    expect(loadV6().schema).toBe("buzzard.eu27-carrier-master.v6");
    expect(uniqueIdsV6().unique).toBe(true);
    expect(loadV6().completeVerifiedCountries).toBe(0);
    expect(loadV6().technicallyUsableLiveCarriers).toBe(0);
    expect(loadV6().sandboxVerifiedCarriers).toBe(0);
    expect(loadV6().naceStatistics.historical197424.reproducedInEurostatPull2026_09_30).toBe(false);
    expect(loadV6().naceStatistics.eurostatSbs.eu27["2024"]).toBe(224523);
    expect(loadV6().ownFleetVerifiedCount).toBe(0);
    expect(loadV6().entities.every((e) => e.networkRole)).toBe(true);
  });

  it("keeps DHL GLS UPS at LEVEL 2 without sandbox success", () => {
    expect(priorityCatalog().every((c) => c.apiLevel === 2 && c.sandboxVerified === false)).toBe(true);
    expect(loadV6().apiCatalog.every((c) => c.accessConditions)).toBe(true);
  });

  it("adapter contract: invalid address, size, postcode, outage, timeout, live block", () => {
    const a = createAdapter({ carrierId: "dhl-parcel-de", apiLevel: 2 });
    expect(a.validateAddress({}).ok).toBe(false);
    expect(a.validateAddress({}).mock).toBe(false);
    expect(a.validateAddress({}).error.code).toBe("MISSING_ADDRESS");
    expect(a.validateAddress({}).validatedAddress).toBeNull();
    expect(a.getRates({ weightKg: 5000 }).error.code).toBe(CARRIER_ERRORS.UNSUPPORTED_PARCEL_SIZE);
    expect(a.getCoverage("ABC", "DE").error.code).toBe(CARRIER_ERRORS.UNSUPPORTED_POSTCODE);
    expect(a.createShipment({}).blocked).toBe(true);
    expect(a.trackShipment("").ok).toBe(false);
    expect(a.trackShipment("").code).toBe("MISSING_TRACKING_NUMBER");
    expect(a.trackShipment("").mock).toBe(false);
    expect(a.trackShipment("").trackingNumber).toBeNull();
    const down = createAdapter({ outage: true });
    expect(down.getRates().error.code).toBe(CARRIER_ERRORS.CARRIER_OUTAGE);
    const slow = createAdapter({ forceTimeout: true });
    expect(slow.getRates().error.code).toBe(CARRIER_ERRORS.TIMEOUT);
  });

  it("webhook signature, replay, idempotency, returns, security, pusat hold", () => {
    resetWebhooks();
    resetIdempotency();
    const secret = "test-only-not-a-production-secret";
    const ts = Date.now();
    const body = JSON.stringify({ mock: true, accepted: true, delivered: true, shipped: true, trackingNumber: "FAKE1" });
    const sig = signPayload(secret, String(ts), body);
    const ok = receiveWebhook({ secret, timestamp: ts, signature: sig, rawBody: body, eventId: "e1" });
    expect(ok.signatureVerified).toBe(true);
    expect(ok.accepted).toBe(false);
    expect(ok.shipped).toBe(false);
    expect(ok.delivered).toBe(false);
    expect(ok.ok).toBe(false);
    expect(ok.mock).toBe(false);
    expect(ok.status).toBe("BLOCKED_EXTERNAL");
    expect(ok.shipmentCreated).toBe(false);
    expect(ok.supplierOrderCreated).toBe(false);
    expect(ok.trackingNumber).toBeNull();
    expect(ok.supplierOrderNumber).toBeNull();
    expect(ok.shipmentId).toBeNull();
    const [replayed, repeated] = [
      receiveWebhook({ secret, timestamp: ts, signature: sig, rawBody: body, eventId: "e1" }),
      receiveWebhook({ secret, timestamp: ts, signature: sig, rawBody: body, eventId: "e1" }),
    ];
    expect(replayed.reason).toBe("REPLAY");
    expect(repeated.reason).toBe("REPLAY");
    expect(replayed.accepted).toBe(false);
    expect(repeated.shipmentCreated).toBe(false);
    expect(receiveWebhook({ secret, timestamp: ts, signature: "deadbeef", rawBody: body, eventId: "e2" }).reason).toBe("INVALID_SIGNATURE");
    const first = withIdempotency("k1", "h", () => ({ ok: true, n: 1 }));
    const replay = withIdempotency("k1", "h", () => ({ ok: true, n: 2 }));
    expect(replay.idempotencyReplay).toBe(true);
    expect(replay.n).toBe(1);
    expect(withIdempotency("k1", "other", () => ({ ok: true })).error).toBe("IDEMPOTENCY_PAYLOAD_CONFLICT");
    expect(startReturn({ shipmentId: "MOCK" }).supplierRefundReceived).toBe(false);
    expect(policy().webhookSignatureRequired).toBe(true);
    expect(policy().storedSecretValues).toBe(0);
    expect(healthMonitor({ outage: true }).status).toBe("OUTAGE");
    expect(locateNetworks({ country: "LV", lockers: loadV6().lockers }).lockers.length).toBeGreaterThan(0);
    expect(requestSelectionHold({ destination: "XX" }).liveShipment).toBe(false);
    expect(isSalesEnabled()).toBe(false);
    const hold = selectCarrier({ destination: "US", postalCode: "10001" });
    expect(hold.status).toBe("HOLD_FOR_REVIEW");
    expect(hold.customerDeliveryDate).toBeUndefined();
  });
});
