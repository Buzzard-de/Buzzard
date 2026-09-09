import { describe, it } from "node:test";
import assert from "node:assert/strict";
import pricingEngine from "../core/pricingEngineRegistry.js";

const {
  rejectClientPricingModification,
  validatePricingRequest,
  sanitizeClientPricingPatch,
  redactPricingSecrets,
  validateMinimumMargin,
} = pricingEngine;

describe("Server Pricing Engine Registry", () => {
  it("rejects client price modification", () => {
    const result = rejectClientPricingModification({ customerGrossPrice: 99.99 });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "PRICING_FIELDS_NOT_CLIENT_WRITABLE");
  });

  it("rejects client supplier cost modification", () => {
    const result = rejectClientPricingModification({ supplierPrice: 10 });
    assert.equal(result.allowed, false);
  });

  it("rejects credentials in payload", () => {
    const result = rejectClientPricingModification({ api_key: "secret123" });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "CREDENTIALS_NOT_ALLOWED_ON_CLIENT");
  });

  it("validates pricing request fields", () => {
    assert.equal(validatePricingRequest({}).valid, false);
    assert.equal(
      validatePricingRequest({
        productId: "reifen-pilot-sport",
        supplierId: "TEST_SUPPLIER_A",
        marketId: "DE",
        channel: "direct",
      }).valid,
      true
    );
  });

  it("sanitizes client pricing patches", () => {
    const existing = { name: "Tire", customerGrossPrice: 89.99 };
    const patch = { name: "Updated", customerGrossPrice: 1, margin: 0.5 };
    const sanitized = sanitizeClientPricingPatch(existing, patch);
    assert.equal(sanitized.name, "Updated");
    assert.equal(sanitized.customerGrossPrice, 89.99);
  });

  it("redacts secrets from pricing logs", () => {
    const redacted = redactPricingSecrets({ token: "abc", price: 10 });
    assert.equal(redacted.token, "[REDACTED]");
    assert.equal(redacted.price, 10);
  });

  it("validates minimum contribution margin", () => {
    const ok = validateMinimumMargin(80, 100, 0.15);
    assert.equal(ok.valid, true);
    assert.ok(ok.margin >= 0.15);

    const fail = validateMinimumMargin(95, 100, 0.1);
    assert.equal(fail.valid, false);
    assert.equal(fail.reason, "BELOW_MINIMUM_MARGIN");
  });
});
