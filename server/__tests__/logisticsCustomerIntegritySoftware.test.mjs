import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("logistics and customer-service infrastructure — established fail-closed", () => {
  it("never buys labels, polls GPS, or sends customer messages", () => {
    const { logisticsCustomerIntegrity } = require("../lib/software");
    const inspect = logisticsCustomerIntegrity.inspect();
    expect(inspect.salesEnabled).toBe(false);
    expect(inspect.labelPurchased).toBe(false);
    expect(inspect.liveGps).toBe(false);
    expect(inspect.customerSendLive).toBe(false);
    expect(inspect.siemExported).toBe(false);
    expect(logisticsCustomerIntegrity.purchaseLabel({ carrier: "dhl" }).reason).toBe("LABEL_PURCHASE_BLOCKED");
    expect(logisticsCustomerIntegrity.createShipment({ carrier: "ups" }).created).toBe(false);
    expect(logisticsCustomerIntegrity.bookPickup().booked).toBe(false);
    expect(logisticsCustomerIntegrity.pollGps().reason).toBe("CARRIER_GPS_POLL_BLOCKED");
    expect(logisticsCustomerIntegrity.ingestGps().ingested).toBe(false);
    expect(logisticsCustomerIntegrity.scheduleEta({ country: "DE" }).gps).toBe(false);
    expect(logisticsCustomerIntegrity.confirmDelivery().reason).toBe("DELIVERY_CONFIRM_BLOCKED");
    expect(logisticsCustomerIntegrity.markSent().reason).toBe("HUMAN_SEND_REQUIRED");
    expect(logisticsCustomerIntegrity.approveSend({ actor: "pusat" }).reason).toBe("SELF_APPROVE_DENIED");
    expect(logisticsCustomerIntegrity.approveSend({ actor: "operator" }).reason).toBe("HUMAN_SEND_REQUIRED");
  });

  it("rate-limits customer login, hashes reset tokens, and denies cross-customer orders", () => {
    const { logisticsCustomerIntegrity } = require("../lib/software");
    const rate = logisticsCustomerIntegrity.probeLoginRateLimit();
    expect(rate.loginMax).toBe(8);
    expect(rate.loginWindowMs).toBe(15 * 60 * 1000);
    expect(rate.firstInvalid).toBe(true);
    expect(rate.firstSessionCreated).toBe(false);
    expect(rate.sessionCreated).toBe(false);
    const reset = logisticsCustomerIntegrity.inspectResetStore();
    expect(reset.storedPlaintext).toBe(false);
    expect(reset.hashedAtRest).toBe(true);
    expect(reset.httpIncludesToken).toBe(false);
    expect(reset.liveEmail).toBe(false);
    const missing = logisticsCustomerIntegrity.ownOrder({ orderId: "ord_x" });
    expect(missing.denied).toBe(true);
    expect(missing.reason).toBe("CUSTOMER_REQUIRED");
    const idor = logisticsCustomerIntegrity.assertOwner({
      orderCustomerId: "cust_a",
      requesterCustomerId: "cust_b",
    });
    expect(idor.denied).toBe(true);
    expect(idor.reason).toBe("ACCESS_DENIED");
  });

  it("keeps returns independent of supplier credit and local events off SIEM", () => {
    const software = require("../lib/software");
    const db = require("../lib/db").db;
    const opened = software.logisticsCustomerIntegrity.openReturn(db, {
      orderNumber: `CX-${Date.now()}`,
      customerId: "cust_cx",
      reason: "defective",
      refundAmount: 9,
    });
    expect(opened.ok).toBe(true);
    expect(opened.refundExecuted).toBe(false);
    expect(opened.supplierCredit.assumedFromCustomerRefund).toBe(false);
    const event = software.logisticsCustomerIntegrity.recordLocalEvent({ resourceId: opened.id });
    expect(event.ok).toBe(true);
    expect(event.siemExported).toBe(false);
    expect(software.logisticsCustomerIntegrity.exportSiem().reason).toBe("SIEM_EXPORT_BLOCKED");
    const ship = software.logisticsCustomerIntegrity.evaluateShipment(db, { orderId: "ord_cx" });
    expect(ship.allowed).toBe(false);
    expect(ship.shipmentCreated).toBe(false);
    expect(ship.reasons).toContain("SALES_LOCKED");
  });
});
