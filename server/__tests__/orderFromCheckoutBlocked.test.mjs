import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const orderService = require("../lib/commerce/orderService.js");
const paymentService = require("../lib/commerce/paymentService.js");

describe("checkout does not become an order without a verified cost and payment", () => {
  it("blocks a numeric shipping amount and a mock payment while sales are closed", () => {
    const payment = paymentService.authorizePayment({ amount: 30, currency: "EUR" });
    expect(payment.ok).toBe(false);
    expect(payment.code).toBe("PAYMENT_UNVERIFIED");
    expect(payment.paymentAuthorized).toBe(false);
    expect(payment.captured).toBe(false);
    expect(payment.realMoneyMovement).toBe(false);

    const order = orderService.createOrderFromCheckout({
      checkout: {
        id: "chk-unverified",
        cartId: "none",
        totals: { shipping: 4.99, subtotal: 10, tax: 0, discount: 0, total: 14.99, currency: "EUR" },
        supplierCost: 10,
        supplierCostVerified: true,
        supplierLive: true,
      },
      payment: { status: "AUTHORIZED", captured: true, live: true },
      orderType: "DRY_RUN",
    });
    expect(order.orderCreated).toBe(false);
    expect(order.code).toBe("SHIPPING_RATE_UNVERIFIED");
    expect(order.reasons).toEqual(expect.arrayContaining([
      "SHIPPING_RATE_UNVERIFIED",
      "MARKETPLACE_FEE_UNVERIFIED",
      "PAYMENT_FEE_UNVERIFIED",
      "VAT_UNVERIFIED",
      "SUPPLIER_COST_UNVERIFIED",
      "STOCK_UNVERIFIED",
      "PAYMENT_UNVERIFIED",
      "SALES_CLOSED",
    ]));
    expect(order.paymentAuthorized).toBe(false);
    expect(order.paymentCaptured).toBe(false);
    expect(order.total).toBeNull();
    expect(order.supplierCost).toBeNull();
  });

  it("keeps a missing shipping rate unverified before any other cost", () => {
    const order = orderService.createOrderFromCheckout({
      checkout: { id: "chk-ship", cartId: "none", totals: { shipping: null, subtotal: 10 } },
      payment: { status: "AUTHORIZED" },
      orderType: "DRY_RUN",
    });
    expect(order.code).toBe("SHIPPING_RATE_UNVERIFIED");
    expect(order.orderCreated).toBe(false);
    expect(order.shipping).toBeNull();
  });

  it("does not let a commercial checkout through while sales are closed", () => {
    const block = orderService.createOrderFromCheckout({
      checkout: { id: "chk-commercial", cartId: "c", totals: { shipping: 1, subtotal: 10, tax: 1, total: 12 } },
      payment: { status: "PAID", captured: true },
      orderType: "COMMERCIAL",
    });
    expect(block.blocked).toBe(true);
    expect(block.code).toBe("sales_disabled");
    expect(block.orderCreated).toBe(false);
  });

  it("names each later commercial gap after a verified included-shipping shape", () => {
    const transport = {
      origin: "DE",
      country: "DE",
      zone: "DE-10115",
      weightKg: 1,
      dimensions: { lengthCm: 10, widthCm: 10, heightCm: 10 },
      shippingIncluded: true,
      inclusionEvidence: "offer-test-1",
    };
    const marketplace = orderService.createOrderFromCheckout({
      checkout: { id: "chk-fee", transport, totals: { subtotal: 10, tax: 1.9, currency: "EUR" } },
      orderType: "DRY_RUN",
    });
    expect(marketplace.code).toBe("MARKETPLACE_FEE_UNVERIFIED");
    expect(marketplace.orderCreated).toBe(false);

    const paymentFee = orderService.createOrderFromCheckout({
      checkout: {
        id: "chk-payfee",
        transport,
        marketplaceFee: 1,
        totals: { subtotal: 10, tax: 1.9, currency: "EUR" },
      },
      orderType: "DRY_RUN",
    });
    expect(paymentFee.code).toBe("PAYMENT_FEE_UNVERIFIED");

    const fx = orderService.createOrderFromCheckout({
      checkout: {
        id: "chk-fx",
        transport,
        marketplaceFee: 1,
        paymentFee: 0.3,
        totals: { subtotal: 10, tax: 1.9, currency: "PLN" },
      },
      orderType: "DRY_RUN",
    });
    expect(fx.code).toBe("VAT_UNVERIFIED");
    expect(fx.reasons).toContain("FX_UNVERIFIED");
    expect(fx.reasons).toContain("SUPPLIER_COST_UNVERIFIED");
    expect(fx.reasons).toContain("STOCK_UNVERIFIED");
    expect(fx.reasons).toContain("PAYMENT_UNVERIFIED");
  });

  it("rejects crypto, CBDC, mock data, and a repeated checkout id", () => {
    const cryptoOrder = orderService.createOrderFromCheckout({
      checkout: { id: "chk-btc", totals: { currency: "BTC", subtotal: 10 } },
      payment: { currency: "BTC" },
      orderType: "DRY_RUN",
    });
    expect(cryptoOrder.code).toBe("REJECTED_CRYPTO_POLICY");
    expect(cryptoOrder.orderCreated).toBe(false);

    const cbdc = orderService.createOrderFromCheckout({
      checkout: { id: "chk-cbdc", totals: { currency: "EUR", subtotal: 10 }, assetType: "digital_euro" },
      orderType: "DRY_RUN",
    });
    expect(cbdc.code).toBe("REJECTED_CBDC_POLICY");

    const mock = orderService.createOrderFromCheckout({
      checkout: { id: "chk-mock", mock: true, totals: { currency: "EUR" } },
      orderType: "DRY_RUN",
    });
    expect(mock.code).toBe("MOCK_NOT_COMMERCIAL");

    const { db } = require("../lib/db");
    const checkoutId = `chk-dup-${Date.now()}`;
    db.prepare("INSERT INTO commerce_orders (id, checkout_id, order_type) VALUES (?, ?, ?)").run(
      `ord-dup-${Date.now()}`,
      checkoutId,
      "DRY_RUN",
    );
    const before = db.prepare("SELECT COUNT(*) n FROM commerce_orders WHERE checkout_id = ?").get(checkoutId).n;
    const duplicate = orderService.createOrderFromCheckout({
      checkout: { id: checkoutId, totals: { shipping: 4.99, subtotal: 10, tax: 1, total: 15.99, currency: "EUR" } },
      payment: { captured: true, live: true, verified: true },
      orderType: "DRY_RUN",
    });
    const after = db.prepare("SELECT COUNT(*) n FROM commerce_orders WHERE checkout_id = ?").get(checkoutId).n;
    expect(duplicate.code).toBe("DUPLICATE_ORDER");
    expect(duplicate.orderCreated).toBe(false);
    expect(after).toBe(before);

    const intent = paymentService.createPaymentIntent({ amount: 10, currency: "USDC", dryRun: true });
    expect(intent.code).toBe("REJECTED_CRYPTO_POLICY");
    expect(intent.paymentAuthorized).toBe(false);
    const refund = paymentService.refundPayment();
    expect(refund.code).toBe("REFUND_UNVERIFIED");
    expect(refund.refunded).toBe(false);
  });

  it("does not mark a return refunded or exchanged without a verified payment", () => {
    const returns = require("../lib/returnsRma.js");
    const { db } = require("../lib/db");
    const created = returns.createReturn({
      orderNumber: `ORD-${Date.now()}`,
      reason: "size",
      customerEmail: "buyer@example.com",
      refundAmount: 12,
      approved: true,
    });
    expect(created.ok).toBe(false);
    expect(created.code).toBe("RETURN_UNVERIFIED");
    expect(created.created).toBe(false);
    expect(created.stored).toBe(false);
    const seeded = db.prepare(`
      INSERT INTO rma_returns(rma_number, order_number, reason, status, refund_amount)
      VALUES(?,?,?,?,?)
    `).run(`RMA-${Date.now()}`, `ORD-${Date.now()}`, "size", "requested", null);
    const refund = returns.processRefund(seeded.lastInsertRowid, { amount: 12 });
    expect(refund.ok).toBe(false);
    expect(refund.code).toBe("REFUND_UNVERIFIED");
    expect(refund.refunded).toBe(false);
    expect(refund.supplierCredit).toBeNull();
    const row = db.prepare("SELECT status, refund_status FROM rma_returns WHERE id = ?").get(seeded.lastInsertRowid);
    expect(row.status).toBe("requested");
    expect(row.refund_status).not.toBe("succeeded");
    const exchange = returns.processExchange(seeded.lastInsertRowid);
    expect(exchange.code).toBe("EXCHANGE_NOT_LIVE");
    expect(exchange.exchangeOrderNumber).toBeNull();
    const jumped = returns.updateReturnStatus(seeded.lastInsertRowid, { status: "refunded" });
    expect(jumped.code).toBe("REFUND_UNVERIFIED");
  });

  it("does not store a demo payment, invoice, payout, or supplier acceptance", () => {
    const finance = require("../lib/paymentsFinance.js");
    const automation = require("../lib/orderAutomation.js");
    const intent = finance.createPaymentIntent({ orderNumber: "BZ-TEST", amount: 10, currency: "EUR" });
    expect(intent.code).toBe("PAYMENT_UNVERIFIED");
    expect(intent.intent).toBeNull();
    expect(finance.confirmPaymentIntent(1).captured).toBe(false);
    expect(finance.createRefund(1, { amount: 10 }).refunded).toBe(false);
    expect(finance.handlePaymentWebhook({ externalId: "pi_demo_x", status: "succeeded" }).code).toBe("PAYMENT_UNVERIFIED");
    expect(finance.createInvoice({ orderNumber: "BZ-TEST", grossAmount: 10 }).issued).toBe(false);
    expect(finance.handlePayoutWebhook({ provider: "stripe", amount: 10, status: "paid" }).paid).toBe(false);
    const webhook = automation.handlePaymentWebhook({ eventId: "evt-1", orderNumber: "BZ-TEST", status: "paid" });
    expect(webhook.code).toBe("PAYMENT_UNVERIFIED");
    expect(webhook.captured).toBe(false);
    expect(automation.recordSupplierResult({ orderNumber: "BZ-TEST", status: "accepted" }).purchased).toBe(false);
    expect(automation.queueOrderCreated("BZ-TEST").queued).toBe(false);
  });
});
