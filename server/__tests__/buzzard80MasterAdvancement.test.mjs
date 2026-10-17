import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Buzzard 80 master advancement — local fail-closed", () => {
  it("health exception snapshot never claims live recovery or sensitive retry", () => {
    const software = require("../lib/software");
    const db = require("../lib/db").db;
    software.initialize(db);
    const health = software.health();
    expect(health.salesEnabled).toBe(false);
    expect(health.productSourceOfTruthActive).toBe(false);
    expect(health.liveReady).toBe(false);
    expect(health.exceptions.liveRecovery).toBe(false);
    expect(health.exceptions.sensitiveRetry).toBe(false);
    expect(health.exceptions.productionVerified).toBe(false);
    expect(health.exceptions.total).toBeGreaterThanOrEqual(0);
    expect(health.marketUndercutImplemented).toBe(false);
  });

  it("carrier label/shipment and customer send stay non-retryable", () => {
    const pusat = require("../lib/pusat");
    for (const action of [
      "carrier.label.purchase",
      "carrier.shipment.create",
      "customer.message.send",
      "marketplace.publish",
      "payment.refund",
    ]) {
      const classified = pusat.exceptions.classify(new Error("blip"), { action });
      expect(classified.retryable).toBe(false);
      expect(classified.sensitive).toBe(true);
    }
  });

  it("forceSend and consent still do not send customer messages", () => {
    const software = require("../lib/software");
    const db = require("../lib/db").db;
    software.initialize(db);
    const drafted = software.communications.draft(db, {
      message: "Wo ist meine Bestellung?",
      customerId: "c-80-master",
    });
    expect(drafted.sent).toBe(false);
    expect(drafted.locale).toBe("de");
    const sent = software.communications.sendPrepared(db, drafted.draft.id, {
      forceSend: true,
      consentGranted: true,
    });
    expect(sent.sent).toBe(false);
    expect(sent.blocked).toBe(true);
    expect(sent.forceSendIgnored).toBe(true);
    expect(sent.consentDoesNotSend).toBe(true);
    expect(sent.live).toBe(false);
  });

  it("refund and supplier credit stay separate; GPS stays simulated", () => {
    const software = require("../lib/software");
    const credit = software.supplierCredit.recordCredit({ supplier: "ic", amount: 12 });
    expect(credit.distinctFromCustomerRefund).toBe(true);
    expect(credit.executed).toBe(false);
    const map = software.liveMap.fixturePoint({ latitude: 52.52, longitude: 13.4, simulated: true });
    expect(map.simulated).toBe(true);
    expect(map.liveGps).toBe(false);
    const live = software.liveMap.fixturePoint({ latitude: 52.52, longitude: 13.4, simulated: false });
    expect(live.ok).toBe(false);
  });
});
