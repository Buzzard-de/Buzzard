import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { assessShipping, evaluateOffer, carrierRateStatus, readSuppliedShipping, selectTransportCost, priceWithTransport } = require("../lib/commerce/pricingPolicy.js");
const { analyze } = require("../lib/buzzardNative/sinan/repoAnalysis.js");
const shippingProvider = require("../lib/commerce/shippingProvider.js");
const shippingEngine = require("../lib/shippingEngine.js");
const dbShipping = require("../lib/dbShipping.js");
const { quoteLane, compareCarriers } = require("../lib/commerce/ab27Logistics.js");
const { dryRun } = require("../lib/commerce/carrierAdapters.js");
const { assertCommercialCheckout } = require("../lib/commerce/pricingIntegration.js");
const { calculateTaxSync } = require("../lib/commercialIntegrations.js");
const { isSalesEnabled } = require("../lib/salesMode.js");
const logisticsFulfillment = require("../lib/logisticsFulfillment.js");
const orderManagement = require("../lib/orderManagement.js");
const orderService = require("../lib/commerce/orderService.js");

const evidence = {
  country: "DE",
  zone: "DE-10115",
  weightKg: 2.4,
  dimensions: { lengthCm: 30, widthCm: 20, heightCm: 10 },
  service: "standard",
  carrier: "DHL",
  shippingCost: 6.4,
  verified: true,
};

function calculatedQuote() {
  const offer = evaluateOffer({
    supplierCost: 10,
    shippingCost: 2,
    marketplaceFee: 1,
    paymentFee: 0.5,
    returnReserve: 0.4,
    offerPrice: 20,
    vatAmount: 0,
    vatVerified: true,
    currency: "EUR",
  });
  return {
    offer,
    quote: { policyStatus: offer.status, commerciallyEligible: offer.eligible === true, invented: false },
  };
}

