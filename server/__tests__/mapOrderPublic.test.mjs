import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { mapOrder } = require("../lib/commerce/orderService");

describe("mapOrder public contract", () => {
  it("drops a guest token and other secrets that are not order fields", () => {
    const mapped = mapOrder({
      id: "ord_public_probe",
      checkout_id: null,
      customer_id: "cust-synthetic",
      order_type: "DRY_RUN",
      status: "CONFIRMED",
      payment_status: "NONE",
      fulfillment_status: "NONE",
      currency: "EUR",
      subtotal: 10,
      shipping: 0,
      tax: 0,
      discount: 0,
      total: 10,
      items_json: "[]",
      metadata_json: "{}",
      created_at: "2026-11-24T00:00:00.000Z",
      guestToken: "guest-token-secret",
      token: "session-token-secret",
      password: "password-secret",
    });

    const text = JSON.stringify(mapped);
    expect(text).not.toContain("guest-token-secret");
    expect(text).not.toContain("session-token-secret");
    expect(text).not.toContain("password-secret");
    expect(mapped.phase3.live).toBe(false);
    expect(mapped.phase3.payable).toBe(false);
    expect(mapped.isCommercial).toBe(false);
  });
});
