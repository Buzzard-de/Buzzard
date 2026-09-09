import { describe, it, expect, beforeEach } from "vitest";
import {
  calculatePrice,
  convertCurrency,
  calculateReturnReserves,
  calculateContributionMargin,
  applyRoundingRule,
  createPriceSnapshot,
  recalculatePriceAfterSupplierUpdate,
  rejectClientPricingModification,
  validatePricingRequest,
  getPricingAuditLog,
  clearPricingAuditLog,
  buildFixturePricingInput,
  buildAllFixturePricingInputs,
  PRICING_FIXTURE_COSTS,
} from "./index";

describe("Pricing Engine Foundation", () => {
  beforeEach(() => {
    clearPricingAuditLog();
  });

  describe("Pricing Model", () => {
    it("returns canonical pricing result with all required fields", () => {
      const input = buildFixturePricingInput("reifen-pilot-sport");
      const result = calculatePrice(input);

      expect(result.productId).toBe("reifen-pilot-sport");
      expect(result.supplierId).toBe("TEST_SUPPLIER_A");
      expect(result.marketId).toBe("DE");
      expect(result.channel).toBe("direct");
      expect(result.currency).toBe("EUR");
      expect(result.supplierNetPrice).toBe(60);
      expect(result.shippingCost).toBe(10);
      expect(result.calculatedAt).toBeTruthy();
      expect(result.pricingStatus).toBe("VALID");
    });
  });

  describe("Currency Conversion", () => {
    it("converts EUR to PLN deterministically", () => {
      const pln = convertCurrency(100, "EUR", "PLN");
      expect(pln).not.toBeNull();
      expect(pln!).toBeGreaterThan(400);
    });

    it("returns null for unknown currency", () => {
      expect(convertCurrency(100, "EUR", "XXX")).toBeNull();
    });

    it("calculates price in PL market with PLN currency", () => {
      const input = buildFixturePricingInput("motoroel-5w30", { marketId: "PL", currency: "PLN" });
      const result = calculatePrice(input);
      expect(result.currency).toBe("PLN");
      expect(result.pricingStatus).toBe("VALID");
      expect(result.customerGrossPrice).toBeGreaterThan(0);
    });
  });

  describe("VAT", () => {
    it("includes VAT in gross customer price for B2C DE", () => {
      const result = calculatePrice(buildFixturePricingInput("reifen-pilot-sport"));
      expect(result.customerGrossPrice).toBeGreaterThan(result.customerNetPrice);
      expect(result.customerVat).toBeGreaterThan(0);
      expect(result.taxContext.reason).toContain("B2C");
    });
  });

  describe("Supplier Cost", () => {
    it("rejects missing supplier cost", () => {
      const input = buildFixturePricingInput("reifen-pilot-sport");
      input.supplierOffer.supplierPrice = 0;
      const result = calculatePrice(input);
      expect(result.pricingStatus).toBe("MISSING_COST");
    });

    it("does not trust zero stock offers", () => {
      const input = buildFixturePricingInput("reifen-pilot-sport", { stock: 0 });
      const result = calculatePrice(input);
      expect(result.pricingStatus).toBe("OUT_OF_STOCK");
    });
  });

  describe("Shipping Cost", () => {
    it("uses fixture shipping costs", () => {
      const tire = calculatePrice(buildFixturePricingInput("reifen-pilot-sport"));
      const oil = calculatePrice(buildFixturePricingInput("motoroel-5w30"));
      expect(tire.shippingCost).toBe(10);
      expect(oil.shippingCost).toBe(7);
    });
  });

  describe("Marketplace Fee", () => {
    it("applies higher fees for Amazon channel", () => {
      const direct = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { channel: "direct" }));
      const amazon = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { channel: "amazon" }));
      expect(amazon.marketplaceFee).toBeGreaterThan(direct.marketplaceFee);
      expect(amazon.customerGrossPrice).toBeGreaterThan(direct.customerGrossPrice);
    });

    it("supports multiple marketplace channels", () => {
      for (const channel of ["ebay", "kaufland", "allegro", "bol", "cdiscount", "otto"] as const) {
        const result = calculatePrice(buildFixturePricingInput("bremsbelaege-vorder", { channel }));
        expect(result.pricingStatus).toBe("VALID");
        expect(result.marketplaceFee).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("Payment Fee", () => {
    it("applies payment fee based on method", () => {
      const card = calculatePrice(buildFixturePricingInput("bremsscheibe-280", { paymentMethod: "card" }));
      const sepa = calculatePrice(buildFixturePricingInput("bremsscheibe-280", { paymentMethod: "sepa" }));
      expect(card.paymentFee).toBeGreaterThan(sepa.paymentFee);
    });
  });

  describe("Return Reserve", () => {
    it("calculates return and refund reserves", () => {
      const reserves = calculateReturnReserves(60, "automotive-tires");
      expect(reserves.returnCostReserve).toBeGreaterThan(0);
      expect(reserves.refundCostReserve).toBeGreaterThan(0);
      expect(reserves.breakdown.supplierCreditFactor).toBeGreaterThan(0);
    });

    it("includes return reserve in total variable cost", () => {
      const result = calculatePrice(buildFixturePricingInput("reifen-pilot-sport"));
      expect(result.returnCostReserve).toBeGreaterThan(0);
      expect(result.totalVariableCost).toBeGreaterThan(result.supplierNetPrice + result.shippingCost);
    });
  });

  describe("Margin Calculation", () => {
    it("uses contribution margin formula: price = cost / (1 - margin)", () => {
      const calc = calculateContributionMargin(80, { targetMarginPercent: 0.2 });
      expect(calc.customerNetPrice).toBe(100);
      expect(calc.buzzardContributionMargin).toBeCloseTo(0.2, 2);
    });

    it("does NOT use simple markup (80 * 1.2 = 96)", () => {
      const calc = calculateContributionMargin(80, { targetMarginPercent: 0.2 });
      expect(calc.customerNetPrice).not.toBe(96);
    });
  });

  describe("Target Margin", () => {
    it("default target margin is 11%", () => {
      const result = calculatePrice(buildFixturePricingInput("motoroel-5w30"));
      expect(result.targetMarginPercent).toBeCloseTo(0.11, 2);
    });
  });

  describe("Minimum Margin", () => {
    it("rejects price below minimum margin", () => {
      const input = buildFixturePricingInput("reifen-pilot-sport", {
        _testOverrides: { targetMarginPercent: 0.01, minimumMarginPercent: 0.5 },
      });
      const result = calculatePrice(input);
      expect(result.pricingStatus).toBe("BELOW_MINIMUM_MARGIN");
    });
  });

  describe("Rounding", () => {
    it("rounds to psychological .99 ending", () => {
      const rounded = applyRoundingRule(74.13, { marketId: "DE", channel: "direct", currency: "EUR" });
      expect(rounded.toString()).toMatch(/\.99$/);
    });
  });

  describe("Multi-Market", () => {
    it("produces different currencies per market", () => {
      const de = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { marketId: "DE" }));
      const pl = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { marketId: "PL", currency: "PLN" }));
      const tr = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { marketId: "TR", currency: "TRY" }));
      expect(de.currency).toBe("EUR");
      expect(pl.currency).toBe("PLN");
      expect(tr.currency).toBe("TRY");
    });
  });

  describe("Multi-Supplier", () => {
    it("calculates price for selected supplier offer only", () => {
      const supplierA = calculatePrice(
        buildFixturePricingInput("reifen-pilot-sport", { supplierId: "SUPPLIER_A" })
      );
      const inputB = buildFixturePricingInput("reifen-pilot-sport", { supplierId: "SUPPLIER_B" });
      inputB.supplierOffer.supplierPrice = 63;
      const supplierB = calculatePrice(inputB);
      expect(supplierB.customerGrossPrice).toBeGreaterThan(supplierA.customerGrossPrice);
    });
  });

  describe("Marketplace Pricing", () => {
    it("direct store price differs from marketplace prices", () => {
      const direct = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { channel: "direct" }));
      const amazon = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { channel: "amazon" }));
      const ebay = calculatePrice(buildFixturePricingInput("reifen-pilot-sport", { channel: "ebay" }));
      expect(amazon.customerGrossPrice).not.toBe(direct.customerGrossPrice);
      expect(ebay.customerGrossPrice).not.toBe(amazon.customerGrossPrice);
    });
  });

  describe("Price Snapshot", () => {
    it("creates immutable snapshot", () => {
      const result = calculatePrice(buildFixturePricingInput("bremsscheibe-280"));
      const snapshot = createPriceSnapshot(result);
      expect(snapshot.snapshotId).toContain("price_");
      expect(snapshot.customerGrossPrice).toBe(result.customerGrossPrice);
      expect(snapshot.capturedAt).toBeTruthy();
    });
  });

  describe("Supplier Price Update", () => {
    it("recalculates when supplier price changes", () => {
      const input = buildFixturePricingInput("bremsbelaege-vorder");
      const before = calculatePrice(input);
      input.supplierOffer.supplierPrice = 35;
      const after = recalculatePriceAfterSupplierUpdate(input);
      expect(after.customerGrossPrice).toBeGreaterThan(before.customerGrossPrice);
    });
  });

  describe("Security", () => {
    it("rejects client price modification", () => {
      const result = rejectClientPricingModification({ customerGrossPrice: 1 });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("PRICING_FIELDS_NOT_CLIENT_WRITABLE");
    });

    it("rejects client supplier cost modification", () => {
      const result = rejectClientPricingModification({ supplierCost: 1 });
      expect(result.allowed).toBe(false);
    });

    it("rejects credentials in payload", () => {
      const result = rejectClientPricingModification({ apiKey: "secret" });
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("CREDENTIALS_NOT_ALLOWED_ON_CLIENT");
    });

    it("validates required pricing request fields", () => {
      expect(validatePricingRequest({}).valid).toBe(false);
      expect(
        validatePricingRequest({
          productId: "x",
          supplierId: "y",
          marketId: "DE",
          channel: "direct",
        }).valid
      ).toBe(true);
    });
  });

  describe("Invalid Inputs", () => {
    it("rejects unknown market", () => {
      const input = buildFixturePricingInput("reifen-pilot-sport", { marketId: "XX" });
      const result = calculatePrice(input);
      expect(result.pricingStatus).toBe("MISSING_MARKET");
    });

    it("rejects negative stock", () => {
      const input = buildFixturePricingInput("reifen-pilot-sport", { stock: -1 });
      const result = calculatePrice(input);
      expect(result.pricingStatus).toBe("OUT_OF_STOCK");
    });
  });

  describe("Pricing Audit", () => {
    it("records auditable pricing calculations", () => {
      calculatePrice(buildFixturePricingInput("reifen-pilot-sport"));
      const log = getPricingAuditLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].productId).toBe("reifen-pilot-sport");
      expect(log[0].durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Test Fixtures", () => {
    it("covers all four automotive fixture products", () => {
      const inputs = buildAllFixturePricingInputs();
      expect(inputs).toHaveLength(4);
      for (const input of inputs) {
        const fixture = PRICING_FIXTURE_COSTS[input.productId as keyof typeof PRICING_FIXTURE_COSTS];
        expect(input.supplierOffer.supplierPrice).toBe(fixture.supplierCost);
      }
    });
  });

  describe("Product Engine Integration", () => {
    it("all fixture products produce VALID pricing", () => {
      for (const input of buildAllFixturePricingInputs()) {
        const result = calculatePrice(input);
        expect(result.pricingStatus).toBe("VALID");
        expect(result.customerGrossPrice).toBeGreaterThan(result.totalVariableCost);
        expect(result.buzzardContributionMargin).toBeGreaterThanOrEqual(result.minimumMarginPercent);
      }
    });
  });
});