describe("shipping rate authority", () => {
  it("keeps a missing tariff unknown for each country and zone", () => {
    for (const country of ["DE", "FR", "PL"]) {
      for (const zone of ["DE-10115", "FR-75001", "PL-00-001"]) {
        const row = assessShipping({ country, zone });
        expect(row.shippingCost).toBeNull();
        expect(row.status).toBe("SHIPPING_RATE_UNVERIFIED");
        expect(row.commercialEligibility).toBe("BLOCKED");
        expect(row.integration).toBe("BLOCKED");
        expect(JSON.stringify(row)).not.toContain("4.99");
        expect(JSON.stringify(row)).not.toContain("9.99");
      }
    }
  });

  it("does not turn a missing offer shipping cost into zero", () => {
    expect(readSuppliedShipping(undefined).amount).toBeNull();
    expect(readSuppliedShipping(null).amount).toBeNull();
    expect(readSuppliedShipping(0).amount).toBeNull();
    expect(readSuppliedShipping(0).commercialEligibility).toBe("BLOCKED");
    const supplied = readSuppliedShipping(6.5);
    expect(supplied.amount).toBe(6.5);
    expect(supplied.commercialEligibility).toBe("BLOCKED");
  });

  it("rejects a zero, negative, or non-numeric rate", () => {
    const zero = assessShipping({ ...evidence, shippingCost: 0, service: "standard" });
    expect(zero.shippingCost).toBeNull();
    expect(zero.code).toBe("ZERO_RATE_REJECTED");
    expect(zero.commercialEligibility).toBe("BLOCKED");
    const negative = assessShipping({ ...evidence, shippingCost: -1 });
    expect(negative.code).toBe("INVALID_SHIPPING_RATE");
    expect(negative.shippingCost).toBeNull();
    const invalid = assessShipping({ ...evidence, shippingCost: "unknown" });
    expect(invalid.shippingCost).toBeNull();
    expect(invalid.commercialEligibility).toBe("BLOCKED");
  });

  it("accepts only a complete verified local tariff and still does not call a carrier", () => {
    const verified = assessShipping(evidence);
    expect(verified.ok).toBe(true);
    expect(verified.shippingCost).toBe(6.4);
    expect(verified.status).toBe("VERIFIED");
    expect(verified.commercialEligibility).toBe("ELIGIBLE");
    expect(verified.live).toBe(false);
    expect(verified.integration).toBe("BLOCKED");
    const unverified = assessShipping({ ...evidence, verified: false });
    expect(unverified.shippingCost).toBeNull();
    expect(unverified.commercialEligibility).toBe("BLOCKED");
  });

  it("does not let the provider, engine, or country table invent 4.99 or 9.99", () => {
    const provider = shippingProvider.calculateShipping({ methodId: "standard", country: "DE", subtotal: 120 });
    const engine = shippingEngine.calculateShipping({ methodId: "express", country: "FR", subtotal: 200 });
    const table = dbShipping.calculateShipping("DE", 3, 50);
    expect(provider.price).toBeNull();
    expect(provider.shippingCost).toBeNull();
    expect(engine.shipping).toBeNull();
    expect(engine.shippingCost).toBeNull();
    expect(table.shippingCost).toBeNull();
    for (const row of [provider, engine, table]) {
      expect(row.commercialEligibility).toBe("BLOCKED");
      expect(JSON.stringify(row)).not.toContain("4.99");
      expect(JSON.stringify(row)).not.toContain("9.99");
    }
    expect(shippingProvider.listMethods().every((method) => method.price == null)).toBe(true);
    expect(shippingProvider.getProviderHealth().adapters.every((row) => row.integration === "BLOCKED")).toBe(true);
  });

  it("reports DHL, DPD, GLS, Hermes, and UPS as blocked", () => {
    const names = carrierRateStatus().map((row) => row.carrier);
    expect(names).toEqual(["DHL", "DPD", "GLS", "HERMES", "UPS"]);
    expect(carrierRateStatus().every((row) => row.live === false && row.shippingCost == null)).toBe(true);
    const quote = dryRun({ network: "DHL", destination: "DE", action: "quote" });
    expect(quote.integration).toBe("BLOCKED");
    expect(quote.shippingCost).toBeNull();
    expect(quote.ok).toBe(false);
  });

  it("blocks payment when the sale price is calculated but shipping is unknown", () => {
    const { offer, quote } = calculatedQuote();
    expect(offer.status).toBe("CALCULATED");
    expect(quote.commerciallyEligible).toBe(true);
    const blocked = assertCommercialCheckout({ quote, shipping: assessShipping({ country: "DE" }) });
    expect(blocked.ok).toBe(false);
    expect(blocked.code).toBe("SHIPPING_RATE_UNVERIFIED");
    expect(blocked.commercialEligibility).toBe("BLOCKED");
    expect(blocked.orderCreated).toBe(false);
    expect(blocked.paymentAuthorized).toBe(false);
    const open = assertCommercialCheckout({ quote, shipping: assessShipping(evidence) });
    expect(open.ok).toBe(false);
    expect(open.code).toBe("SALES_CLOSED");
    expect(open.commercialEligibility).toBe("BLOCKED");
    expect(open.checkoutAllowed).toBe(false);
    expect(open.paymentAuthorized).toBe(false);
    expect(open.orderCreated).toBe(false);
    expect(open.salesEnabled).toBe(false);
    expect(isSalesEnabled()).toBe(false);
  });

  it("selects the lowest verified suitable transport cost and blocks the rest", () => {
    const lane = {
      origin: "DE-WH-1",
      country: "FR",
      zone: "FR-75001",
      weightKg: 2,
      dimensions: { lengthCm: 30, widthCm: 20, heightCm: 10 },
    };
    const rates = [
      { carrier: "DHL", service: "standard", amount: 8.5, verified: true, suitable: true, contracted: true },
      { carrier: "DPD", service: "standard", amount: 1.2, verified: true, suitable: true },
      { carrier: "GLS", service: "standard", amount: 0.8, verified: true, suitable: false },
      { carrier: "UPS", service: "express", amount: 0.5, verified: false, suitable: true },
      { carrier: "HERMES", service: "standard", amount: 4.99, verified: true, suitable: true, countries: ["DE"] },
    ];
    const selected = selectTransportCost({ ...lane, rates });
    expect(selected.ok).toBe(true);
    expect(selected.shippingCost).toBe(1.2);
    expect(selected.selected.carrier).toBe("DPD");
    expect(selected.live).toBe(false);
    expect(selected.integration).toBe("BLOCKED");
    expect(selected.compared.map((row) => row.amount)).toEqual([1.2, 8.5]);
    const missing = selectTransportCost({ ...lane, weightKg: null, rates });
    expect(missing.shippingCost).toBeNull();
    expect(missing.commercialEligibility).toBe("BLOCKED");
    const priced = priceWithTransport({
      ...lane,
      rates,
      offerPrice: 30,
      supplierCost: 10,
      marketplaceFee: 1,
      paymentFee: 0.4,
      returnReserve: 0.3,
      vatAmount: 0,
      vatVerified: true,
      currency: "EUR",
    });
    expect(priced.shippingCost).toBe(1.2);
    expect(priced.status).toBe("CALCULATED");
    const blocked = priceWithTransport({ ...lane, rates: [], offerPrice: 30, supplierCost: 10 });
    expect(blocked.status).toBe("BLOCKED");
    expect(blocked.shippingCost).toBeNull();
    expect(blocked.profit).toBeNull();
  });

  it("uses zero additional shipping only when inclusion is proven", () => {
    const lane = {
      origin: "NL-WH",
      country: "DE",
      zone: "DE-10115",
      weightKg: 1,
      dimensions: { lengthCm: 10, widthCm: 10, heightCm: 10 },
      rates: [{ carrier: "DHL", service: "standard", amount: 8.5, verified: true, suitable: true }],
    };
    const unproven = selectTransportCost({ ...lane, shippingIncluded: true });
    expect(unproven.shippingCost).toBeNull();
    expect(unproven.code).toBe("INCLUDED_SHIPPING_UNPROVEN");
    const included = selectTransportCost({
      ...lane,
      shippingIncluded: true,
      inclusionEvidence: { supplierOfferId: "SUP-1" },
    });
    expect(included.shippingCost).toBe(0);
    expect(included.carrierRatesIgnored).toBe(true);
    expect(included.inclusionEvidence.supplierOfferId).toBe("SUP-1");
    const offer = priceWithTransport({
      ...lane,
      shippingIncluded: true,
      inclusionEvidence: { supplierOfferId: "SUP-1" },
      offerPrice: 20,
      supplierCost: 10,
      marketplaceFee: 1,
      paymentFee: 0.2,
      returnReserve: 0.2,
      vatAmount: 0,
      vatVerified: true,
    });
    expect(offer.shippingCost).toBe(0);
    expect(offer.transport.carrierRatesIgnored).toBe(true);
    const sinan = analyze({ actorId: "sinan_bey", root: "/tmp/buzzard-eu27" });
    expect(sinan.shippingCostPolicy.fixedDefault).toBe(false);
    expect(sinan.shippingCostPolicy.liveCarrierQuery).toBe(false);
  });

  it("connects every shipping calculator to the same verified examples", () => {
    const lane = {
      origin: "DE-WH-1",
      country: "PL",
      zone: "PL-00-001",
      weightKg: 3,
      dimensions: { lengthCm: 40, widthCm: 30, heightCm: 20 },
    };
    const rates = [
      { carrier: "DHL", service: "standard", amount: 8.5, verified: true, suitable: true, contracted: true },
      { carrier: "DPD", service: "standard", amount: 1.2, verified: true, suitable: true },
      { carrier: "GLS", service: "standard", amount: 0.8, verified: true, suitable: true },
    ];
    const engine = shippingEngine.calculateShipping({ ...lane, rates });
    const table = dbShipping.calculateShipping({ ...lane, rates });
    const quote = logisticsFulfillment.quoteShipment({ ...lane, rates });
    expect(engine.shipping).toBe(0.8);
    expect(table.shippingCost).toBe(0.8);
    expect(quote.estimatedCost).toBe(0.8);
    expect(quote.quote.selected.carrier).toBe("GLS");
    expect(quote.live).toBe(false);
    const included = shippingEngine.calculateShipping({
      ...lane,
      rates,
      shippingIncluded: true,
      inclusionEvidence: { supplierOfferId: "SUP-INCLUDED" },
    });
    expect(included.shipping).toBe(0);
    expect(included.carrierRatesIgnored).toBe(true);
    const rules = JSON.stringify(shippingEngine.loadRules());
    expect(rules).not.toContain("5.99");
    expect(rules).not.toContain("12.99");
    const blockedQuote = logisticsFulfillment.quoteShipment({ country: "DE", weightKg: 1 });
    expect(blockedQuote.estimatedCost).toBeNull();
    expect(blockedQuote.tablePriceUsed).toBe(false);
    const legacyOrder = orderManagement.createOrder({
      items: [{ sku: "BZ-TEST", name: "Test", quantity: 1, unitPrice: 10 }],
      shippingTotal: 4.99,
      country: "DE",
    });
    expect(legacyOrder.orderCreated).toBe(false);
    expect(legacyOrder.shipping).toBeNull();
    expect(legacyOrder.error).toBe("SHIPPING_RATE_UNVERIFIED");
    const dryRun = orderService.createOrderFromCheckout({
      checkout: { id: "chk-ship", cartId: "none", totals: { shipping: null, subtotal: 10 } },
      orderType: "DRY_RUN",
    });
    expect(dryRun.orderCreated).toBe(false);
    expect(dryRun.shipping).toBeNull();
    expect(dryRun.code).toBe("SHIPPING_RATE_UNVERIFIED");
  });

  it("keeps missing marketplace, payment, and return costs blocked and does not invent VAT", () => {
    const missing = evaluateOffer({ supplierCost: 10, offerPrice: 20, currency: "EUR" });
    expect(missing.status).toBe("BLOCKED");
    expect(missing.code).toBe("MISSING_COST");
    expect(missing.missing).toEqual(expect.arrayContaining(["shippingCost", "marketplaceFee", "paymentFee", "returnReserve"]));
    const tax = calculateTaxSync("DE", 10, null);
    expect(tax.rate).toBeNull();
    expect(tax.tax).toBeNull();
    expect(tax.official).toBe(false);
    const lane = quoteLane({ destination: "FR", weightKg: 2 });
    expect(lane.shippingCost).toBeNull();
    expect(JSON.stringify(lane).includes("8.9")).toBe(false);
    const carriers = compareCarriers({ destination: "PL", weightKg: 4 });
    expect(carriers.selected).toBeNull();
    expect(carriers.options.every((row) => row.costEur == null)).toBe(true);
  });
});
