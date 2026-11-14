import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { calculateCheckoutQuote } = require("../lib/customerCheckout.js");
const { isSalesEnabled } = require("../lib/salesMode.js");

function refused(quote) {
  expect(quote.ok).toBe(false);
  expect(quote.total).toBeNull();
  expect(quote.tax).toBeNull();
  expect(quote.discount).toBeNull();
  expect(quote.currency).toBeNull();
  expect(quote.quoteCreated).toBe(false);
  expect(quote.orderCreated).toBe(false);
  expect(quote.paymentCreated).toBe(false);
  expect(quote.invented).toBe(false);
  expect(quote.couponApplied).toBe(false);
}

describe("calculateCheckoutQuote does not turn a missing subtotal into zero", () => {
  it("keeps sales closed and separates missing, explicit zero, invalid, and valid amounts", () => {
    expect(isSalesEnabled()).toBe(false);

    for (const subtotal of [undefined, null, "", "   ", "UNKNOWN"]) {
      const quote = calculateCheckoutQuote({ subtotal, countryCode: "DE", currency: "EUR" });
      refused(quote);
      expect(quote.code).toBe("SUBTOTAL_UNKNOWN");
      expect(quote.status).toBe("UNKNOWN");
      expect(quote.subtotal).toBeNull();
    }

    const omitted = calculateCheckoutQuote({ countryCode: "DE" });
    refused(omitted);
    expect(omitted.code).toBe("SUBTOTAL_UNKNOWN");
    expect(omitted.subtotal).toBeNull();

    const explicitZero = calculateCheckoutQuote({ subtotal: 0, countryCode: "DE", currency: "EUR" });
    refused(explicitZero);
    expect(explicitZero.code).toBe("SALES_CLOSED");
    expect(explicitZero.subtotal).toBe(0);

    const zeroText = calculateCheckoutQuote({ subtotal: "0.00", countryCode: "DE" });
    refused(zeroText);
    expect(zeroText.code).toBe("SALES_CLOSED");
    expect(zeroText.subtotal).toBe(0);

    for (const subtotal of [-1, -0.01, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "NaN", "Infinity", "-4", "12.5.1", "EUR"]) {
      const quote = calculateCheckoutQuote({ subtotal, countryCode: "DE", currency: "EUR" });
      refused(quote);
      expect(quote.code).toBe("INVALID_AMOUNT");
      expect(quote.status).toBe("INVALID");
      expect(quote.subtotal).toBeNull();
    }

    const valid = calculateCheckoutQuote({
      subtotal: 12.5,
      couponCode: "WELCOME10",
      countryCode: "DE",
      currency: "EUR",
      valid: true,
      verified: true,
      paid: true,
    });
    refused(valid);
    expect(valid.code).toBe("SALES_CLOSED");
    expect(valid.subtotal).toBe(12.5);

    const validText = calculateCheckoutQuote({ subtotal: "12.50", countryCode: "DE", currency: "EUR" });
    refused(validText);
    expect(validText.code).toBe("SALES_CLOSED");
    expect(validText.subtotal).toBe(12.5);
    expect(isSalesEnabled()).toBe(false);
  });
});
