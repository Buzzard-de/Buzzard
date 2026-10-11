import { describe, it, expect, beforeAll } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("software commercial lifecycle — non-production traces", () => {
  let software;
  let pusat;
  let db;
  let salesMode;
  let result;

  beforeAll(() => {
    software = require("../lib/software");
    pusat = require("../lib/pusat");
    db = require("../lib/db").db;
    salesMode = require("../lib/salesMode");
    pusat.initialize(db);
    software.initialize(db);
    result = software.lifecycle.runCommercialLifecycle(software, db, {
      sku: `SW-LC-${Date.now()}`,
      customerId: "cust_lifecycle",
    });
  });

  it("runs every lifecycle stage without commercial side effects", () => {
    expect(salesMode.isSalesEnabled()).toBe(false);
    expect(result.ok).toBe(true);
    expect(result.failed).toEqual([]);
    expect(result.traces).toHaveLength(11);
    expect(result.commercialOrders).toBe(0);
    expect(result.paymentExecuted).toBe(false);
    expect(result.refundExecuted).toBe(false);
    expect(result.supplierOrderSent).toBe(false);
    expect(result.productActivated).toBe(false);
    expect(result.listingPublished).toBe(false);
    expect(result.customerMessageSent).toBe(false);
    expect(result.carrierAction).toBe(false);
    expect(result.salesEnabled).toBe(false);
    expect(result.productSourceOfTruthActive).toBe(false);
    expect(result.productionVerified).toBe(false);
    expect(result.live).toBe(false);
  });

  it("records a structured trace for each A–K stage", () => {
    const ids = result.traces.map((row) => row.id);
    expect(ids).toEqual([
      "A-product",
      "B-pricing",
      "C-inventory",
      "D-order",
      "E-payment",
      "F-supplier",
      "G-carrier",
      "H-returns",
      "I-communications",
      "J-marketplace",
      "K-reporting",
    ]);
    for (const row of result.traces) {
      expect(row.pass).toBe(true);
      expect(row.initialState).toEqual(expect.any(Object));
      expect(row.events.length).toBeGreaterThan(0);
      expect(row.expectedTransition).toEqual(row.actualTransition);
      expect(row.ledger).toEqual(expect.any(Object));
      expect(row.security).toEqual(expect.any(Object));
      expect(row.finalState).toEqual(expect.any(Object));
      expect(row.evidence).toMatch(/server\/lib|software_/);
    }
  });

  it("persists the lifecycle audit without secrets or live flags", () => {
    const audit = db.prepare("SELECT * FROM software_audit WHERE id = ?").get(result.audit.id);
    expect(audit.kind).toBe("commercial_lifecycle");
    const details = JSON.parse(audit.details_json);
    expect(details.commercialOrders).toBe(0);
    expect(details.paymentExecuted).toBe(false);
    expect(details.listingPublished).toBe(false);
    expect(JSON.stringify({ result, audit })).not.toMatch(/sk-|whsec_|BEGIN PRIVATE|TWILIO_AUTH_TOKEN=/);
  });

  it("keeps classification-only marketplaces on a safe unpublished interface", () => {
    const otto = software.marketplace.createSafeAdapter("otto");
    expect(otto.safeInterface).toBe(true);
    expect(otto.adapterExists).toBe(false);
    expect(otto.liveEndpoint).toBeNull();
    expect(otto.publish().reason).toBe("PUBLISH_BLOCKED");
    expect(software.marketplace.listSafeAdapters()).toHaveLength(11);
  });

  it("does not collapse process health into provider or production readiness", () => {
    const health = software.health();
    expect(health.readiness.processAlive).toBe(true);
    expect(health.readiness.providerReachable).toBe(false);
    expect(health.readiness.providerAuthenticated).toBe(false);
    expect(health.readiness.providerEndToEndVerified).toBe(false);
    expect(health.readiness.productionVerified).toBe(false);
    expect(health.liveReady).toBe(false);
  });
});
