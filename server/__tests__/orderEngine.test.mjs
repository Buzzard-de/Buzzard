import { describe, it } from "node:test";
import assert from "node:assert/strict";
import orderEngine from "../core/orderEngineRegistry.js";

const {
  rejectClientOrderModification,
  canCustomerAccessOrder,
  validateOrderAccess,
  sanitizeClientOrderPatch,
} = orderEngine;

describe("Server Order Engine Registry", () => {
  it("rejects client supplier cost modification", () => {
    const result = rejectClientOrderModification({ supplierCostSnapshot: 10 });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "ORDER_FIELDS_NOT_CLIENT_WRITABLE");
  });

  it("rejects client status modification", () => {
    const result = rejectClientOrderModification({ status: "CONFIRMED" });
    assert.equal(result.allowed, false);
  });

  it("rejects credentials in payload", () => {
    const result = rejectClientOrderModification({ cardNumber: "4111" });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "CREDENTIALS_NOT_ALLOWED_ON_CLIENT");
  });

  it("enforces customer isolation", () => {
    assert.equal(canCustomerAccessOrder("cust_a", "cust_a"), true);
    assert.equal(canCustomerAccessOrder("cust_a", "cust_b"), false);
  });

  it("validates order access", () => {
    const allowed = validateOrderAccess({ customerId: "cust_a" }, "cust_a");
    assert.equal(allowed.allowed, true);
    const denied = validateOrderAccess({ customerId: "cust_a" }, "cust_b");
    assert.equal(denied.allowed, false);
    assert.equal(denied.reason, "UNAUTHORIZED");
  });

  it("sanitizes client order patches", () => {
    const existing = { note: "ok", status: "CONFIRMED" };
    const patch = { note: "updated", status: "DELIVERED", paymentStatus: "CAPTURED" };
    const sanitized = sanitizeClientOrderPatch(existing, patch);
    assert.equal(sanitized.note, "updated");
    assert.equal(sanitized.status, "CONFIRMED");
    assert.equal(sanitized.paymentStatus, undefined);
  });
});
