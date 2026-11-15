import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { checkoutVat, applyCoupon } = require("../lib/cartCheckout.js");
const { getDatabaseHealth } = require("../lib/db.js");
const { validateProduct } = require("../lib/productValidator.js");
const { getCountry } = require("../lib/buzzardNative/core/tax/countryRegistry.js");
const { carriers, payments } = require("../lib/commercialIntegrations.js");
const { createShipment } = require("../lib/dbCarriers.js");
const { calculateTax } = require("../lib/commerce/taxProvider.js");

describe("server checkout VAT", () => {
  it("keeps a missing country rate unknown", () => {
    const de = checkoutVat("DE");
    const missing = checkoutVat("");
    expect(de.rate).toBeNull();
    expect(de.tax).toBeNull();
    expect(de.official).toBe(false);
    expect(de.status).toBe("VAT_UNVERIFIED");
    expect(missing.rate).toBeNull();
    expect(missing.country).toBeNull();
  });

  it("does not invent a product VAT rate or parcel size", () => {
    const result = validateProduct({
      sku: "VAT-NULL-1",
      name: "Unverified part",
      supplier_id: "SUP-TEST",
      supplier_sku: "SUP-VAT-NULL-1",
      price: { amount: 10, currency: "EUR" },
    });
    expect(result.ok).toBe(true);
    expect(result.product.vat_rate).toBeNull();
    expect(result.product.vat_official).toBe(false);
    expect(result.product.vat_verified).toBe(false);
    const supplied = validateProduct({
      sku: "VAT-SUPPLIED-1",
      name: "Caller rate",
      supplier_id: "SUP-TEST",
      supplier_sku: "SUP-VAT-SUPPLIED-1",
      price: { amount: 19, currency: "EUR" },
      vat_rate: 19,
    });
    expect(supplied.ok).toBe(true);
    expect(supplied.product.vat_rate).toBeNull();
    expect(supplied.product.vat_source).toBe("UNKNOWN");
    expect(result.product.shipping.weight_kg).toBeNull();
    expect(result.product.shipping.length_cm).toBeNull();
    expect(result.product.shipping.status).toBe("UNKNOWN");
  });

  it("keeps EU country tax unofficial and does not assign the euro to every member", () => {
    const de = getCountry("DE");
    const pl = getCountry("PL");
    const bg = getCountry("BG");
    expect(de.currency).toBe("EUR");
    expect(de.vatVerified).toBe(false);
    expect(de.vatOfficial).toBe(false);
    expect(de.paymentConfig).toBe("UNKNOWN");
    expect(de.shippingConfig).toBe("UNKNOWN");
    expect(pl.currency).toBe("PLN");
    expect(pl.vatRate ?? pl.vatStandardRate).not.toBe(0);
    expect(bg.currency).toBe("UNKNOWN");
    expect(getCountry("ZZ")).toBeNull();
  });

  it("does not treat a stored carrier key or a closed sale as a live shipment or payment", async () => {
    const previousKey = process.env.DHL_API_KEY;
    const previousStripe = process.env.STRIPE_SECRET_KEY;
    const previousSales = process.env.BUZZARD_SALES_ENABLED;
    process.env.DHL_API_KEY = "present-but-not-a-shipment";
    process.env.STRIPE_SECRET_KEY = "sk_test_not_a_charge";
    delete process.env.BUZZARD_SALES_ENABLED;
    try {
      const label = await carriers.dhl({ orderNumber: "BZ-TEST", countryCode: "DE", weightKg: 1, address: {} });
      expect(label.status).toBe("BLOCKED_EXTERNAL");
      expect(label.live).toBe(false);
      expect(label.shipmentCreated).toBe(false);
      expect(label.trackingNumber).toBeNull();
      expect(label.credentialsPresent).toBe(true);
      const hermes = await carriers.hermes({ orderNumber: "BZ-TEST", countryCode: "DE" });
      expect(hermes.provider).toBe("HERMES");
      expect(hermes.shipmentCreated).toBe(false);
      const unnamed = await createShipment({ orderNumber: "BZ-TEST", countryCode: "DE" });
      expect(unnamed.code).toBe("CARRIER_UNKNOWN");
      expect(unnamed.provider).toBeNull();
      expect(unnamed.shipmentCreated).toBe(false);
      const pay = await payments.stripe({ orderId: "BZ-TEST", amount: 10, currency: "EUR" });
      expect(pay.status).toBe("SALES_CLOSED");
      expect(pay.checkoutUrl).toBeNull();
      expect(pay.realMoneyMovement).toBe(false);
      const tax = calculateTax({});
      expect(tax.country).toBeNull();
      expect(tax.rate).toBeNull();
      expect(tax.official).toBe(false);
    } finally {
      if (previousKey == null) delete process.env.DHL_API_KEY;
      else process.env.DHL_API_KEY = previousKey;
      if (previousStripe == null) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = previousStripe;
      if (previousSales == null) delete process.env.BUZZARD_SALES_ENABLED;
      else process.env.BUZZARD_SALES_ENABLED = previousSales;
    }
  });
});

