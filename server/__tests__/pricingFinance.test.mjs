import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const {
  evaluateOffer,
  recommendPrice,
  landedCost,
  CATEGORY_MARGINS,
} = require("../lib/commerce/pricingPolicy.js");
const { quote } = require("../lib/buzzardNative/core/specialists/pricingEngine.js");
const { quotePrice } = require("../lib/commerce/pricingIntegration.js");
const { offerGate } = require("../lib/commerce/workflowChain.js");
const { openCatalog } = require("../lib/commerce/isolatedCatalog.js");
const { decideAsset } = require("../lib/banking/eu27/fiatPolicy.js");
const { quoteRate } = require("../lib/banking/eu27/fx.js");
const { netIncomeReport, payTax, calculateVat } = require("../lib/buzzardNative/core/tax/vatEngine.js");
const { coverage } = require("../lib/banking/eu27/inventory.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

function money(amount) {
  return Math.round(amount * 100) / 100;
}

function cents(amount) {
  return Math.round(amount * 100);
}

const stack = {
  supplierCost: 10,
  shippingCost: 2,
  marketplaceFee: 1,
  paymentFee: 0.3,
  returnReserve: 0.5,
  vatAmount: 0,
  vatVerified: true,
};

describe("authoritative pricing policy", () => {
  it("prices automotive, default, and beverage categories from one margin map", () => {
    expect(CATEGORY_MARGINS.automotive).toBe(0.11);
    expect(CATEGORY_MARGINS.other).toBe(0.07);
    expect(CATEGORY_MARGINS.beverage_crate).toBe(0.15);
    const landed = 100;
    const cases = [
      ["automotive", 0.11],
      ["bz.01", 0.11],
      ["other", 0.07],
      ["beverage_crate", 0.15],
      ["beverage crate", 0.15],
    ];
    for (const [category, margin] of cases) {
      const price = money(landed / (1 - margin));
      const net = money(price - landed);
      const quoted = recommendPrice({
        supplierCost: 80,
        shipping: 10,
        marketplaceCommission: 5,
        vat: 3,
        paymentFees: 1,
        returnReserve: 1,
        category,
      });
      expect(quoted.targetMargin).toBe(margin);
      expect(quoted.price).toBe(price);
      expect(quoted.net).toBe(net);
      expect(money(quoted.net / quoted.price)).toBe(money(margin));
      expect(quoted.publish).toBe(false);
      expect(quoted.taxOfficial).toBe(false);
    }
    const ignored = evaluateOffer({
      ...stack,
      offerPrice: 20,
      category: "automotive",
      categoryMargin: 0.12,
      comparableMarketPrice: 30,
    });
    const cost = money(10 + 2 + 1 + 0.3 + 0.5);
    const profit = money(20 - cost);
    expect(ignored.marginOverrideIgnored).toBe(true);
    expect(ignored.targetMargin).toBe(0.11);
    expect(ignored.cost).toBe(cost);
    expect(ignored.profit).toBe(profit);
    expect(ignored.margin).toBe(Math.round((profit / 20) * 10000) / 10000);
  });

  it("keeps the 0.50 EUR floor and the 0.10 EUR undercut only when the floor still holds", () => {
    const cost = money(10 + 2 + 1 + 0.3 + 0.5);
    const floorPrice = money(cost + 0.5);
    const floor = evaluateOffer({ ...stack, offerPrice: floorPrice, category: "other", comparableMarketPrice: 40 });
    expect(floor.profit).toBe(0.5);
    expect(floor.minimumProfitEligible).toBe(true);
    expect(floor.reasons).toContain("CATEGORY_MARGIN");
    const underFloor = evaluateOffer({ ...stack, offerPrice: money(cost + 0.49), category: "other" });
    expect(underFloor.profit).toBe(0.49);
    expect(underFloor.minimumProfitEligible).toBe(false);
    expect(underFloor.reasons).toContain("MIN_NET_PROFIT");
    const viablePrice = money(cost / (1 - 0.07));
    const viableProfit = money(viablePrice - cost);
    const viable = evaluateOffer({ ...stack, offerPrice: viablePrice, category: "other", comparableMarketPrice: 40 });
    expect(viable.profit).toBe(viableProfit);
    expect(viable.profit).toBeGreaterThanOrEqual(0.5);
    expect(viable.ok).toBe(true);
    const above = evaluateOffer({ ...stack, offerPrice: 20, category: "other", comparableMarketPrice: 20 });
    expect(above.reasons).toContain("ABOVE_UNDERCUT_TARGET");
    expect(above.competitivePriceEligible).toBe(false);
    expect(above.targetMax).toBe(19.9);
    const blocked = quote({
      supplierCost: 10,
      shipping: 2,
      marketplaceCommission: 1,
      vat: 2,
      returnReserve: 1,
      paymentFees: 1,
      marketPrice: 10.05,
      category: "other",
    });
    const blockedLanded = money(10 + 2 + 1 + 2 + 1 + 1);
    expect(blocked.humanReview).toBe(true);
    expect(blocked.undercutBlockedByMinNet).toBe(true);
    expect(money(10.05 - 0.1 - blockedLanded)).toBeLessThan(0.5);
    expect(blocked.publish).toBe(false);
  });

  it("rejects a negative result instead of hiding it", () => {
    const result = evaluateOffer({ ...stack, offerPrice: 8, category: "other" });
    const cost = money(10 + 2 + 1 + 0.3 + 0.5);
    expect(result.profit).toBe(money(8 - cost));
    expect(result.profit).toBeLessThan(0);
    expect(result.margin).toBeLessThan(0);
    expect(result.reasons).toContain("NEGATIVE_PROFIT");
    expect(result.ok).toBe(false);
    expect(result.minimumProfitEligible).toBe(false);
  });

  it("blocks missing supplier, shipping, marketplace, VAT, and FX without inventing zero", () => {
    const missingSupplier = evaluateOffer({ ...stack, supplierCost: undefined, offerPrice: 30 });
    expect(missingSupplier.cost).toBeNull();
    expect(missingSupplier.profit).toBeNull();
    expect(missingSupplier.missing).toContain("supplierCost");
    expect(landedCost({ shippingCost: 2, marketplaceFee: 1, paymentFee: 0, returnReserve: 0 })).toBeNull();
    const missingShipping = evaluateOffer({ ...stack, shippingCost: null, offerPrice: 30 });
    expect(missingShipping.code).toBe("MISSING_COST");
    expect(missingShipping.profit).toBeNull();
    const missingFee = evaluateOffer({
      offerPrice: 30,
      supplierCost: 10,
      shippingCost: 2,
      paymentFee: 0,
      returnReserve: 0,
      vatAmount: 0,
      vatVerified: true,
    });
    expect(missingFee.missing).toContain("marketplaceFee");
    expect(missingFee.cost).toBeNull();
    const missingVat = evaluateOffer({ ...stack, vatVerified: false, offerPrice: 30 });
    expect(missingVat.reasons).toContain("VAT_UNKNOWN");
    expect(missingVat.profit).toBeNull();
    expect(missingVat.vatOfficial).toBe(false);
    expect(missingVat.invented).toBe(false);
    const snapshot = evaluateOffer({ ...stack, vatSnapshotOfficial: true, offerPrice: 30 });
    expect(snapshot.code).toBe("VAT_SNAPSHOT_NOT_OFFICIAL");
    expect(snapshot.profit).toBeNull();
    const fx = evaluateOffer({ ...stack, offerPrice: 30, currency: "PLN" });
    const direct = quoteRate({ base: "PLN", quote: "EUR" });
    expect(decideAsset({ currency: "PLN", assetType: "fiat" }).ok).toBe(true);
    expect(direct.ok).toBe(false);
    expect(direct.rate).toBeNull();
    expect(direct.invented).toBe(false);
    expect(fx.code).toBe("FX_RATE_UNKNOWN");
    expect(fx.profit).toBeNull();
    expect(fx.fxRate == null).toBe(true);
  });

  it("counts marketplace fees and the return reserve in the same cents", () => {
    const parts = [1000, 250, 175, 40, 125];
    const totalCents = parts.reduce((sum, part) => sum + part, 0);
    const priceCents = 2200;
    const result = evaluateOffer({
      offerPrice: priceCents / 100,
      supplierCost: 10,
      shippingCost: 2.5,
      marketplaceFee: 1.75,
      paymentFee: 0.4,
      returnReserve: 1.25,
      vatAmount: 0,
      vatVerified: true,
      category: "beverage_crate",
      comparableMarketPrice: 30,
    });
    expect(cents(result.cost)).toBe(totalCents);
    expect(cents(result.profit)).toBe(priceCents - totalCents);
    expect(result.targetMargin).toBe(0.15);
    expect(result.ok).toBe(true);
  });

  it("rejects crypto, stablecoins, CBDC, and the digital euro, and does not keep a card number", () => {
    const rejected = ["BTC", "ETH", "USDT", "USDC"];
    for (const currency of rejected) {
      const result = evaluateOffer({ ...stack, offerPrice: 20, currency });
      expect(result.code).toBe("REJECTED_CRYPTO_POLICY");
      expect(result.profit).toBeNull();
      expect(decideAsset({ currency, assetType: "fiat" }).ok).toBe(false);
    }
    expect(evaluateOffer({ ...stack, offerPrice: 20, assetType: "cbdc" }).code).toBe("REJECTED_CBDC_POLICY");
    expect(evaluateOffer({ ...stack, offerPrice: 20, instrument: "digital_euro" }).code).toBe("REJECTED_CBDC_POLICY");
    expect(evaluateOffer({ ...stack, offerPrice: 20, currency: "NO_SUCH_ASSET" }).code).toBe("REJECTED_UNKNOWN_ASSET");
    const card = evaluateOffer({ ...stack, offerPrice: 20, note: "4111111111111111" });
    expect(card.code).toBe("CARD_DATA_REJECTED");
    expect(card.stored).toBe(false);
    expect(JSON.stringify(card).includes("4111111111111111")).toBe(false);
  });

  it("rounds the cost stack to cents and keeps Germany outside the EU26 reserve", () => {
    const result = evaluateOffer({
      offerPrice: 20,
      supplierCost: 10.1,
      shippingCost: 0.2,
      marketplaceFee: 0.1,
      paymentFee: 0.1,
      returnReserve: 0.1,
      vatAmount: 0,
      vatVerified: true,
      category: "other",
      comparableMarketPrice: 30,
    });
    const expectedCents = 1010 + 20 + 10 + 10 + 10;
    expect(cents(result.cost)).toBe(expectedCents);
    expect(cents(result.profit)).toBe(2000 - expectedCents);
    const fr = netIncomeReport({
      actorId: "nedim_bey",
      incomeCountry: "FR",
      gross: 100,
      vat: 20,
      refund: 0,
      commission: 4,
      logistics: 6,
      supplierCost: 30,
    });
    const frNet = 100 - 20 - 4 - 6 - 30 + 0;
    expect(fr.reserveRate).toBe(0.25);
    expect(fr.emergencyReserve).toBe(frNet * 0.25);
    expect(fr.separateFromEu26Reserve).toBe(false);
    expect(fr.bankTransfer).toBe(false);
    const de = netIncomeReport({
      actorId: "nedim_bey",
      incomeCountry: "DE",
      gross: 100,
      vat: 19,
      refund: 0,
      commission: 4,
      logistics: 6,
      supplierCost: 30,
    });
    expect(de.reserveRate).toBe(0);
    expect(de.emergencyReserve).toBe(0);
    expect(de.separateFromEu26Reserve).toBe(true);
    expect(de.netIncome).toBe(100 - 19 - 4 - 6 - 30);
    const omitted = netIncomeReport({ actorId: "nedim_bey", incomeCountry: "FR", gross: 100, vat: 20, supplierCost: 10 });
    expect(omitted.status).toBe("UNKNOWN");
    expect(omitted.code).toBe("MISSING_AMOUNT");
    expect(omitted.emergencyReserve).toBeUndefined();
    expect(netIncomeReport({ actorId: "nedim_bey", incomeCountry: "US", gross: 10, vat: 0, refund: 0, commission: 0, logistics: 0, supplierCost: 0 }).code).toBe(
      "COUNTRY_UNKNOWN",
    );
    const vat = calculateVat({ actorId: "nedim_bey", sellerCountry: "DE", customerCountry: "DE", deliveryCountry: "DE", goodsNet: 100 });
    expect(vat.definitive).toBe(false);
    expect(vat.liveLegal).toBe(false);
    expect(vat.filingReady).toBe(false);
    expect(payTax().code).toBe("HUMAN_GATE_REQUIRED");
    const registry = coverage();
    expect(registry.code).toBe("EU27_REGISTRY_INCOMPLETE");
    expect(registry.complete).toBe(false);
    expect(registry.liveReady).toBe(false);
  });

  it("uses the same policy for a specialist quote, a marketplace quote, a storefront quote, and an order gate", () => {
    const offerPrice = 30;
    const supplierCost = 10;
    const shippingCost = 2;
    const marketplaceFee = 1;
    const paymentFee = 0.4;
    const returnReserve = 0.6;
    const cost = money(supplierCost + shippingCost + marketplaceFee + paymentFee + returnReserve);
    const profit = money(offerPrice - cost);
    const commercial = evaluateOffer({
      offerPrice,
      supplierCost,
      shippingCost,
      marketplaceFee,
      paymentFee,
      returnReserve,
      vatAmount: 0,
      vatVerified: true,
      category: "automotive",
      comparableMarketPrice: 40,
    });
    expect(commercial.profit).toBe(profit);
    expect(commercial.targetMargin).toBe(0.11);
    expect(commercial.ok).toBe(true);
    const marketplace = quotePrice({
      offerPrice,
      supplierCost,
      shippingCost,
      marketplaceFee,
      paymentFee,
      returnReserve,
      vatAmount: 0,
      vatVerified: true,
      category: "automotive",
      comparableMarketPrice: 40,
    });
    expect(marketplace.profit).toBe(commercial.profit);
    expect(marketplace.marketplacePrice).toBe(offerPrice);
    expect(marketplace.targetMargin).toBe(0.11);
    expect(marketplace.commerciallyEligible).toBe(true);
    expect(marketplace.recommendationOnly).toBe(true);
    expect(marketplace.livePriceWrite).toBe(false);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buzzard-price-"));
    const catalog = openCatalog(path.join(dir, "catalog.sqlite"));
    const storefront = catalog.quote({
      offerPrice,
      supplierCost,
      shippingCost,
      marketplaceFee,
      paymentFee,
      returnReserve,
      vatAmount: 0,
      vatVerified: true,
      category: "automotive",
      comparableMarketPrice: 40,
      country: "DE",
    });
    expect(storefront.ok).toBe(true);
    expect(storefront.vatOfficial).toBe(false);
    expect(storefront.orderCreated).toBe(false);
    expect(storefront.livePrice).toBe(false);
    catalog.close();
    const order = offerGate({
      offerPrice,
      supplierCost,
      shippingCost,
      marketplaceFee,
      paymentFee,
      returnReserve,
      vatAmount: 0,
      vatVerified: true,
      category: "automotive",
      market: 40,
    });
    expect(order.accepted).toBe(true);
    expect(order.orderCreated).toBe(false);
    expect(order.salesEnabled).toBe(false);
    expect(isSalesEnabled()).toBe(false);
    const specialist = quote({
      supplierCost,
      shipping: shippingCost,
      marketplaceCommission: marketplaceFee,
      paymentFees: paymentFee,
      returnReserve,
      vat: 0,
      category: "automotive",
    });
    const specialistPrice = money(cost / (1 - 0.11));
    expect(specialist.targetMargin).toBe(0.11);
    expect(specialist.price).toBe(specialistPrice);
    expect(specialist.net).toBe(money(specialistPrice - cost));
    expect(specialist.publish).toBe(false);
    const policyPrice = money(100 / (1 - 0.07));
    const legacy = require("../lib/pricing.js").calculateSalePrice({ supplierPrice: 100, markupPercent: 38 });
    expect(legacy.amount).toBe(policyPrice);
    expect(legacy.marginOverrideIgnored).toBe(true);
    expect(legacy.targetMargin).toBe(0.07);
  });
});
