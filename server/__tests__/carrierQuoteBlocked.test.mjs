import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createAdapter } = require("../lib/logistics/v5/adapterFramework.js");
const { calculateShipping } = require("../lib/commerce/shippingProvider.js");

function expectClosed(result) {
  expect(result.ok).toBe(false);
  expect(result.live).toBe(false);
  expect(result.mock).toBe(false);
  expect(result.status).toBe("BLOCKED_EXTERNAL");
  expect(result.rates).toEqual([]);
  expect(result.validatedAddress).toBeNull();
  expect(result.shippingCost).toBeNull();
  expect(result.commercialEligibility).toBe("BLOCKED");
}

describe("carrier rates and addresses stay blocked without a live service", () => {
  const adapter = createAdapter({ carrierId: "dhl-parcel-de" });

  it("does not price a known carrier when no live connection exists", () => {
    const previous = process.env.DHL_API_KEY;
    process.env.DHL_API_KEY = "present-not-a-tariff";
    try {
      const rates = adapter.getRates({ country: "DE" });
      expectClosed(rates);
      expect(rates.code).toBe("LIVE_CONNECTION_ABSENT");
    } finally {
      if (previous == null) delete process.env.DHL_API_KEY;
      else process.env.DHL_API_KEY = previous;
    }
  });

  it("rejects a mock tariff", () => {
    const rates = adapter.getRates({ mock: true, rates: [{ amount: 4.99, verified: true }] });
    expect(rates.code).toBe("MOCK_REJECTED");
    expectClosed(rates);
    expect(JSON.stringify(rates)).not.toContain("4.99");
  });

  it("rejects a missing, invalid, or unknown address", () => {
    expect(adapter.validateAddress().code).toBe("MISSING_ADDRESS");
    expect(adapter.validateAddress({ country: "DE", postalCode: "ABC" }).code).toBe("INVALID_ADDRESS");
    expect(adapter.validateAddress({ country: "ZZ", postalCode: "10115" }).code).toBe("COUNTRY_UNKNOWN");
    expectClosed(adapter.validateAddress({ country: "DE", postalCode: "10115" }));
  });

  it("rejects an unknown carrier", () => {
    const unknown = createAdapter({ carrierId: "not-a-carrier" });
    expect(unknown.getRates({ country: "DE" }).code).toBe("CARRIER_UNKNOWN");
    expect(unknown.validateAddress({ country: "DE", postalCode: "10115" }).code).toBe("CARRIER_UNKNOWN");
    expectClosed(unknown.getRates());
  });

  it("reports timeout and network error separately", () => {
    const slow = createAdapter({ carrierId: "ups-developer", forceTimeout: true });
    const down = createAdapter({ carrierId: "gls-shipit", networkError: true });
    expect(slow.getRates().code).toBe("TIMEOUT");
    expect(down.validateAddress({ country: "DE", postalCode: "10115" }).code).toBe("NETWORK_ERROR");
    expectClosed(slow.getRates());
    expectClosed(down.getRates());
  });

  it("keeps a complete synthetic request unverified", () => {
    const rates = adapter.getRates({
      origin: "DE",
      country: "FR",
      weightKg: 2,
      dimensions: { lengthCm: 20, widthCm: 20, heightCm: 10 },
    });
    const address = adapter.validateAddress({ country: "DE", postalCode: "10115", city: "Berlin" });
    expect(rates.contract).toBe("VALID_SHAPE");
    expect(rates.code).toBe("LIVE_CONNECTION_REQUIRED");
    expect(address.contract).toBe("VALID_SHAPE");
    expect(address.code).toBe("LIVE_CONNECTION_REQUIRED");
    expectClosed(rates);
    expectClosed(address);
  });

  it("does not let checkout shipping turn a blocked quote into a price", () => {
    const quote = adapter.getRates({ country: "DE" });
    const priced = calculateShipping({ rates: quote.rates, country: "DE", weightKg: 2 });
    expect(quote.ok).toBe(false);
    expect(priced.price).toBeNull();
    expect(priced.ok).not.toBe(true);
    expect(priced.shippingCost == null || priced.price == null).toBe(true);
    expect(adapter.getServiceOptions().ok).toBe(false);
    expect(adapter.getDeliveryEstimate().ok).toBe(false);
    expect(adapter.getPickupPoints().ok).toBe(false);
    expect(adapter.getLockers().ok).toBe(false);
    expect(adapter.getServicePoints().ok).toBe(false);
    expect(adapter.getDeliveryOptions().ok).toBe(false);
    const coverage = adapter.getCoverage("10115", "DE");
    expect(coverage.ok).toBe(false);
    expect(coverage.mock).toBe(false);
    expect(coverage.code).toBe("LIVE_CONNECTION_ABSENT");
    expect(JSON.stringify(coverage)).not.toContain("10115");
  });
});
