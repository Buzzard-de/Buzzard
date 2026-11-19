import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createPaymentConnector, snapshot } = require("../lib/finance/paymentConnectorRegistry.js");

describe("payment connector registry", () => {
  it("authorizes in sandbox without money movement", () => {
    process.env.BUZZARD_SALES_ENABLED = "0";
    const stripe = createPaymentConnector("stripe");
    const auth = stripe.authorize({ amount: 49 });
    expect(auth.moneyMoved).toBe(false);
    expect(snapshot().anyLive).toBe(false);
  });

  it("blocks refunds", () => {
    const stripe = createPaymentConnector("stripe");
    expect(stripe.refund({}).code).toBe("REAL_REFUND_BLOCKED");
  });
});