describe("FIN-M23 cart coupon entry stays closed", () => {
  function record(extra = {}) {
    return {
      code: "WELCOME10",
      customerId: "cust-cart",
      couponCustomerId: "cust-cart",
      productId: "prod-1",
      campaignId: "camp-1",
      couponCampaignId: "camp-1",
      campaignCode: "WELCOME10",
      sku: "BZ-1",
      productSku: "BZ-1",
      usageLimit: 5,
      usageCount: 0,
      customerLimit: 1,
      customerUses: 0,
      currency: "EUR",
      couponCurrency: "EUR",
      campaignCurrency: "EUR",
      country: "DE",
      couponCountry: "DE",
      campaignCountry: "DE",
      discountRate: 10,
      authoritySource: "campaign-registry",
      ownerId: "owner-1",
      ...extra,
    };
  }

  function expectClosed(result) {
    expect(result.ok).toBe(false);
    expect(result.accepted).toBe(false);
    expect(result.authorized).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.couponStored).toBe(false);
    expect(result.couponWritten).toBe(false);
    expect(result.discount).toBeNull();
    expect(result.total).toBeNull();
    expect(result.commercialTotal).toBeNull();
    expect(result.orderCreated).toBe(false);
    expect(result.paymentCreated).toBe(false);
    expect(result.productionReady).toBe(false);
    expect(result.code).not.toBe("COUPON_UNKNOWN");
    expect(result.status).not.toBe(200);
    expect(getDatabaseHealth().initialized).toBe(false);
  }

  it("runs the entry gate before any cart coupon write", () => {
    const result = applyCoupon("cart-token-a", record({ idempotencyKey: "m23-before-write" }));
    expectClosed(result);
    expect(result.code).toBe("COUPON_WINDOW_UNKNOWN");
    expect(result.gateCode).toBe("COUPON_WINDOW_UNKNOWN");
    expect(result.authorityCode).toBe("COUPON_WINDOW_UNKNOWN");
    expect(result.status).toBe("UNKNOWN");
  });

  it("keeps a blocked relation closed", () => {
    const result = applyCoupon("cart-token-b", { code: "WELCOME10", idempotencyKey: "m23-blocked" });
    expectClosed(result);
    expect(result.code).toBe("COUPON_RELATION_MISMATCH");
    expect(result.gateCode).toBe("COUPON_RELATION_MISMATCH");
    expect(result.authorityCode).toBe("COUPON_RELATION_MISMATCH");
    expect(result.status).toBe("BLOCKED");
  });

  it("keeps a network failure closed", () => {
    const result = applyCoupon("cart-token-c", {
      code: "WELCOME10",
      idempotencyKey: "m23-failed",
      networkError: true,
      ok: true,
    });
    expectClosed(result);
    expect(result.code).toBe("NETWORK_ERROR");
    expect(result.status).toBe("FAILED");
  });

  it("keeps a timeout closed", () => {
    const result = applyCoupon("cart-token-d", {
      code: "WELCOME10",
      idempotencyKey: "m23-timeout",
      timeout: true,
      status: 200,
      ok: true,
      valid: true,
    });
    expectClosed(result);
    expect(result.code).toBe("TIMEOUT");
    expect(result.status).toBe("FAILED");
  });

  it("ignores HTTP 200, ok true, and a forged gate result", () => {
    const result = applyCoupon("cart-token-e", {
      code: "WELCOME10",
      idempotencyKey: "m23-forged",
      ok: true,
      valid: true,
      status: 200,
      discount: 15,
      gateResult: { ok: true, authorized: true, accepted: true, code: "PASS", status: "PASS" },
    });
    expectClosed(result);
    expect(result.code).toBe("COUPON_RELATION_MISMATCH");
    expect(result.gateCode).toBe("COUPON_RELATION_MISMATCH");
    expect(result.authorityCode).toBe("COUPON_RELATION_MISMATCH");
    expect(result.status).toBe("BLOCKED");
    expect(result.callerGateIgnored).toBe(true);
    expect(result.callerFlagIgnored).toBe(true);
    expect(result.discount).not.toBe(15);
  });
});
