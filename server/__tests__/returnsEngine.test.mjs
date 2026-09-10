import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rejectClientReturnModification,
  canCustomerAccessReturn,
  sanitizeClientReturnPatch,
} from "../core/returnsEngineRegistry.js";

describe("Server Returns Engine Registry", () => {
  it("rejects client supplier recovery modification", () => {
    const result = rejectClientReturnModification({ supplierCreditAmount: 100 });
    assert.equal(result.allowed, false);
  });

  it("rejects client buzzard impact modification", () => {
    const result = rejectClientReturnModification({ buzzardLoss: 0 });
    assert.equal(result.allowed, false);
  });

  it("rejects credentials in payload", () => {
    const result = rejectClientReturnModification({ apiKey: "secret" });
    assert.equal(result.allowed, false);
  });

  it("enforces customer isolation", () => {
    assert.equal(canCustomerAccessReturn("cust_a", "cust_b"), false);
    assert.equal(canCustomerAccessReturn("cust_a", "cust_a"), true);
  });

  it("sanitizes client return patches", () => {
    const sanitized = sanitizeClientReturnPatch(
      { reason: "DEFECTIVE" },
      { reason: "OTHER", customerRefundAmount: 999 }
    );
    assert.equal(sanitized.reason, "OTHER");
    assert.equal(sanitized.customerRefundAmount, undefined);
  });
});
